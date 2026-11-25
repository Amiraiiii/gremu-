/**
 * Cookie names, shared by the middleware (edge) and the server.
 * In production the browser-enforced prefixes apply:
 *  - "__Host-": accepted only over HTTPS, with Path=/ and no Domain — so a subdomain or a plain
 *    HTTP response can't plant or overwrite the session cookie (session fixation / tossing);
 *  - "__Secure-": HTTPS only (used for the OAuth flow cookie, which is scoped to /api/auth).
 */
const prod = process.env.NODE_ENV === "production";

export const USER_COOKIE = prod ? "__Host-gremu_session" : "gremu_session";
export const ADMIN_COOKIE = prod ? "__Host-gremu_admin" : "gremu_admin";
export const OAUTH_COOKIE = prod ? "__Secure-gremu_oauth" : "gremu_oauth";
