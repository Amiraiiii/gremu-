import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

/**
 * Rate limiting in two layers:
 *  1. `rateLimit` — in-memory, per server instance: a cheap first filter for obvious floods.
 *  2. `limit` / `peek` / `reset` — counters in the database (`rate_limits`), shared by every
 *     instance. On serverless hosting (Vercel) only this layer actually bounds an attacker,
 *     because each request may land on a different instance.
 * Keys are stored as sha256 hashes, so no raw IP addresses or usernames are kept.
 */
export type LimitResult = { ok: boolean; retryAfter: number; count: number };

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return { ok: true, retryAfter: 0 };
}

const hashKey = (key: string) => createHash("sha256").update(`gremu-rl:${key}`).digest("hex");

type Row = { count: number; window_start: Date | string };
function rowsOf(res: unknown): Row[] {
  if (Array.isArray(res)) return res as Row[];
  return ((res as { rows?: Row[] }).rows ?? []) as Row[];
}

/**
 * Count one hit for `key` in a fixed window and say whether it is within `max`.
 * `failClosed`: if the database is unreachable, deny (use for logins); otherwise fall back
 * to the in-memory result so a DB hiccup doesn't take the shop down.
 */
export async function limit(key: string, max: number, windowMs: number, opts: { failClosed?: boolean } = {}): Promise<LimitResult> {
  const local = rateLimit(`mem:${key}`, max, windowMs);
  if (!local.ok) return { ok: false, retryAfter: local.retryAfter, count: max + 1 };
  try {
    const db = await getDb();
    const k = hashKey(key);
    const res = await db.execute(sql`
      INSERT INTO rate_limits (key, window_start, count) VALUES (${k}, now(), 1)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.window_start <= now() - (${windowMs} * interval '1 millisecond') THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE WHEN rate_limits.window_start <= now() - (${windowMs} * interval '1 millisecond') THEN now() ELSE rate_limits.window_start END
      RETURNING count, window_start`);
    const row = rowsOf(res)[0];
    const count = Number(row?.count ?? 1);
    const started = new Date(row?.window_start ?? Date.now()).getTime();
    if (Math.random() < 0.01) void db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`).catch(() => undefined);
    const retryAfter = Math.max(1, Math.ceil((started + windowMs - Date.now()) / 1000));
    return { ok: count <= max, retryAfter: count <= max ? 0 : retryAfter, count };
  } catch (e) {
    console.error("[rate-limit] db unavailable:", (e as Error).message);
    return opts.failClosed ? { ok: false, retryAfter: 60, count: max + 1 } : { ok: true, retryAfter: 0, count: 0 };
  }
}

/** Current count for `key` without adding a hit (0 when the window has expired). */
export async function peek(key: string, windowMs: number): Promise<number> {
  try {
    const db = await getDb();
    const res = await db.execute(sql`
      SELECT count, window_start FROM rate_limits
      WHERE key = ${hashKey(key)} AND window_start > now() - (${windowMs} * interval '1 millisecond')`);
    return Number(rowsOf(res)[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

export async function reset(key: string): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(sql`DELETE FROM rate_limits WHERE key = ${hashKey(key)}`);
  } catch {
    // best effort
  }
  hits.delete(`mem:${key}`);
}

/**
 * The client's IP. On Vercel, `x-real-ip` is set by Vercel's edge and cannot be forged by the
 * client (a client-sent X-Forwarded-For would otherwise let an attacker pick a fresh "IP" per
 * request and dodge per-IP limits). Elsewhere, set TRUST_PROXY=1 only behind a proxy that
 * overwrites X-Forwarded-For.
 */
export function ipFromHeaders(h: Headers): string {
  if (process.env.VERCEL) return h.get("x-real-ip") || h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (process.env.TRUST_PROXY === "1") return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function clientKey(req: Request): string {
  return ipFromHeaders(req.headers);
}
