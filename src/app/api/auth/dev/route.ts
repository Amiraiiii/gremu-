import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeNext } from "@/lib/auth/google";
import { createUserSession, devLoginEnabled, upsertUser } from "@/lib/auth/user";

/**
 * LOCAL DEVELOPMENT ONLY: sign in as a test customer without Google, to work on the account
 * pages before OAuth credentials exist. Disabled unless NODE_ENV !== "production" and
 * AUTH_DEV_LOGIN=1. Accounts are marked "dev:" and are separate from Google accounts.
 */
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  name: z.string().trim().min(2).max(80),
  locale: z.enum(["ru", "uz"]),
  next: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  if (!devLoginEnabled()) return NextResponse.json({ ok: false }, { status: 404 });
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });
  const parsed = schema.safeParse(Object.fromEntries((await req.formData()).entries()));
  if (!parsed.success) return NextResponse.redirect(new URL("/ru/account/login?error=failed", req.nextUrl.origin), 303);
  const { email, name, locale, next } = parsed.data;
  try {
    const user = await upsertUser({ providerId: `dev:${email}`, email, name, locale });
    await createUserSession(user.id);
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/account/login?error=email_in_use`, req.nextUrl.origin), 303);
  }
  return NextResponse.redirect(new URL(safeNext(next, locale), req.nextUrl.origin), 303);
}
