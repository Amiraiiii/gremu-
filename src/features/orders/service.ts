import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { DELIVERY_METHODS, PAYMENT_METHODS, REGIONS } from "@/config/shop";
import { buildQuote, type Quote } from "@/features/cart/quote";
import { catalog } from "@/features/catalog/repository";
import { getDb, schema } from "@/lib/db";
import { getEmailProvider, managerEmail } from "@/lib/email";

const deliveryCodes = DELIVERY_METHODS.map((d) => d.code) as [string, ...string[]];
const paymentCodes = PAYMENT_METHODS.map((p) => p.code) as [string, ...string[]];
const regionCodes = REGIONS.map((r) => r.code) as [string, ...string[]];

export const checkoutSchema = z
  .object({
    locale: z.enum(["ru", "uz"]),
    name: z.string().trim().min(2, "name").max(80, "name"),
    phone: z.string().trim().regex(/^\+?[0-9\s\-()]{7,24}$/, "phone"),
    email: z.string().trim().email("email").max(120).optional().or(z.literal("")),
    region: z.enum(regionCodes, { message: "region" }),
    city: z.string().trim().min(2, "city").max(80, "city"),
    address: z.string().trim().max(200, "address").optional().or(z.literal("")),
    deliveryMethod: z.enum(deliveryCodes),
    paymentMethod: z.enum(paymentCodes),
    note: z.string().trim().max(1000, "note").optional().or(z.literal("")),
    consent: z.literal(true, { message: "consent" }),
    items: z.array(z.object({ id: z.string().min(1).max(64), qty: z.number().int().min(1).max(99) })).min(1, "empty").max(50),
    /** The total the customer saw and confirmed — the order is rejected if the server total differs. */
    expectedTotalMinor: z.number().int().nonnegative(),
  })
  .superRefine((v, ctx) => {
    const method = DELIVERY_METHODS.find((d) => d.code === v.deliveryMethod);
    if (method?.needsAddress && !v.address) ctx.addIssue({ code: "custom", path: ["address"], message: "address" });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type CreateOrderResult =
  | { ok: true; orderNumber: string; token: string; duplicate?: boolean }
  | { ok: false; reason: "changed"; quote: Quote }
  | { ok: false; reason: "empty" };

// ---------- guest access token: HMAC of the order id, nothing secret stored in the DB
function secret(): string {
  const s = process.env.APP_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set in production");
  return "gremu-dev-only-secret";
}
export function guestToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`order:${orderId}`).digest("base64url").slice(0, 32);
}
export function tokenMatches(orderId: string, token: string): boolean {
  const a = Buffer.from(guestToken(orderId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- order number: GR-YYMMDD-XXXX (Tashkent date + random base32)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function orderNumber(now: Date): string {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(now)
    .replace(/-/g, "");
  const rnd = [...randomBytes(4)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `GR-${d}-${rnd}`;
}

/** `userId` comes from the server session only (never from the request body); null for guest checkout. */
export async function createOrder(input: CheckoutInput, idempotencyKey: string | null, userId: string | null = null): Promise<CreateOrderResult> {
  const db = await getDb();

  if (idempotencyKey) {
    const existing = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, idempotencyKey) });
    if (existing) return { ok: true, orderNumber: existing.orderNumber, token: guestToken(existing.id), duplicate: true };
  }

  // Re-price everything on the server.
  const quote = await buildQuote({ locale: input.locale, items: input.items });
  const sellable = quote.lines.filter((l) => l.purchasable && l.qty > 0);
  if (!sellable.length) return { ok: false, reason: "empty" };
  const changed =
    quote.missing.length > 0 ||
    quote.lines.some((l) => !l.purchasable || l.adjustedFrom) ||
    quote.subtotalMinor !== input.expectedTotalMinor;
  if (changed) return { ok: false, reason: "changed", quote };

  const delivery = DELIVERY_METHODS.find((d) => d.code === input.deliveryMethod)!;
  const deliveryFee = delivery.feeMinor ?? 0;
  const products = new Map((await catalog.getByIds(sellable.map((l) => l.id))).map((p) => [p.id, p]));

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = orderNumber(new Date());
    try {
      const order = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.orders)
          .values({
            orderNumber: number,
            userId,
            idempotencyKey,
            customerName: input.name,
            customerPhone: input.phone,
            customerEmail: input.email || null,
            region: input.region,
            city: input.city,
            addressLine: input.address || null,
            deliveryMethod: input.deliveryMethod,
            paymentMethod: input.paymentMethod,
            customerNote: input.note || null,
            subtotalMinor: quote.subtotalMinor,
            deliveryFeeMinor: deliveryFee,
            totalMinor: quote.subtotalMinor + deliveryFee,
            locale: input.locale,
          })
          .returning();
        await tx.insert(schema.orderItems).values(
          sellable.map((l) => ({
            orderId: row.id,
            productId: l.id,
            productTitleSnapshot: l.title,
            skuSnapshot: l.sku,
            oemSnapshot: products.get(l.id)?.oemNumber ?? null,
            unitPriceMinor: l.unitPriceMinor,
            quantity: l.qty,
            lineTotalMinor: l.lineTotalMinor,
          })),
        );
        await tx.insert(schema.orderStatusHistory).values({ orderId: row.id, status: "new", actor: "customer" });
        return row;
      });

      void notifyManager(order.orderNumber, input, quote.subtotalMinor + deliveryFee);
      return { ok: true, orderNumber: order.orderNumber, token: guestToken(order.id) };
    } catch (e) {
      const msg = String((e as Error).message);
      // Same idempotency key raced in from a double click: return that order.
      if (idempotencyKey && msg.includes("idempotency")) {
        const existing = await db.query.orders.findFirst({ where: eq(schema.orders.idempotencyKey, idempotencyKey) });
        if (existing) return { ok: true, orderNumber: existing.orderNumber, token: guestToken(existing.id), duplicate: true };
      }
      if (msg.includes("order_number")) continue; // number collision, try another
      throw e;
    }
  }
  throw new Error("Could not allocate an order number");
}

async function notifyManager(number: string, input: CheckoutInput, totalMinor: number) {
  const to = managerEmail();
  if (!to) {
    console.info(`[orders] ${number} created; MANAGER_EMAIL is not set, no notification attempted`);
    return;
  }
  try {
    await getEmailProvider().send({
      to,
      subject: `gremu: новый заказ ${number}`,
      text: `Заказ ${number}\nКлиент: ${input.name}, ${input.phone}\nСумма: ${Math.round(totalMinor / 100)} сум\nПодробности — в админке.`,
    });
  } catch (e) {
    console.error("[orders] manager email failed", number, (e as Error).message);
  }
}

export async function getOrderForGuest(number: string, token: string) {
  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, number) });
  if (!order || !token || !tokenMatches(order.id, token)) return null;
  const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id));
  const history = await db
    .select()
    .from(schema.orderStatusHistory)
    .where(eq(schema.orderStatusHistory.orderId, order.id))
    .orderBy(asc(schema.orderStatusHistory.createdAt));
  return { order, items, history };
}
