import "server-only";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const ORDER_STATUSES = ["new", "confirmed", "processing", "ready", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Allowed moves. Terminal states (completed, cancelled) cannot change. */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready", "shipped", "cancelled"],
  ready: ["completed", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

export const isStatus = (s: string): s is OrderStatus => (ORDER_STATUSES as readonly string[]).includes(s);

const PAGE = 20;

export async function listOrders(opts: { status?: string; q?: string; page?: number }) {
  const db = await getDb();
  const where: SQL[] = [];
  if (opts.status && isStatus(opts.status)) where.push(eq(schema.orders.status, opts.status));
  const q = opts.q?.trim().slice(0, 40);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    where.push(or(ilike(schema.orders.orderNumber, like), ilike(schema.orders.customerPhone, like), ilike(schema.orders.customerName, like))!);
  }
  const cond = where.length ? and(...where) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(schema.orders).where(cond);
  const pageCount = Math.max(1, Math.ceil(total / PAGE));
  const page = Math.min(Math.max(1, opts.page ?? 1), pageCount);
  const rows = await db
    .select()
    .from(schema.orders)
    .where(cond)
    .orderBy(desc(schema.orders.createdAt))
    .limit(PAGE)
    .offset((page - 1) * PAGE);
  const byStatus = await db.select({ status: schema.orders.status, n: count() }).from(schema.orders).groupBy(schema.orders.status);
  return { rows, total, page, pageCount, byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number> };
}

export async function getOrderAdmin(number: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, number) });
  if (!order) return null;
  const [items, history, audit] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.select().from(schema.orderStatusHistory).where(eq(schema.orderStatusHistory.orderId, order.id)).orderBy(asc(schema.orderStatusHistory.createdAt)),
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entityType, "order"), eq(schema.auditLog.entityId, order.id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(50),
  ]);
  return { order, items, history, audit };
}

export type StatusChangeResult = { ok: true } | { ok: false; error: "not_found" | "not_allowed" | "stale" };

/**
 * Change status inside a transaction. `expected` is the status the manager saw: if someone
 * else changed it meanwhile, the update is refused instead of silently overwriting.
 */
export async function changeOrderStatus(input: { number: string; to: OrderStatus; expected: string; note?: string; actor: string }): Promise<StatusChangeResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const order = await tx.query.orders.findFirst({ where: eq(schema.orders.orderNumber, input.number) });
    if (!order) return { ok: false, error: "not_found" } as const;
    if (order.status !== input.expected) return { ok: false, error: "stale" } as const;
    const from = order.status as OrderStatus;
    if (!TRANSITIONS[from]?.includes(input.to)) return { ok: false, error: "not_allowed" } as const;

    const updated = await tx
      .update(schema.orders)
      .set({ status: input.to, updatedAt: new Date() })
      .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, from)))
      .returning({ id: schema.orders.id });
    if (!updated.length) return { ok: false, error: "stale" } as const;

    const note = input.note?.trim().slice(0, 500) || null;
    await tx.insert(schema.orderStatusHistory).values({ orderId: order.id, status: input.to, note, actor: input.actor });
    await tx.insert(schema.auditLog).values({
      actor: input.actor,
      action: "order.status_changed",
      entityType: "order",
      entityId: order.id,
      metadata: JSON.stringify({ number: order.orderNumber, from, to: input.to }),
    });
    return { ok: true } as const;
  });
}

export async function audit(actor: string, action: string, entityType: string, entityId: string | null, metadata?: Record<string, unknown>) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ actor, action, entityType, entityId, metadata: metadata ? JSON.stringify(metadata) : null });
}
