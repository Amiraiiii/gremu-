import { NextResponse } from "next/server";

/**
 * CSRF guard for JSON APIs. A cross-site HTML form can only send form-encoded or text/plain
 * bodies; requiring application/json forces a CORS preflight, which other origins don't pass.
 * Returns a 415 response to send back, or null when the request is fine.
 */
export function rejectNonJson(req: Request): NextResponse | null {
  const type = req.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(type)) {
    return NextResponse.json({ ok: false, error: "unsupported_media_type" }, { status: 415 });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    try {
      if (host && new URL(origin).host !== host) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    } catch {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
  }
  return null;
}
