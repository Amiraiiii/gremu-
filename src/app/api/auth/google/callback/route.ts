import { NextResponse, type NextRequest } from "next/server";
import { finishFlow, googleConfigured, OAUTH_COOKIE, readFlow, stateMatches } from "@/lib/auth/google";
import { createUserSession, upsertUser } from "@/lib/auth/user";

/** Google redirects here with ?code&state (or ?error). Nothing is trusted from the query alone. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const flow = readFlow(req.cookies.get(OAUTH_COOKIE)?.value);
  const locale = flow?.locale ?? "ru";
  const fail = (error: string) => {
    const url = new URL(`/${locale}/account/login`, req.nextUrl.origin);
    url.searchParams.set("error", error);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return res;
  };

  if (!googleConfigured()) return fail("not_configured");
  if (sp.get("error")) return fail(sp.get("error") === "access_denied" ? "cancelled" : "provider");
  const code = sp.get("code");
  const state = sp.get("state");
  if (!flow || !code || !state || !stateMatches(flow, state)) return fail("expired");

  try {
    const profile = await finishFlow(flow, code);
    const user = await upsertUser({ providerId: `google:${profile.sub}`, email: profile.email, name: profile.name, locale });
    await createUserSession(user.id);
    const res = NextResponse.redirect(new URL(flow.next, req.nextUrl.origin));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth" });
    return res;
  } catch (e) {
    const msg = (e as Error).message;
    console.error("[auth] google callback failed:", msg);
    return fail(msg === "email_unverified" ? "email_unverified" : msg.includes("users_email") ? "email_in_use" : "failed");
  }
}
