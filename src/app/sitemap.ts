import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { loadProducts } from "@/features/catalog/repository";
import { getCategoryItems } from "@/features/catalog/categories";

const base = process.env.APP_URL ?? "http://localhost:3000";

// Rebuilt at most hourly, so new and unpublished products show up without a redeploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cats = await getCategoryItems("ru");
  const paths = ["", "/catalog", ...cats.map((c) => `/categories/${c.slug}`)];
  // Published, non-demo products only: demo data is never offered to search engines.
  const products = (await loadProducts()).filter((p) => !p.isDemo).map((p) => `/products/${p.slug}`);
  return [...paths, ...products].flatMap((p) =>
    locales.map((l) => ({
      url: `${base}/${l}${p}`,
      changeFrequency: "weekly" as const,
      alternates: { languages: Object.fromEntries(locales.map((x) => [x, `${base}/${x}${p}`])) },
    })),
  );
}
