import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { handlePaymeRequest } from "@/features/payments/payme/merchant";
import { createOrder } from "@/features/orders/service";
import { changeOrderStatus, getOrderAdmin } from "@/features/orders/admin";

const KEY = "test-payme-key";
const auth = "Basic " + Buffer.from(`Paycom:${KEY}`).toString("base64");
let id = 0;
const rpc = (method: string, params: Record<string, unknown>, a = auth) => handlePaymeRequest(JSON.stringify({ id: ++id, method, params }), a);

async function paymeOrder() {
  const res = await createOrder(
    {
      locale: "ru",
      name: "Payme Buyer",
      phone: "+998901112233",
      email: "",
      region: "tashkent_city",
      city: "Ташкент",
      address: "Тест 1",
      deliveryMethod: "agree_with_manager",
      paymentMethod: "payme",
      note: "",
      consent: true,
      items: [{ id: "demo-001", qty: 1 }],
      expectedTotalMinor: 6_500_000,
    },
    randomUUID(),
  );
  if (!res.ok) throw new Error("order failed");
  return res.orderNumber;
}

beforeAll(() => {
  process.env.PAYME_MERCHANT_ID = "test-merchant";
  process.env.PAYME_SECRET_KEY = KEY;
});

describe("Payme merchant callback", () => {
  it("rejects requests without the right key", async () => {
    expect((await rpc("CheckPerformTransaction", {}, "Basic " + Buffer.from("Paycom:wrong").toString("base64"))).error?.code).toBe(-32504);
    expect((await handlePaymeRequest("not json", auth)).error?.code).toBe(-32700);
  });

  it("validates amount and order", async () => {
    const n = await paymeOrder();
    expect((await rpc("CheckPerformTransaction", { amount: 1, account: { order_id: n } })).error?.code).toBe(-31001);
    expect((await rpc("CheckPerformTransaction", { amount: 6_500_000, account: { order_id: "GR-000000-AAAA" } })).error?.code).toBe(-31050);
    expect((await rpc("CheckPerformTransaction", { amount: 6_500_000, account: { order_id: n } })).result).toEqual({ allow: true });
  });

  it("marks the order paid only on PerformTransaction, idempotently, and refunds on cancel", async () => {
    const n = await paymeOrder();
    const now = Date.now();
    const tx = `tx-${now}`;
    const created = await rpc("CreateTransaction", { id: tx, time: now, amount: 6_500_000, account: { order_id: n } });
    expect(created.result).toMatchObject({ state: 1 });
    expect((await getOrderAdmin(n))?.order.paymentStatus).toBe("pending");

    // a second transaction for the same order is refused while the first is active
    expect((await rpc("CreateTransaction", { id: `${tx}-b`, time: now, amount: 6_500_000, account: { order_id: n } })).error?.code).toBe(-31050);

    const p1 = (await rpc("PerformTransaction", { id: tx })).result as { perform_time: number; state: number };
    const p2 = (await rpc("PerformTransaction", { id: tx })).result as { perform_time: number };
    expect(p1.state).toBe(2);
    expect(p2.perform_time).toBe(p1.perform_time);
    expect((await getOrderAdmin(n))?.order.paymentStatus).toBe("paid");

    const c = (await rpc("CancelTransaction", { id: tx, reason: 5 })).result as { state: number };
    expect(c.state).toBe(-2);
    expect((await getOrderAdmin(n))?.order.paymentStatus).toBe("refunded");
  });

  it("refuses a refund once the order has shipped", async () => {
    const n = await paymeOrder();
    const now = Date.now();
    await rpc("CreateTransaction", { id: `ship-${now}`, time: now, amount: 6_500_000, account: { order_id: n } });
    await rpc("PerformTransaction", { id: `ship-${now}` });
    for (const [from, to] of [
      ["new", "confirmed"],
      ["confirmed", "processing"],
      ["processing", "shipped"],
    ] as const)
      await changeOrderStatus({ number: n, to, expected: from, actor: "t" });
    expect((await rpc("CancelTransaction", { id: `ship-${now}`, reason: 5 })).error?.code).toBe(-31007);
  });

  it("refuses transactions older than 12 hours", async () => {
    const n = await paymeOrder();
    const old = Date.now() - 13 * 3600 * 1000;
    expect((await rpc("CreateTransaction", { id: `old-${old}`, time: old, amount: 6_500_000, account: { order_id: n } })).error?.code).toBe(-31050);
  });
});
