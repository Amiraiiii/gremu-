/**
 * RFC 9116 security.txt — where to report a vulnerability. The contact is the site's contact
 * form until the shop sets SECURITY_CONTACT (e.g. "mailto:security@your-domain").
 */
export const dynamic = "force-dynamic";

export function GET() {
  const base = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
  const contact = process.env.SECURITY_CONTACT?.trim() || `${base}/ru/contact`;
  const expires = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();
  const body = [`Contact: ${contact}`, `Expires: ${expires}`, "Preferred-Languages: ru, uz, en", `Canonical: ${base}/.well-known/security.txt`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
