import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/i18n/config";

const ADMIN_PATH = /^\/(ru|uz)\/admin(?:\/(?!login(?:\/|$)).*)?$/;
const ACCOUNT_PATH = /^\/(ru|uz)\/account(?:\/(?!login(?:\/|$)).*)?$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));

  if (!hasLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // First gate for the admin area: no session cookie → straight to sign-in (HTTP 307).
  // The signature and role are still verified on the server for every page and action.
  const admin = pathname.match(ADMIN_PATH);
  if (admin && !request.cookies.has("gremu_admin") && !request.cookies.has("gremu_session")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${admin[1]}/admin/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Same first gate for the customer account; the session itself is checked on the server.
  const account = pathname.match(ACCOUNT_PATH);
  if (account && !request.cookies.has("gremu_session")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${account[1]}/account/login`;
    url.search = "";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
