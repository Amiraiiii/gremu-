"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkCredentials, endSession, getAdminSession, startSession, staffFor } from "@/lib/auth/admin";
import { endUserSession } from "@/lib/auth/user";
import { rateLimit } from "@/lib/rate-limit";
import { audit, changeOrderStatus, isStatus } from "@/features/orders/admin";
import { isInquiryStatus, resendInquiryEmail, retryFailedEmails, setInquiryStatus } from "@/features/inquiries/service";

export type LoginState = { error?: "invalid" | "rate_limited" | "not_configured" };

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const locale = String(form.get("locale")) === "uz" ? "uz" : "ru";
  if (!process.env.ADMIN_PASSWORD_HASH) return { error: "not_configured" };
  const limit = rateLimit(`admin-login:${await ip()}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { error: "rate_limited" };

  const username = String(form.get("username") ?? "").trim().slice(0, 64);
  const password = String(form.get("password") ?? "").slice(0, 200);
  if (!username || !password || !checkCredentials(username, password)) {
    await audit(username || "unknown", "admin.login_failed", "session", null).catch(() => undefined);
    return { error: "invalid" };
  }
  await startSession(username);
  await audit(username, "admin.login", "session", null).catch(() => undefined);
  redirect(`/${locale}/admin`);
}

export async function logoutAction(form: FormData) {
  const locale = String(form.get("locale")) === "uz" ? "uz" : "ru";
  const s = await getAdminSession();
  await endSession();
  if (s?.via === "google") await endUserSession();
  redirect(`/${locale}/admin/login`);
}

const statusSchema = z.object({
  locale: z.enum(["ru", "uz"]),
  number: z.string().regex(/^GR-\d{6}-[A-Z0-9]{4}$/),
  to: z.string().refine(isStatus),
  expected: z.string().max(20),
  note: z.string().max(500).optional(),
});

export type StatusState = { ok?: boolean; error?: "invalid" | "not_found" | "not_allowed" | "stale" | "unauthorized" };

export async function changeStatusAction(_prev: StatusState, form: FormData): Promise<StatusState> {
  // Authorization is checked again here: hiding the button is not enough.
  const session = await getAdminSession();
  if (!session) return { error: "unauthorized" };
  const parsed = statusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "invalid" };
  const { locale, number, to, expected, note } = parsed.data;
  const res = await changeOrderStatus({ number, to: to as never, expected, note, actor: session.sub });
  if (!res.ok) return { error: res.error };
  revalidatePath(`/${locale}/admin/orders/${number}`);
  revalidatePath(`/${locale}/admin`);
  return { ok: true };
}

// ---------- inquiries (each action re-checks the admin session on the server)
const inquiryId = z.string().regex(/^INQ-[A-Z0-9]+-[A-Z0-9]{2,6}$/);

export async function inquiryStatusAction(form: FormData) {
  const session = await getAdminSession();
  if (!session) return;
  const id = inquiryId.safeParse(form.get("id"));
  const to = String(form.get("to") ?? "");
  if (!id.success || !isInquiryStatus(to)) return;
  await setInquiryStatus(id.data, to, session.sub);
  revalidatePath(`/${form.get("locale") === "uz" ? "uz" : "ru"}/admin/inquiries`);
}

export async function resendInquiryAction(form: FormData) {
  const session = await getAdminSession();
  if (!session) return;
  const id = inquiryId.safeParse(form.get("id"));
  if (!id.success) return;
  const status = await resendInquiryEmail(id.data);
  await audit(session.sub, "inquiry.email_resend", "inquiry", id.data, { result: status }).catch(() => undefined);
  revalidatePath(`/${form.get("locale") === "uz" ? "uz" : "ru"}/admin/inquiries`);
}

export async function retryAllInquiriesAction(form: FormData) {
  const session = await staffFor("staff");
  if (!session) return;
  const res = await retryFailedEmails();
  await audit(session.sub, "inquiry.email_retry_all", "inquiry", null, res).catch(() => undefined);
  revalidatePath(`/${form.get("locale") === "uz" ? "uz" : "ru"}/admin/inquiries`);
}
