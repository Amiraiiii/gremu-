import { NextResponse } from "next/server";
import { rejectNonJson } from "@/lib/http";
import { inquirySchema } from "@/features/inquiries/schema";
import { submitInquiry } from "@/features/inquiries/service";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/auth/user";

// Idempotency: the client sends one key per form submission; repeats return the first result.
const seen = new Map<string, { id: string; at: number }>();
const IDEMPOTENCY_TTL = 10 * 60 * 1000;

export async function POST(req: Request) {
  const bad = rejectNonJson(req);
  if (bad) return bad;
  const limit = rateLimit(`inq:${clientKey(req)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] ??= issue.message;
    }
    // A filled honeypot gets a quiet success-shaped reply so bots learn nothing.
    if (fields.website === "spam") return NextResponse.json({ ok: true, id: "ignored" });
    return NextResponse.json({ ok: false, error: "validation", fields }, { status: 422 });
  }

  const key = req.headers.get("idempotency-key")?.slice(0, 64);
  const now = Date.now();
  if (key) {
    const prev = seen.get(key);
    if (prev && now - prev.at < IDEMPOTENCY_TTL) return NextResponse.json({ ok: true, id: prev.id, duplicate: true });
  }

  const v = parsed.data;
  try {
    const user = await getCurrentUser().catch(() => null);
    const res = await submitInquiry({ ...v, userId: user?.id ?? null }, v.topic === "fitment" ? "fitment_request" : "contact_form");
    if (key) seen.set(key, { id: res.id, at: now });
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error("[inquiries] store failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "store_failed" }, { status: 500 });
  }
}
