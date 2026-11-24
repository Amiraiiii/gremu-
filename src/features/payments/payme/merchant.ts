import "server-only";
import { timingSafeEqual } from "node:crypto";
import { and, between, eq, inArray, ne } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getEmailProvider, managerEmail } from "@/lib/email";
import { PAYME_ACCOUNT_FIELD, paymeKey } from "./config";

/**
 * Payme Merchant API (JSON-RPC over HTTPS POST), modelled on Paycom's official integration
 * template (github.com/PaycomUZ/paycom-integration-php-template):
 *  - every request is authenticated with `Authorization: Basic base64("Paycom:<key>")`;
 *  - amounts are tiyin and must equal the order total exactly;
 *  - one active (state 1) or performed (state 2) transaction per order;
 *  - an unperformed transaction expires after 12 hours (43 200 000 ms);
 *  - repeated calls with the same transaction id return the same result (idempotent).
 * Order payment status changes ONLY here, after these checks — never from a redirect.
 */
export const TIMEOUT_MS = 43_200_000;
const STATE = { CREATED: 1, PERFORMED: 2, CANCELLED: -1, CANCELLED_AFTER_PERFORM: -2 } as const;
const REASON_TIMEOUT = 4;

type Msg = { ru: string; uz: string; en: string };
const msg = (ru: string, uz: string, en: string): Msg => ({ ru, uz, en });

class PaymeError extends Error {
  constructor(
    public code: number,
    public text: Msg,
    public data?: string,
  ) {
    super(text.en);
  }
}

const E = {
  auth: () => new PaymeError(-32504, msg("Недостаточно привилегий", "Ruxsat yetarli emas", "Insufficient privilege")),
  parse: () => new PaymeError(-32700, msg("Ошибка разбора JSON", "JSON xatosi", "Parse error")),
  request: () => new PaymeError(-32600, msg("Неверный запрос", "Notoʻgʻri soʻrov", "Invalid JSON-RPC request")),
  method: (m: string) => new PaymeError(-32601, msg("Метод не найден", "Metod topilmadi", "Method not found"), m),
  system: () => new PaymeError(-32400, msg("Системная ошибка", "Tizim xatosi", "Internal system error")),
  amount: () => new PaymeError(-31001, msg("Неверная сумма", "Notoʻgʻri summa", "Incorrect amount"), "amount"),
  notFound: () => new PaymeError(-31003, msg("Транзакция не найдена", "Tranzaksiya topilmadi", "Transaction not found")),
  cannotCancel: () =>
    new PaymeError(-31007, msg("Заказ выполнен, отмена невозможна", "Buyurtma bajarilgan, bekor qilib boʻlmaydi", "Order is completed, cannot cancel")),
  cannotPerform: (en = "Could not perform this operation") =>
    new PaymeError(-31008, msg("Невозможно выполнить операцию", "Amalni bajarib boʻlmaydi", en)),
  order: () => new PaymeError(-31050, msg("Заказ не найден", "Buyurtma topilmadi", "Order not found"), PAYME_ACCOUNT_FIELD),
  orderBusy: () =>
    new PaymeError(
      -31050,
      msg("Для заказа уже есть другая транзакция", "Buyurtma uchun boshqa tranzaksiya mavjud", "There is another active or completed transaction for this order"),
      PAYME_ACCOUNT_FIELD,
    ),
  tooOld: () => new PaymeError(-31050, msg("Истекло время создания транзакции", "Tranzaksiya yaratish vaqti oʻtgan", "Transaction create time expired"), "time"),
  period: (field: string) => new PaymeError(-31050, msg("Неверный период", "Notoʻgʻri davr", "Incorrect period"), field),
};

// ---------- helpers
function authorized(header: string | null): boolean {
  const key = paymeKey();
  if (!key || !header) return false;
  const m = /^\s*Basic\s+(\S+)\s*$/i.exec(header);
  if (!m) return false;
  const given = Buffer.from(Buffer.from(m[1], "base64").toString("utf8"));
  const expected = Buffer.from(`Paycom:${key}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
const str = (v: unknown) => (typeof v === "string" ? v : "");

type Tx = typeof schema.paymentTransactions.$inferSelect;
type Order = typeof schema.orders.$inferSelect;
type Db = Awaited<ReturnType<typeof getDb>>;
type Exec = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

const expired = (tx: Tx, now: number) => tx.state === STATE.CREATED && now - tx.createTime > TIMEOUT_MS;

async function findTx(db: Exec, id: string) {
  const [tx] = await db
    .select()
    .from(schema.paymentTransactions)
    .where(and(eq(schema.paymentTransactions.provider, "payme"), eq(schema.paymentTransactions.providerTxId, id)))
    .limit(1);
  return tx ?? null;
}

async function setPaymentStatus(db: Exec, order: Order, status: string, note: string) {
  await db.update(schema.orders).set({ paymentStatus: status, updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
  await db.insert(schema.orderStatusHistory).values({ orderId: order.id, status: order.status, note, actor: "payme" });
}

/** Cancel an unperformed transaction (timeout, or Payme's CancelTransaction on state 1). */
async function cancelCreated(db: Exec, tx: Tx, reason: number, now: number) {
  const [row] = await db
    .update(schema.paymentTransactions)
    .set({ state: STATE.CANCELLED, reason, cancelTime: now, updatedAt: new Date() })
    .where(and(eq(schema.paymentTransactions.id, tx.id), eq(schema.paymentTransactions.state, STATE.CREATED)))
    .returning();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, tx.orderId) });
  // Reasons 1–3 are processing failures; timeout (4) and the rest count as a cancelled attempt.
  if (row && order && order.paymentStatus === "pending") {
    await setPaymentStatus(db, order, reason >= 1 && reason <= 3 ? "failed" : "cancelled", `Payme: transaction cancelled (reason ${reason})`);
  }
  return row ?? (await findTx(db, tx.providerTxId))!;
}

/** Shared order checks for CheckPerformTransaction and CreateTransaction. */
async function payableOrder(db: Exec, params: Record<string, unknown>, lock: boolean): Promise<Order> {
  const account = (params.account ?? {}) as Record<string, unknown>;
  const number = str(account[PAYME_ACCOUNT_FIELD]).trim();
  const amount = num(params.amount);
  if (!Number.isInteger(amount) || amount <= 0) throw E.amount();
  if (!/^GR-\d{6}-[A-Z0-9]{4}$/.test(number)) throw E.order();

  const q = db.select().from(schema.orders).where(eq(schema.orders.orderNumber, number)).limit(1);
  const [order] = lock ? await q.for("update") : await q;
  if (!order) throw E.order();
  if (amount !== order.totalMinor) throw E.amount();
  if (order.paymentMethod !== "payme" || order.status === "cancelled" || ["paid", "refunded"].includes(order.paymentStatus)) {
    throw E.cannotPerform("Order state is invalid");
  }
  return order;
}

const txView = (tx: Tx) => ({ transaction: tx.id, state: tx.state });

// ---------- methods
async function checkPerform(params: Record<string, unknown>) {
  const db = await getDb();
  const order = await payableOrder(db, params, false);
  const now = Date.now();
  const active = await db
    .select()
    .from(schema.paymentTransactions)
    .where(and(eq(schema.paymentTransactions.orderId, order.id), inArray(schema.paymentTransactions.state, [STATE.CREATED, STATE.PERFORMED])));
  if (active.some((t) => !expired(t, now))) throw E.cannotPerform("There is another active or completed transaction for this order");
  return { allow: true };
}

async function create(params: Record<string, unknown>) {
  const id = str(params.id);
  const time = num(params.time);
  if (!id || id.length > 64 || !Number.isFinite(time)) throw E.request();
  const db = await getDb();
  const now = Date.now();

  const outcome = await db.transaction(async (tx) => {
    const order = await payableOrder(tx, params, true); // row lock: no two transactions race for one order

    const existing = await findTx(tx, id);
    if (existing) {
      if (existing.state !== STATE.CREATED) throw E.cannotPerform("Transaction found, but is not active");
      if (expired(existing, now)) return { expired: existing };
      return { ok: existing };
    }

    const others = await tx
      .select()
      .from(schema.paymentTransactions)
      .where(
        and(
          eq(schema.paymentTransactions.orderId, order.id),
          inArray(schema.paymentTransactions.state, [STATE.CREATED, STATE.PERFORMED]),
          ne(schema.paymentTransactions.providerTxId, id),
        ),
      );
    for (const o of others) {
      if (expired(o, now)) await cancelCreated(tx, o, REASON_TIMEOUT, now);
      else throw E.orderBusy();
    }
    if (now - time >= TIMEOUT_MS) throw E.tooOld();

    const [row] = await tx
      .insert(schema.paymentTransactions)
      .values({ provider: "payme", providerTxId: id, orderId: order.id, amountMinor: order.totalMinor, state: STATE.CREATED, providerTime: time, createTime: now })
      .returning();
    if (order.paymentStatus !== "pending") await setPaymentStatus(tx, order, "pending", "Payme: payment started");
    return { ok: row };
  });

  if ("expired" in outcome && outcome.expired) {
    await cancelCreated(db, outcome.expired, REASON_TIMEOUT, now);
    throw E.cannotPerform("Transaction is expired");
  }
  const row = outcome.ok!;
  return { create_time: row.createTime, ...txView(row) };
}

async function perform(params: Record<string, unknown>) {
  const db = await getDb();
  const found = await findTx(db, str(params.id));
  if (!found) throw E.notFound();
  if (found.state === STATE.PERFORMED) return { perform_time: found.performTime, ...txView(found) };
  if (found.state !== STATE.CREATED) throw E.cannotPerform();
  const now = Date.now();
  if (expired(found, now)) {
    await cancelCreated(db, found, REASON_TIMEOUT, now);
    throw E.cannotPerform("Transaction is expired");
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.paymentTransactions)
      .set({ state: STATE.PERFORMED, performTime: now, updatedAt: new Date() })
      .where(and(eq(schema.paymentTransactions.id, found.id), eq(schema.paymentTransactions.state, STATE.CREATED)))
      .returning();
    if (!row) return { row: (await findTx(tx, found.providerTxId))!, order: null }; // a concurrent call won
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, row.orderId)).for("update");
    await setPaymentStatus(tx, order, "paid", "Payme: payment confirmed");
    await tx.insert(schema.auditLog).values({
      actor: "payme",
      action: "payment.paid",
      entityType: "order",
      entityId: order.orderNumber,
      metadata: JSON.stringify({ transaction: row.id, amountMinor: row.amountMinor }),
    });
    return { row, order };
  });

  if (result.row.state !== STATE.PERFORMED) throw E.cannotPerform();
  if (result.order) void notifyPaid(result.order.orderNumber, result.row.amountMinor);
  return { perform_time: result.row.performTime, ...txView(result.row) };
}

async function cancel(params: Record<string, unknown>) {
  const db = await getDb();
  const found = await findTx(db, str(params.id));
  if (!found) throw E.notFound();
  const reason = Number.isInteger(num(params.reason)) ? num(params.reason) : 10;
  const now = Date.now();
  const view = (t: Tx) => ({ cancel_time: t.cancelTime, ...txView(t) });

  if (found.state === STATE.CANCELLED || found.state === STATE.CANCELLED_AFTER_PERFORM) return view(found);
  if (found.state === STATE.CREATED) return view(await cancelCreated(db, found, reason, now));

  // Performed → refund, unless the goods were already handed over.
  const row = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(schema.orders).where(eq(schema.orders.id, found.orderId)).for("update");
    if (["shipped", "completed"].includes(order.status)) throw E.cannotCancel();
    const [updated] = await tx
      .update(schema.paymentTransactions)
      .set({ state: STATE.CANCELLED_AFTER_PERFORM, reason, cancelTime: now, updatedAt: new Date() })
      .where(and(eq(schema.paymentTransactions.id, found.id), eq(schema.paymentTransactions.state, STATE.PERFORMED)))
      .returning();
    if (!updated) return (await findTx(tx, found.providerTxId))!;
    await setPaymentStatus(tx, order, "refunded", `Payme: payment refunded (reason ${reason})`);
    await tx.insert(schema.auditLog).values({
      actor: "payme",
      action: "payment.refunded",
      entityType: "order",
      entityId: order.orderNumber,
      metadata: JSON.stringify({ transaction: updated.id, reason }),
    });
    return updated;
  });
  return view(row);
}

async function check(params: Record<string, unknown>) {
  const db = await getDb();
  const t = await findTx(db, str(params.id));
  if (!t) throw E.notFound();
  return { create_time: t.createTime, perform_time: t.performTime, cancel_time: t.cancelTime, transaction: t.id, state: t.state, reason: t.reason };
}

async function statement(params: Record<string, unknown>) {
  const from = num(params.from);
  const to = num(params.to);
  if (!Number.isFinite(from)) throw E.period("from");
  if (!Number.isFinite(to)) throw E.period("to");
  if (from >= to) throw E.period("from");
  const db = await getDb();
  const rows = await db
    .select({ t: schema.paymentTransactions, number: schema.orders.orderNumber })
    .from(schema.paymentTransactions)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.paymentTransactions.orderId))
    .where(and(eq(schema.paymentTransactions.provider, "payme"), between(schema.paymentTransactions.createTime, from, to)))
    .orderBy(schema.paymentTransactions.createTime);
  return {
    transactions: rows.map(({ t, number }) => ({
      id: t.providerTxId,
      time: t.providerTime,
      amount: t.amountMinor,
      account: { [PAYME_ACCOUNT_FIELD]: number },
      create_time: t.createTime,
      perform_time: t.performTime,
      cancel_time: t.cancelTime,
      transaction: t.id,
      state: t.state,
      reason: t.reason,
    })),
  };
}

async function notifyPaid(number: string, amountMinor: number) {
  const to = managerEmail();
  if (!to) return console.info(`[payme] ${number} paid; MANAGER_EMAIL is not set, no notification attempted`);
  try {
    await getEmailProvider().send({
      to,
      subject: `gremu: заказ ${number} оплачен через Payme`,
      text: `Заказ ${number} оплачен через Payme.\nСумма: ${Math.round(amountMinor / 100)} сум\nПодробности — в админке.`,
    });
  } catch (e) {
    console.error("[payme] paid email failed", number, (e as Error).message);
  }
}

// ---------- entry point
export type RpcResponse = { id: unknown; result?: unknown; error?: { code: number; message: Msg; data?: string } };

export async function handlePaymeRequest(rawBody: string, authHeader: string | null): Promise<RpcResponse> {
  let id: unknown = null;
  try {
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw E.parse();
    }
    if (!body || typeof body !== "object") throw E.request();
    const req = body as { id?: unknown; method?: unknown; params?: unknown };
    id = req.id ?? null;
    if (!authorized(authHeader)) throw E.auth();
    if (typeof req.method !== "string") throw E.request();
    const params = (req.params && typeof req.params === "object" ? req.params : {}) as Record<string, unknown>;

    switch (req.method) {
      case "CheckPerformTransaction":
        return { id, result: await checkPerform(params) };
      case "CreateTransaction":
        return { id, result: await create(params) };
      case "PerformTransaction":
        return { id, result: await perform(params) };
      case "CancelTransaction":
        return { id, result: await cancel(params) };
      case "CheckTransaction":
        return { id, result: await check(params) };
      case "GetStatement":
        return { id, result: await statement(params) };
      // ChangePassword is not supported: the key lives in PAYME_SECRET_KEY, changed by the owner on the server.
      default:
        throw E.method(req.method);
    }
  } catch (e) {
    if (e instanceof PaymeError) return { id, error: { code: e.code, message: e.text, ...(e.data ? { data: e.data } : {}) } };
    console.error("[payme] system error", (e as Error).message);
    const s = E.system();
    return { id, error: { code: s.code, message: s.text } };
  }
}
