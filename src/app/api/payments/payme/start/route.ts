import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/user";
import { appUrl } from "@/lib/auth/google";
import { guestToken, tokenMatches } from "@/features/orders/service";
import { isPayable } from "@/features/payments";
import { payme } from "@/features/payments/payme/config";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * POST (form) → 303 to Payme's hosted checkout. Only the order's owner may start it:
 * the signed-in customer who placed it, or a guest holding the order link token.
 * The amount is always the server-side order total.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });
  if (!rateLimit(`pay:${clientKey(req)}`, 20, 10 * 60 * 1000).ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const locale = form?.get("locale") === "uz" ? "uz" : "ru";
  const number = String(form?.get("number") ?? "");
  const token = String(form?.get("t") ?? "");
  if (!/^GR-\d{6}-[A-Z0-9]{4}$/.test(number)) return NextResponse.json({ ok: false }, { status: 400 });

  const db = await getDb();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.orderNumber, number) });
  const user = await getCurrentUser();
  const isOwner = Boolean(order && user && order.userId === user.id);
  const hasToken = Boolean(order && token && tokenMatches(order.id, token));
  if (!order || (!isOwner && !hasToken)) return NextResponse.json({ ok: false }, { status: 404 });

  const back = isOwner ? `/${locale}/account/orders/${number}` : `/${locale}/order/${number}?t=${guestToken(order.id)}`;
  if (!isPayable(order)) return NextResponse.redirect(new URL(back, req.nextUrl.origin), 303);

  const { redirectUrl } = payme.createCheckout({ orderNumber: number, amountMinor: order.totalMinor, locale, returnUrl: `${appUrl()}${back}` });
  return NextResponse.redirect(redirectUrl, 303);
}
