import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import ru from "@/i18n/dictionaries/ru";
import uz from "@/i18n/dictionaries/uz";
import { DEMO_PRODUCTS } from "./demo-data";
import type { Availability, CatalogQuery, CatalogRepository, CatalogResult, Fitment, FitmentStatus, Make, PartType, Product } from "./types";

export const PAGE_SIZE = 12;

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, "");

/** Fitment for the vehicle in the query. Without a model or year there is nothing to confirm. */
function fitmentFor(p: Product, q: CatalogQuery): Fitment | undefined {
  if (!q.model && !q.year) return undefined;
  return p.fitments.find(
    (f) =>
      f.status !== "not_compatible" &&
      (!q.make || f.make === q.make) &&
      (!q.model || f.model.toLowerCase() === q.model.toLowerCase()) &&
      (!q.year || (q.year >= f.yearFrom && q.year <= f.yearTo)),
  );
}

function score(p: Product, text: string): number {
  const t = norm(text);
  if (!t) return 0;
  if (p.oemNumber && norm(p.oemNumber) === t) return 100;
  if (norm(p.sku) === t) return 90;
  if (p.oemNumber && norm(p.oemNumber).includes(t)) return 60;
  if (norm(p.sku).includes(t)) return 50;
  const title = `${p.title.ru} ${p.title.uz}`.toLowerCase();
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((s, w) => (title.includes(w) ? s + 10 : s), 0);
}

/** Search, filters and sorting over a product list. Runs on the server only. */
export function searchProducts(all: Product[], q: CatalogQuery): CatalogResult {
  let rows = all.map((p) => ({ p, s: q.q ? score(p, q.q) : 0, fit: fitmentFor(p, q) }));

  if (q.q) rows = rows.filter((r) => r.s > 0);
  if (q.model || q.year) rows = rows.filter((r) => r.fit && (!q.make || r.fit.make === q.make));
  else if (q.make) rows = rows.filter((r) => r.p.vehicleMake === q.make || r.p.fitments.some((f) => f.make === q.make));
  if (q.category) rows = rows.filter((r) => r.p.categorySlug === q.category);
  if (q.partType) rows = rows.filter((r) => r.p.partType === q.partType);
  if (q.availability === "in_stock") rows = rows.filter((r) => r.p.availability === "in_stock" || r.p.availability === "low_stock");
  if (q.minPrice != null) rows = rows.filter((r) => r.p.priceMinor >= q.minPrice! * 100);
  if (q.maxPrice != null) rows = rows.filter((r) => r.p.priceMinor <= q.maxPrice! * 100);

  const sort = q.sort ?? "relevance";
  rows.sort((a, b) => {
    if (sort === "price_asc") return a.p.priceMinor - b.p.priceMinor;
    if (sort === "price_desc") return b.p.priceMinor - a.p.priceMinor;
    if (sort === "newest") return b.p.updatedAt.localeCompare(a.p.updatedAt);
    // relevance: text score, then verified fitment first
    const fa = a.fit?.status === "verified" ? 1 : 0;
    const fb = b.fit?.status === "verified" ? 1 : 0;
    return b.s - a.s || fb - fa;
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page ?? 1), pageCount);
  const items = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => ({ ...r.p, matchedFitment: r.fit }));
  return { items, total, page, pageSize: PAGE_SIZE, pageCount };
}

// ---------- DB mapping
type ProductRow = typeof schema.products.$inferSelect;
type FitmentRow = typeof schema.productFitments.$inferSelect;

export function toProduct(r: ProductRow, fits: FitmentRow[], brand: string | null): Product {
  return {
    id: r.id,
    slug: r.slug,
    categorySlug: r.categorySlug,
    title: { ru: r.titleRu, uz: r.titleUz },
    description: { ru: r.descriptionRu, uz: r.descriptionUz },
    sku: r.sku,
    oemNumber: r.oemNumber,
    manufacturer: brand ?? "—",
    vehicleMake: r.vehicleMake as Make,
    partType: r.partType as PartType,
    priceMinor: r.priceMinor,
    currency: "UZS",
    stockQuantity: r.stockQuantity,
    availability: r.availability as Availability,
    fitments: fits.map((f) => ({
      make: f.make as Make,
      model: f.model,
      generation: f.generation ?? undefined,
      yearFrom: f.yearFrom,
      yearTo: f.yearTo,
      engine: f.engine ?? undefined,
      status: f.status as FitmentStatus,
    })),
    specs: (r.specs ?? []).map((s) => ({ label: { ru: s.ru, uz: s.uz }, value: s.value })),
    imageUrl: r.imageUrl ?? null,
    isDemo: r.isDemo,
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Load products (with fitments and brand) — published only unless `all` is set (admin). */
export async function loadProducts(opts: { ids?: string[]; slug?: string; all?: boolean } = {}): Promise<Product[]> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const where = [];
  if (!opts.all) where.push(eq(schema.products.isPublished, true));
  if (opts.ids) {
    if (!opts.ids.length) return [];
    where.push(inArray(schema.products.id, opts.ids));
  }
  if (opts.slug) where.push(eq(schema.products.slug, opts.slug));
  const rows = await db
    .select({ p: schema.products, brand: schema.brands.name })
    .from(schema.products)
    .leftJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(asc(schema.products.createdAt), asc(schema.products.id));
  if (!rows.length) return [];
  const fits = await db
    .select()
    .from(schema.productFitments)
    .where(inArray(schema.productFitments.productId, rows.map((r) => r.p.id)))
    .orderBy(asc(schema.productFitments.make), asc(schema.productFitments.model), asc(schema.productFitments.yearFrom));
  const byProduct = new Map<string, FitmentRow[]>();
  for (const f of fits) byProduct.set(f.productId, [...(byProduct.get(f.productId) ?? []), f]);
  return rows.map((r) => toProduct(r.p, byProduct.get(r.p.id) ?? [], r.brand));
}

/**
 * Storefront catalog from the database. Search loads the published catalog and filters in
 * memory — fine for a few thousand items; move filters into SQL when the catalog grows.
 */
class DbCatalogRepository implements CatalogRepository {
  async search(q: CatalogQuery) {
    return searchProducts(await loadProducts(), q);
  }
  async getBySlug(slug: string) {
    return (await loadProducts({ slug }))[0] ?? null;
  }
  async getByIds(ids: string[]) {
    return loadProducts({ ids: [...new Set(ids)].slice(0, 100) });
  }
  async findByOem(number: string) {
    const t = norm(number);
    if (!t) return [];
    return (await loadProducts()).filter((p) => p.oemNumber && norm(p.oemNumber) === t);
  }
  async manufacturers() {
    return [...new Set((await loadProducts()).map((p) => p.manufacturer))].sort();
  }
}

export const catalog: CatalogRepository = new DbCatalogRepository();

// ---------- first-run seed
const g = globalThis as unknown as { __gremuCatalogSeed?: Promise<void> };

/**
 * Categories are seeded from the dictionaries once (then edited in the admin area).
 * DEMO products are seeded only outside production, or when CATALOG_SEED_DEMO=1 —
 * a production shop starts with an empty catalog and imports its own (CSV or admin form).
 */
export function ensureCatalogSeeded(): Promise<void> {
  g.__gremuCatalogSeed ??= seed().catch((e) => {
    g.__gremuCatalogSeed = undefined;
    throw e;
  });
  return g.__gremuCatalogSeed;
}

async function seed() {
  const db = await getDb();
  const [{ n: cats }] = await db.select({ n: count() }).from(schema.categories);
  if (cats === 0) {
    await db
      .insert(schema.categories)
      .values(
        ru.categories.items.map((c, i) => ({
          slug: c.slug,
          nameRu: c.name,
          nameUz: uz.categories.items.find((x) => x.slug === c.slug)?.name ?? c.name,
          partsRu: c.parts,
          partsUz: uz.categories.items.find((x) => x.slug === c.slug)?.parts ?? c.parts,
          sortOrder: (i + 1) * 10,
        })),
      )
      .onConflictDoNothing();
  }

  const [{ n: prods }] = await db.select({ n: count() }).from(schema.products);
  const seedDemo = process.env.NODE_ENV !== "production" || process.env.CATALOG_SEED_DEMO === "1";
  if (prods > 0 || !seedDemo) return;

  await db.transaction(async (tx) => {
    const names = [...new Set(DEMO_PRODUCTS.map((p) => p.manufacturer))];
    await tx.insert(schema.brands).values(names.map((name) => ({ name }))).onConflictDoNothing();
    const brandRows = await tx.select().from(schema.brands);
    const brandId = new Map(brandRows.map((b) => [b.name, b.id]));
    await tx.insert(schema.products).values(
      DEMO_PRODUCTS.map((p) => ({
        id: p.id,
        slug: p.slug,
        sku: p.sku,
        oemNumber: p.oemNumber,
        categorySlug: p.categorySlug,
        brandId: brandId.get(p.manufacturer) ?? null,
        vehicleMake: p.vehicleMake,
        partType: p.partType,
        titleRu: p.title.ru,
        titleUz: p.title.uz,
        descriptionRu: p.description.ru,
        descriptionUz: p.description.uz,
        priceMinor: p.priceMinor,
        stockQuantity: p.stockQuantity,
        availability: p.availability,
        specs: p.specs.map((s) => ({ ru: s.label.ru, uz: s.label.uz, value: s.value })),
        isPublished: true,
        isDemo: true,
        updatedAt: new Date(p.updatedAt),
      })),
    );
    const fits = DEMO_PRODUCTS.flatMap((p) =>
      p.fitments.map((f) => ({
        productId: p.id,
        make: f.make,
        model: f.model,
        generation: f.generation ?? null,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
        engine: f.engine ?? null,
        status: f.status,
      })),
    );
    if (fits.length) await tx.insert(schema.productFitments).values(fits);
  });
  console.info(`[catalog] seeded ${DEMO_PRODUCTS.length} DEMO products (development only)`);
}
