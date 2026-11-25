import { NextResponse } from "next/server";
import { rejectNonJson } from "@/lib/http";
import { z } from "zod";
import { AssistantError, chat, geminiConfigured } from "@/features/assistant/gemini";
import { clientKey, limit } from "@/lib/rate-limit";

/**
 * POST /api/assistant/chat — the browser keeps the conversation and sends the last turns.
 * Nothing is stored server-side. Limits: 1000 chars per message, 12 turns, 6000 chars total,
 * 6 requests/minute and 40/hour per client.
 */
export const dynamic = "force-dynamic";

const MAX_MSG = 1000;
const bodySchema = z.object({
  locale: z.enum(["ru", "uz"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(MAX_MSG * 2) }))
    .min(1)
    .max(40),
  vehicle: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  const bad = rejectNonJson(req);
  if (bad) return bad;
  if (!geminiConfigured()) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const key = clientKey(req);
  const minute = await limit(`ai-m:${key}`, 6, 60 * 1000);
  const hour = await limit(`ai-h:${key}`, 40, 60 * 60 * 1000);
  if (!minute.ok || !hour.ok) {
    const retry = Math.max(minute.retryAfter, hour.retryAfter);
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(retry) } });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { locale, vehicle } = parsed.data;

  // Keep the most recent turns within budget; the conversation must end with the user.
  let turns = parsed.data.messages.slice(-12);
  const last = turns[turns.length - 1];
  if (last.role !== "user") return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  if (last.text.length > MAX_MSG) return NextResponse.json({ ok: false, error: "too_long" }, { status: 413 });
  while (turns.reduce((n, t) => n + t.text.length, 0) > 6000 && turns.length > 1) turns = turns.slice(1);
  if (turns[0].role !== "user") turns = turns.slice(1);

  try {
    const result = await chat(locale, turns, vehicle || null);
    if (!result.reply) return NextResponse.json({ ok: false, error: "empty" }, { status: 502 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const kind = e instanceof AssistantError ? e.kind : "upstream";
    if (!(e instanceof AssistantError)) console.error("[assistant] failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: kind }, { status: kind === "blocked" ? 422 : 502 });
  }
}
