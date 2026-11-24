import { NextResponse, type NextRequest } from "next/server";
import { endUserSession } from "@/lib/auth/user";

/** POST only (a link or image cannot sign someone out); the Origin must be this site. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ ok: false }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const locale = form?.get("locale") === "uz" ? "uz" : "ru";
  await endUserSession();
  return NextResponse.redirect(new URL(`/${locale}`, req.nextUrl.origin), 303);
}
