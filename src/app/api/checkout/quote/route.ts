import { NextResponse } from "next/server";
import { rejectNonJson } from "@/lib/http";
import { buildQuote, quoteRequestSchema } from "@/features/cart/quote";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const bad = rejectNonJson(req);
  if (bad) return bad;
  const limit = rateLimit(`quote:${clientKey(req)}`, 60, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "validation" }, { status: 422 });

  const quote = await buildQuote(parsed.data);
  return NextResponse.json({ ok: true, quote }, { headers: { "Cache-Control": "no-store" } });
}
