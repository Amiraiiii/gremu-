import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { ensureCatalogSeeded } from "./repository";

export type CategoryItem = Dictionary["categories"]["items"][number];

/** Published categories in the admin-defined order, localized. */
export async function getCategoryItems(locale: Locale): Promise<CategoryItem[]> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.isPublished, true))
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.slug));
  return rows.map((r) => ({ slug: r.slug, name: locale === "uz" ? r.nameUz : r.nameRu, parts: locale === "uz" ? r.partsUz : r.partsRu }));
}

/** The dictionary with `categories.items` replaced by the managed categories from the DB. */
export async function getCatalogDictionary(locale: Locale): Promise<Dictionary> {
  const t = getDictionary(locale);
  const items = await getCategoryItems(locale);
  return { ...t, categories: { ...t.categories, items } } as Dictionary;
}
