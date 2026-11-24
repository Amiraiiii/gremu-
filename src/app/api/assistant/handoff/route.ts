import { NextResponse } from "next/server";
import { rejectNonJson } from "@/lib/http";
import { z } from "zod";
import { submitInquiry } from "@/features/inquiries/service";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * "Contact a manager" from the assistant: saves an inquiry (source ai_handoff) with the
 * customer's question and the recent conversation, then emails MANAGER_EMAIL.
 * Works whether or not Gemini is configured.
 */
const schema = z
  .object({
    locale: z.enum(["ru", "uz"]),
    name: z.string().trim().min(2, "name").max(80, "name"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s\-()]{7,24}$/, "phone")
      .optional()
      .or(z.literal("")),
    email: z.string().trim().email("email").max(120).optional().or(z.literal("")),
    question: z.string().trim().min(5, "message").max(1000, "message"),
    transcript: z
      .array(z.object({ role: z.enum(["user", "model"]), text: z.string().max(2000) }))
      .max(12)
      .optional(),
    consent: z.literal(true, { message: "consent" }),
    website: z.string().max(0, "spam").optional().or(z.literal("")),
  })
  .refine((v) => Boolean(v.phone) || Boolean(v.email), { message: "contact", path: ["phone"] });

export async function POST(req: Request) {
  const bad = rejectNonJson(req);
  if (bad) return bad;
  if (!rateLimit(`ai-handoff:${clientKey(req)}`, 5, 10 * 60 * 1000).ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0] ?? "form")] ??= i.message;
    if (fields.website === "spam") return NextResponse.json({ ok: true, id: "ignored" });
    return NextResponse.json({ ok: false, error: "validation", fields }, { status: 422 });
  }
  const v = parsed.data;
  const transcript = (v.transcript ?? [])
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Клиент" : "AI"}: ${t.text.slice(0, 600)}`)
    .join("\n");
  const message = transcript ? `${v.question}\n\n--- Переписка с AI-помощником (последние сообщения) ---\n${transcript}` : v.question;

  try {
    const res = await submitInquiry(
      { locale: v.locale, name: v.name, phone: v.phone, email: v.email, topic: "fitment", message: message.slice(0, 6000), sku: "" },
      "ai_handoff",
    );
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    console.error("[assistant] handoff failed", (e as Error).message);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
