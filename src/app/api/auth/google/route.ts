import { NextResponse, type NextRequest } from "next/server";
import { beginFlow, googleConfigured, OAUTH_COOKIE, safeNext } from "@/lib/auth/google";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** GET /api/auth/google?locale=ru&next=/ru/account — sends the browser to Google's consent screen. */
export function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "uz" ? "uz" : "ru";
  const login = new URL(`/${locale}/account/login`, req.nextUrl.origin);
  if (!googleConfigured()) {
    login.searchParams.set("error", "not_configured");
    return NextResponse.redirect(login);
  }
  if (!rateLimit(`oauth:${clientKey(req)}`, 20, 10 * 60 * 1000).ok) {
    login.searchParams.set("error", "rate_limited");
    return NextResponse.redirect(login);
  }
  const { url, cookie, maxAge } = beginFlow(locale, safeNext(req.nextUrl.searchParams.get("next"), locale));
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from Google
    path: "/api/auth",
    maxAge,
  });
  return res;
}
