import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { buildQuote } from "@/features/cart/quote";
import { createOrder, getOrderForGuest, type CheckoutInput } from "@/features/orders/service";
import { changeOrderStatus, getOrderAdmin } from "@/features/orders/admin";

const base = (items: { id: string; qty: number }[], expectedTotalMinor: number): CheckoutInput => ({
  locale: "ru",
  name: "Test Buyer",
  phone: "+998901112233",
  email: "",
  region: "tashkent_city",
  city: "Ташкент",
  address: "Тестовая 1",
  deliveryMethod: "agree_with_manager",
  paymentMethod: "after_confirmation",
  note: "",
  consent: true,
  items,
  expectedTotalMinor,
});

describe("cart quote — prices and stock come from the server", () => {
  it("prices lines from the catalog, ignoring anything the client claims", async () => {
    const q = await buildQuote({ locale: "ru", items: [{ id: "demo-001", qty: 2 }] });
    expect(q.lines[0].unitPriceMinor).toBe(6_500_000);
    expect(q.lines[0].lineTotalMinor).toBe(13_000_000);
    expect(q.subtotalMinor).toBe(13_000_000);
  });

  it("merges duplicate ids, clamps to stock and reports unknown ids", async () => {
    const q = await buildQuote({
      locale: "ru",
      items: [
        { id: "demo-003", qty: 2 },
        { id: "demo-003", qty: 2 }, // stock is 3
        { id: "does-not-exist", qty: 1 },
      ],
    });
    const line = q.lines.find((l) => l.id === "demo-003")!;
    expect(line.qty).toBe(3);
    expect(line.adjustedFrom).toBe(4);
    expect(q.missing).toEqual(["does-not-exist"]);
  });

  it("out-of-stock items are not purchasable and cost nothing", async () => {
    const q = await buildQuote({ locale: "ru", items: [{ id: "demo-008", qty: 1 }] });
    expect(q.lines[0].purchasable).toBe(false);
    expect(q.subtotalMinor).toBe(0);
  });
});

describe("order creation", () => {
  it("creates an order with a number, history and guest token; repeats are idempotent", async () => {
    const key = randomUUID();
    const first = await createOrder(base([{ id: "demo-001", qty: 1 }], 6_500_000), key);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.orderNumber).toMatch(/^GR-\d{6}-[A-Z0-9]{4}$/);

    const again = await createOrder(base([{ id: "demo-001", qty: 1 }], 6_500_000), key);
    expect(again).toMatchObject({ ok: true, orderNumber: first.orderNumber, duplicate: true });

    const view = await getOrderForGuest(first.orderNumber, first.token);
    expect(view?.order.totalMinor).toBe(6_500_000);
    expect(view?.history.map((h) => h.status)).toEqual(["new"]);
    expect(await getOrderForGuest(first.orderNumber, "wrong-token")).toBeNull();
  });

  it("refuses when the total the customer saw differs from the server total", async () => {
    const res = await createOrder(base([{ id: "demo-001", qty: 1 }], 100), randomUUID());
    expect(res).toMatchObject({ ok: false, reason: "changed" });
  });

  it("links the order to the signed-in user id passed by the server", async () => {
    const userId = randomUUID();
    const res = await createOrder(base([{ id: "demo-001", qty: 1 }], 6_500_000), randomUUID(), userId);
    if (!res.ok) throw new Error("order failed");
    expect((await getOrderAdmin(res.orderNumber))?.order.userId).toBe(userId);
  });
});

describe("order status changes", () => {
  it("follows the transition table and rejects stale updates", async () => {
    const res = await createOrder(base([{ id: "demo-001", qty: 1 }], 6_500_000), randomUUID());
    if (!res.ok) throw new Error("order failed");
    const n = res.orderNumber;
    expect(await changeOrderStatus({ number: n, to: "shipped", expected: "new", actor: "t" })).toEqual({ ok: false, error: "not_allowed" });
    expect(await changeOrderStatus({ number: n, to: "confirmed", expected: "new", actor: "t" })).toEqual({ ok: true });
    expect(await changeOrderStatus({ number: n, to: "processing", expected: "new", actor: "t" })).toEqual({ ok: false, error: "stale" });
    expect((await getOrderAdmin(n))?.history.map((h) => h.status)).toEqual(["new", "confirmed"]);
  });
});
