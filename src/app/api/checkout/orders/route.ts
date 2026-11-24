import { NextResponse } from "next/server";
import { rejectNonJson } from "@/lib/http";
import { checkoutSchema, createOrder } from "@/features/orders/service";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/user";
import { availablePaymentMethods } from "@/features/payments";

export async function POST(req: Request) {
  const bad = rejectNonJson(req);
  if (bad) return bad;
  const limit = rateLimit(`order:${clientKey(req)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
    return NextResponse.json({ ok: false, error: "validation", fields }, { status: 422 });
  }

  // An online method whose provider is not configured is never accepted, whatever the client sends.
  if (!availablePaymentMethods().includes(parsed.data.paymentMethod)) {
    return NextResponse.json({ ok: false, error: "validation", fields: { paymentMethod: "payment" } }, { status: 422 });
  }

  const key = req.headers.get("idempotency-key")?.trim().slice(0, 64) || null;
  try {
    const user = await getCurrentUser();
    const result = await createOrder(parsed.data, key, user?.id ?? null);
    if (result.ok) return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
    if (result.reason === "changed") return NextResponse.json({ ok: false, error: "changed", quote: result.quote }, { status: 409 });
    return NextResponse.json({ ok: false, error: "empty" }, { status: 422 });
  } catch (e) {
    console.error("[checkout] order failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
