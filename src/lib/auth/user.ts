import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/lib/db";

/**
 * Customer sessions. The cookie carries a random 256-bit token; the DB keeps only its sha256,
 * so a database leak does not hand out live sessions. HttpOnly, SameSite=Lax, Secure in production.
 */
import { USER_COOKIE } from "./cookie-names";
export { USER_COOKIE };
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export type CurrentUser = typeof schema.users.$inferSelect;

export async function createUserSession(userId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(schema.userSessions).values({ userId, tokenHash: hash(token), userAgent: ua, expiresAt });
  // Opportunistic cleanup of this user's expired sessions.
  await db.delete(schema.userSessions).where(and(eq(schema.userSessions.userId, userId), lt(schema.userSessions.expiresAt, new Date())));
  (await cookies()).set(USER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The signed-in customer for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(USER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [row] = await db
    .select({ user: schema.users })
    .from(schema.userSessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.userSessions.userId))
    .where(and(eq(schema.userSessions.tokenHash, hash(token)), gt(schema.userSessions.expiresAt, new Date())))
    .limit(1);
  return row?.user ?? null;
});

/** Use at the top of every account page and account action. */
export async function requireUser(locale: string, next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export async function endUserSession() {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.userSessions).where(eq(schema.userSessions.tokenHash, hash(token)));
  }
  store.delete(USER_COOKIE);
}

/** "Sign out everywhere": drop every session of this user, including the current one. */
export async function endAllUserSessions(userId: string) {
  const db = await getDb();
  await db.delete(schema.userSessions).where(eq(schema.userSessions.userId, userId));
  (await cookies()).delete(USER_COOKIE);
}

/**
 * Find or create the account for a verified identity. A Google account is linked to an existing
 * row only through the same provider id; the role is never taken from the identity provider.
 */
export async function upsertUser(identity: { providerId: string; email: string; name: string | null; locale: string }) {
  const db = await getDb();
  const now = new Date();
  const existing = await db.query.users.findFirst({ where: eq(schema.users.authProviderId, identity.providerId) });
  if (existing) {
    const [u] = await db
      .update(schema.users)
      .set({ email: identity.email, fullName: existing.fullName ?? identity.name, role: serverRole(identity), lastLoginAt: now, updatedAt: now })
      .where(eq(schema.users.id, existing.id))
      .returning();
    return u;
  }
  const [u] = await db
    .insert(schema.users)
    .values({
      authProviderId: identity.providerId,
      email: identity.email,
      fullName: identity.name,
      preferredLocale: identity.locale === "uz" ? "uz" : "ru",
      role: serverRole(identity),
      lastLoginAt: now,
    })
    .returning();
  return u;
}

/** Role recorded on the account for reference; access checks re-read the env lists every request. */
function serverRole(identity: { providerId: string; email: string }): string {
  if (!identity.providerId.startsWith("google:")) return "customer";
  const e = identity.email.toLowerCase();
  const has = (v?: string) => (v ?? "").toLowerCase().split(/[,;\s]+/).includes(e);
  return has(process.env.ADMIN_EMAILS) ? "admin" : has(process.env.STAFF_EMAILS) ? "staff" : "customer";
}

/** Local development only, and only when AUTH_DEV_LOGIN=1 is set explicitly. Never in production. */
export function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";
}
