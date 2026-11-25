import "server-only";
import { createHash } from "node:crypto";
import { limit, peek, reset } from "@/lib/rate-limit";

/**
 * Brute-force protection for the owner's password login (shared counters in the DB, so it
 * holds on serverless hosting):
 *  - per IP: 5 attempts / 15 min;
 *  - per username, from any IP: 10 failures / 30 min (stops attacks spread over many IPs);
 *  - site-wide circuit breaker: 100 failures / hour disables password login for the rest of the
 *    hour (staff can still sign in with Google).
 * Fails closed: if the counters can't be read, the attempt is refused.
 */
export const LOGIN_POLICY = {
  ip: { max: 5, windowMs: 15 * 60 * 1000 },
  user: { max: 10, windowMs: 30 * 60 * 1000 },
  global: { max: 100, windowMs: 60 * 60 * 1000 },
} as const;

const userKey = (u: string) => `admin-login-fail-user:${u.trim().toLowerCase()}`;
const GLOBAL_KEY = "admin-login-fail-all";

export async function checkLoginAllowed(ip: string, username: string): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  if ((await peek(GLOBAL_KEY, LOGIN_POLICY.global.windowMs)) >= LOGIN_POLICY.global.max) return { ok: false, retryAfter: 3600 };
  if (username && (await peek(userKey(username), LOGIN_POLICY.user.windowMs)) >= LOGIN_POLICY.user.max) return { ok: false, retryAfter: 1800 };
  const byIp = await limit(`admin-login-ip:${ip}`, LOGIN_POLICY.ip.max, LOGIN_POLICY.ip.windowMs, { failClosed: true });
  return byIp.ok ? { ok: true } : { ok: false, retryAfter: byIp.retryAfter };
}

export async function recordLoginFailure(username: string): Promise<void> {
  if (username) await limit(userKey(username), Number.MAX_SAFE_INTEGER, LOGIN_POLICY.user.windowMs);
  await limit(GLOBAL_KEY, Number.MAX_SAFE_INTEGER, LOGIN_POLICY.global.windowMs);
  // Slow every failure down a little (jittered) to make online guessing expensive.
  await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 600)));
}

export async function recordLoginSuccess(username: string): Promise<void> {
  await reset(userKey(username));
}

/** Short, non-reversible tag of an IP for the audit log (no raw addresses stored). */
export const ipTag = (ip: string) => createHash("sha256").update(`gremu-ip:${ip}`).digest("hex").slice(0, 12);
