import type { MetadataRoute } from "next";

const base = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/*/account", "/*/cart", "/*/checkout", "/*/admin", "/*/search", "/*/order"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
