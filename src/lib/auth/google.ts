import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Google sign-in via OpenID Connect, authorization-code flow with PKCE, state and nonce.
 * Only the `openid email profile` scopes are requested.
 *
 * Without GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET the button is shown as "not configured";
 * nothing pretends to sign in. Redirect URI to register in Google Cloud Console:
 *   ${APP_URL}/api/auth/google/callback
 */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const OAUTH_COOKIE = "gremu_oauth";
const FLOW_TTL_S = 10 * 60;

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

export function appUrl(): string {
  return (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
}

export const redirectUri = () => `${appUrl()}/api/auth/google/callback`;

function secret(): string {
  const s = process.env.APP_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("APP_SECRET must be set in production");
  return "gremu-dev-only-secret";
}

/** Only same-site relative paths are allowed as the post-login destination. */
export function safeNext(next: string | null | undefined, locale: string): string {
  const fallback = `/${locale}/account`;
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next.slice(0, 300);
}

export type OAuthFlow = { state: string; verifier: string; nonce: string; next: string; locale: string; exp: number };

const b64 = (buf: Buffer) => buf.toString("base64url");
const sign = (payload: string) => createHmac("sha256", secret()).update(`oauth:${payload}`).digest("base64url");

/** Start a flow: returns Google's URL and the signed, short-lived cookie value holding the PKCE verifier. */
export function beginFlow(locale: string, next: string): { url: string; cookie: string; maxAge: number } {
  const flow: OAuthFlow = {
    state: b64(randomBytes(24)),
    verifier: b64(randomBytes(48)),
    nonce: b64(randomBytes(24)),
    next,
    locale,
    exp: Math.floor(Date.now() / 1000) + FLOW_TTL_S,
  };
  const challenge = b64(createHash("sha256").update(flow.verifier).digest());
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: locale === "uz" ? "uz" : "ru",
  });
  const payload = b64(Buffer.from(JSON.stringify(flow)));
  return { url: `${AUTH_URL}?${params}`, cookie: `${payload}.${sign(payload)}`, maxAge: FLOW_TTL_S };
}

export function readFlow(raw: string | undefined): OAuthFlow | null {
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sign(payload));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const flow = JSON.parse(Buffer.from(payload, "base64url").toString()) as OAuthFlow;
    return flow.exp > Date.now() / 1000 ? flow : null;
  } catch {
    return null;
  }
}

export function stateMatches(flow: OAuthFlow, state: string): boolean {
  const a = Buffer.from(flow.state);
  const b = Buffer.from(state);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type GoogleProfile = { sub: string; email: string; name: string | null };

/**
 * Exchange the code for tokens directly with Google over TLS, then check the ID token claims
 * (iss, aud, exp, nonce, email_verified). Per OIDC Core §3.1.3.7 the TLS-authenticated token
 * endpoint response stands in for a signature check.
 */
export async function finishFlow(flow: OAuthFlow, code: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`token_exchange_${res.status}`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("no_id_token");

  const part = data.id_token.split(".")[1];
  if (!part) throw new Error("bad_id_token");
  const claims = JSON.parse(Buffer.from(part, "base64url").toString()) as Record<string, unknown>;
  const now = Date.now() / 1000;
  if (!ISSUERS.includes(String(claims.iss))) throw new Error("bad_iss");
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID!.trim()) throw new Error("bad_aud");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("expired");
  if (claims.nonce !== flow.nonce) throw new Error("bad_nonce");
  if (typeof claims.sub !== "string" || !claims.sub) throw new Error("no_sub");
  if (typeof claims.email !== "string" || claims.email_verified !== true) throw new Error("email_unverified");

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === "string" ? claims.name.slice(0, 80) : null,
  };
}
