import "server-only";
import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEmailProvider, managerEmail } from "@/lib/email";
import { INQUIRY_STATUSES, vehicleLine, type Inquiry, type InquiryInput } from "./schema";
import { ensureInquiriesReady } from "./store";

type Row = typeof schema.inquiries.$inferSelect;
export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];
export const isInquiryStatus = (s: string): s is InquiryStatus => (INQUIRY_STATUSES as readonly string[]).includes(s);

const SOURCE_LABEL: Record<string, string> = { contact_form: "форма связи", fitment_request: "подбор детали", ai_handoff: "AI-помощник" };
const MAX_ATTEMPTS = 5;

function newId(now: number) {
  return `INQ-${now.toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Save an inquiry, then notify the manager. Saving comes first: a mail outage never loses a
 * request — its email status stays "failed" and the manager can resend it from the admin area.
 * Used by the contact form, the "help me find a part" form and the AI handoff.
 */
export async function submitInquiry(
  v: Omit<InquiryInput, "consent" | "website"> & { userId?: string | null },
  source: Inquiry["source"],
): Promise<{ id: string; notified: boolean }> {
  await ensureInquiriesReady();
  const db = await getDb();
  const now = Date.now();
  const [row] = await db
    .insert(schema.inquiries)
    .values({
      id: newId(now),
      source,
      topic: v.topic,
      name: v.name,
      phone: v.phone || null,
      email: v.email || null,
      message: v.message,
      sku: v.sku || null,
      vehicle: vehicleLine(v),
      locale: v.locale,
      userId: v.userId ?? null,
      emailStatus: managerEmail() ? "pending" : "not_configured",
    })
    .returning(); // throws → caller answers 500, nothing was promised

  const status = await deliver(row);
  return { id: row.id, notified: status === "sent" };
}

/** One delivery attempt; the result (and any error) is recorded on the row. */
async function deliver(row: Row): Promise<Row["emailStatus"]> {
  const db = await getDb();
  const to = managerEmail();
  if (!to) {
    console.info(`[inquiries] ${row.id} saved; MANAGER_EMAIL is not set, no notification attempted`);
    await db.update(schema.inquiries).set({ emailStatus: "not_configured" }).where(eq(schema.inquiries.id, row.id));
    return "not_configured";
  }
  try {
    const res = await getEmailProvider().send({
      to,
      subject: `gremu: ${row.source === "ai_handoff" ? "вопрос из AI-помощника" : row.topic === "fitment" ? "подбор детали" : "новое обращение"} ${row.id}`,
      replyTo: row.email ?? undefined,
      text: [
        `Обращение ${row.id} — ${SOURCE_LABEL[row.source] ?? row.source}, тема: ${row.topic}`,
        `Имя: ${row.name}`,
        `Телефон: ${row.phone ?? "—"}`,
        `Email: ${row.email ?? "—"}`,
        row.vehicle ? `Автомобиль: ${row.vehicle}` : "",
        row.sku ? `Артикул: ${row.sku}` : "",
        "",
        row.message,
        "",
        "Статус обращения меняется в админке → Обращения.",
      ]
        .join("\n")
        .replace(/\n{3,}/g, "\n\n"),
    });
    await db
      .update(schema.inquiries)
      .set({ emailStatus: res.status, emailAttempts: row.emailAttempts + 1, emailError: null, updatedAt: new Date() })
      .where(eq(schema.inquiries.id, row.id));
    return res.status;
  } catch (e) {
    const msg = (e as Error).message.slice(0, 300);
    console.error("[inquiries] email failed", row.id, msg);
    await db
      .update(schema.inquiries)
      .set({ emailStatus: "failed", emailAttempts: row.emailAttempts + 1, emailError: msg, updatedAt: new Date() })
      .where(eq(schema.inquiries.id, row.id));
    return "failed";
  }
}

/** Resend one inquiry's email (admin action). */
export async function resendInquiryEmail(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.inquiries).where(eq(schema.inquiries.id, id)).limit(1);
  if (!row) return null;
  return deliver(row);
}

/** Retry every failed/pending email that has attempts left. Returns how many were sent. */
export async function retryFailedEmails(limit = 20) {
  await ensureInquiriesReady();
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.inquiries)
    .where(inArray(schema.inquiries.emailStatus, ["failed", "pending", "not_configured"]))
    .orderBy(schema.inquiries.createdAt)
    .limit(limit);
  let sent = 0;
  for (const r of rows) {
    if (r.emailAttempts >= MAX_ATTEMPTS) continue;
    if ((await deliver(r)) === "sent") sent++;
  }
  return { tried: rows.length, sent };
}

// ---------- admin queries
export async function listInquiries(opts: { status?: string; q?: string; page?: number }) {
  await ensureInquiriesReady();
  const db = await getDb();
  const pageSize = 25;
  const page = Math.max(1, opts.page ?? 1);
  const where: SQL[] = [];
  if (opts.status && isInquiryStatus(opts.status)) where.push(eq(schema.inquiries.status, opts.status));
  const q = opts.q?.trim().slice(0, 60);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      or(ilike(schema.inquiries.id, like), ilike(schema.inquiries.name, like), ilike(schema.inquiries.phone, like), ilike(schema.inquiries.email, like), ilike(schema.inquiries.sku, like))!,
    );
  }
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }], byStatusRows, [{ failed }]] = await Promise.all([
    db.select().from(schema.inquiries).where(cond).orderBy(desc(schema.inquiries.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(schema.inquiries).where(cond),
    db.select({ status: schema.inquiries.status, n: count() }).from(schema.inquiries).groupBy(schema.inquiries.status),
    db.select({ failed: count() }).from(schema.inquiries).where(eq(schema.inquiries.emailStatus, "failed")),
  ]);
  const byStatus = Object.fromEntries(byStatusRows.map((r) => [r.status, r.n])) as Record<string, number>;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)), byStatus, failedEmails: failed };
}

export async function setInquiryStatus(id: string, to: InquiryStatus, actor: string): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(schema.inquiries).where(eq(schema.inquiries.id, id)).for("update");
    if (!row) return false;
    if (row.status === to) return true;
    await tx.update(schema.inquiries).set({ status: to, updatedAt: new Date() }).where(eq(schema.inquiries.id, id));
    await tx.insert(schema.auditLog).values({
      actor,
      action: "inquiry.status",
      entityType: "inquiry",
      entityId: id,
      metadata: JSON.stringify({ from: row.status, to }),
    });
    return true;
  });
}
