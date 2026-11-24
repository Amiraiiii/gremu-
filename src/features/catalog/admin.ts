import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { ensureCatalogSeeded, loadProducts } from "./repository";

/**
 * Catalog management for the admin area. Validation happens here (server), every change is
 * written to the audit log with what changed, and nothing here is reachable without a staff session
 * (the actions check the role before calling in).
 */
export const AVAILABILITY = ["in_stock", "low_stock", "out_of_stock", "on_request"] as const;
export const PART_TYPES = ["original", "aftermarket", "used"] as const;
export const FITMENT_STATUSES = ["verified", "unverified", "not_compatible"] as const;
export const MAKES = ["hyundai", "kia"] as const;

const year = z.coerce.number().int().min(1980).max(2100);
const text = (max: number) => z.string().trim().max(max);

export const fitmentSchema = z
  .object({
    make: z.enum(MAKES),
    model: text(40).min(1, "model"),
    generation: text(40).optional().transform((v) => v || null),
    yearFrom: year,
    yearTo: year,
    engine: text(40).optional().transform((v) => v || null),
    status: z.enum(FITMENT_STATUSES),
  })
  .refine((f) => f.yearFrom <= f.yearTo, { message: "years", path: ["yearTo"] });

export const productSchema = z
  .object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug").max(120, "slug"),
    sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9\-_.]{1,39}$/, "sku"),
    oemNumber: text(40).optional().transform((v) => v || null),
    categorySlug: text(60).min(1, "category"),
    brand: text(80).optional().transform((v) => v || null),
    vehicleMake: z.enum(MAKES),
    partType: z.enum(PART_TYPES),
    titleRu: text(160).min(2, "title"),
    titleUz: text(160).min(2, "title"),
    descriptionRu: text(4000).default(""),
    descriptionUz: text(4000).default(""),
    priceUzs: z.coerce.number().int("price").min(0, "price").max(10_000_000_000, "price"),
    stockQuantity: z
      .union([z.literal(""), z.coerce.number().int("stock").min(0, "stock").max(1_000_000, "stock")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    availability: z.enum(AVAILABILITY),
    isPublished: z.boolean(),
    specs: z.array(z.object({ ru: text(60).min(1), uz: text(60).min(1), value: text(120).min(1) })).max(30).default([]),
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .regex(/^(\/products\/[a-z0-9][a-z0-9-]*\.(webp|png|jpe?g)|https:\/\/[^\s"'<>]+)$/i, "image")
      .optional()
      .or(z.literal(""))
      .transform((v) => v || null),
    fitments: z.array(fitmentSchema).max(200).default([]),
  })
  .refine((p) => !(p.stockQuantity === 0 && (p.availability === "in_stock" || p.availability === "low_stock")), {
    message: "stock_zero",
    path: ["availability"],
  });

export type ProductInput = z.infer<typeof productSchema>;

async function audit(actor: string, action: string, entityType: string, entityId: string | null, metadata?: unknown) {
  const db = await getDb();
  await db.insert(schema.auditLog).values({ actor, action, entityType, entityId, metadata: metadata ? JSON.stringify(metadata).slice(0, 4000) : null });
}

async function brandIdFor(name: string | null): Promise<string | null> {
  if (!name) return null;
  const db = await getDb();
  const [found] = await db.select().from(schema.brands).where(ilike(schema.brands.name, name.replace(/[%_\\]/g, "\\$&"))).limit(1);
  if (found) return found.id;
  const [created] = await db.insert(schema.brands).values({ name }).onConflictDoNothing().returning();
  if (created) return created.id;
  const [again] = await db.select().from(schema.brands).where(eq(schema.brands.name, name)).limit(1);
  return again?.id ?? null;
}

// ---------- products
export async function listAdminProducts(opts: { q?: string; category?: string; published?: string; page?: number }) {
  await ensureCatalogSeeded();
  const db = await getDb();
  const pageSize = 30;
  const page = Math.max(1, opts.page ?? 1);
  const where: SQL[] = [];
  const q = opts.q?.trim().slice(0, 60);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(schema.products.sku, like), ilike(schema.products.oemNumber, like), ilike(schema.products.titleRu, like), ilike(schema.products.titleUz, like))!);
  }
  if (opts.category) where.push(eq(schema.products.categorySlug, opts.category));
  if (opts.published === "yes") where.push(eq(schema.products.isPublished, true));
  if (opts.published === "no") where.push(eq(schema.products.isPublished, false));
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ p: schema.products, brand: schema.brands.name })
      .from(schema.products)
      .leftJoin(schema.brands, eq(schema.brands.id, schema.products.brandId))
      .where(cond)
      .orderBy(desc(schema.products.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(schema.products).where(cond),
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminProduct(id: string) {
  return (await loadProducts({ ids: [id], all: true }))[0] ?? null;
}

export async function getProductMeta(id: string) {
  const db = await getDb();
  const [row] = await db.select({ isPublished: schema.products.isPublished, isDemo: schema.products.isDemo }).from(schema.products).where(eq(schema.products.id, id));
  return row ?? null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: "duplicate_sku" | "duplicate_slug" | "category" | "not_found" };

/** Create (id = null) or update a product; fitments are replaced as a whole. */
export async function saveProduct(id: string | null, input: ProductInput, actor: string): Promise<SaveResult> {
  const db = await getDb();
  const [cat] = await db.select().from(schema.categories).where(eq(schema.categories.slug, input.categorySlug)).limit(1);
  if (!cat) return { ok: false, error: "category" };
  const brandId = await brandIdFor(input.brand);

  const values = {
    slug: input.slug,
    sku: input.sku,
    oemNumber: input.oemNumber,
    categorySlug: input.categorySlug,
    brandId,
    vehicleMake: input.vehicleMake,
    partType: input.partType,
    titleRu: input.titleRu,
    titleUz: input.titleUz,
    descriptionRu: input.descriptionRu,
    descriptionUz: input.descriptionUz,
    priceMinor: input.priceUzs * 100,
    stockQuantity: input.stockQuantity,
    availability: input.availability,
    isPublished: input.isPublished,
    specs: input.specs,
    imageUrl: input.imageUrl,
    updatedAt: new Date(),
  };

  try {
    const result = await db.transaction(async (tx) => {
      let productId = id;
      let before: typeof schema.products.$inferSelect | undefined;
      if (id) {
        [before] = await tx.select().from(schema.products).where(eq(schema.products.id, id)).for("update");
        if (!before) return { ok: false as const, error: "not_found" as const };
        await tx.update(schema.products).set(values).where(eq(schema.products.id, id));
      } else {
        productId = `p-${randomBytes(6).toString("hex")}`;
        await tx.insert(schema.products).values({ id: productId, ...values });
      }
      await tx.delete(schema.productFitments).where(eq(schema.productFitments.productId, productId!));
      if (input.fitments.length) {
        await tx.insert(schema.productFitments).values(
          input.fitments.map((f) => ({ ...f, productId: productId!, verifiedBy: f.status === "verified" ? actor : null })),
        );
      }
      const changes: Record<string, [unknown, unknown]> = {};
      if (before) {
        for (const k of ["priceMinor", "stockQuantity", "availability", "isPublished", "sku", "categorySlug"] as const) {
          if (before[k] !== values[k]) changes[k] = [before[k], values[k]];
        }
      }
      await tx.insert(schema.auditLog).values({
        actor,
        action: id ? "product.update" : "product.create",
        entityType: "product",
        entityId: input.sku,
        metadata: JSON.stringify(id ? { changes, fitments: input.fitments.length } : { price: values.priceMinor, fitments: input.fitments.length }),
      });
      return { ok: true as const, id: productId! };
    });
    return result;
  } catch (e) {
    const msg = String((e as Error).message);
    if (msg.includes("products_sku")) return { ok: false, error: "duplicate_sku" };
    if (msg.includes("products_slug")) return { ok: false, error: "duplicate_slug" };
    throw e;
  }
}

/** Quick inline change from the product list. */
export async function quickUpdate(id: string, patch: { priceUzs?: number; stockQuantity?: number | null; isPublished?: boolean; availability?: string }, actor: string) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(schema.products).where(eq(schema.products.id, id)).for("update");
    if (!before) return false;
    const next = {
      priceMinor: patch.priceUzs !== undefined ? patch.priceUzs * 100 : before.priceMinor,
      stockQuantity: patch.stockQuantity !== undefined ? patch.stockQuantity : before.stockQuantity,
      isPublished: patch.isPublished ?? before.isPublished,
      availability: (patch.availability as string) ?? before.availability,
    };
    if (next.stockQuantity === 0 && (next.availability === "in_stock" || next.availability === "low_stock")) next.availability = "out_of_stock";
    const changes: Record<string, [unknown, unknown]> = {};
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (before[k] !== next[k]) changes[k] = [before[k], next[k]];
    if (!Object.keys(changes).length) return true;
    await tx.update(schema.products).set({ ...next, updatedAt: new Date() }).where(eq(schema.products.id, id));
    await tx.insert(schema.auditLog).values({ actor, action: "product.quick_update", entityType: "product", entityId: before.sku, metadata: JSON.stringify({ changes }) });
    return true;
  });
}

export async function deleteProduct(id: string, actor: string) {
  const db = await getDb();
  const [row] = await db.delete(schema.products).where(eq(schema.products.id, id)).returning();
  // Order items keep their own title/SKU/price snapshots, so past orders are unaffected.
  if (row) await audit(actor, "product.delete", "product", row.sku, { title: row.titleRu });
  return Boolean(row);
}

// ---------- categories
export const categorySchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug").max(60),
  nameRu: text(80).min(2),
  nameUz: text(80).min(2),
  partsRu: text(200).default(""),
  partsUz: text(200).default(""),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isPublished: z.boolean(),
});

export async function listCategoriesAdmin() {
  await ensureCatalogSeeded();
  const db = await getDb();
  const [cats, counts] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.slug)),
    db.select({ slug: schema.products.categorySlug, n: count() }).from(schema.products).groupBy(schema.products.categorySlug),
  ]);
  const n = new Map(counts.map((c) => [c.slug, c.n]));
  return cats.map((c) => ({ ...c, products: n.get(c.slug) ?? 0 }));
}

/** `originalSlug` null = create. Renaming a slug cascades to products (FK ON UPDATE CASCADE). */
export async function saveCategory(originalSlug: string | null, input: z.infer<typeof categorySchema>, actor: string): Promise<"ok" | "duplicate" | "not_found"> {
  const db = await getDb();
  try {
    if (originalSlug) {
      const [row] = await db.update(schema.categories).set({ ...input, updatedAt: new Date() }).where(eq(schema.categories.slug, originalSlug)).returning();
      if (!row) return "not_found";
    } else {
      await db.insert(schema.categories).values(input);
    }
  } catch (e) {
    if (String((e as Error).message).match(/duplicate|unique|categories_pkey/i)) return "duplicate";
    throw e;
  }
  await audit(actor, originalSlug ? "category.update" : "category.create", "category", input.slug, originalSlug && originalSlug !== input.slug ? { renamedFrom: originalSlug } : undefined);
  return "ok";
}

export async function deleteCategory(slug: string, actor: string): Promise<"ok" | "in_use"> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.products).where(eq(schema.products.categorySlug, slug));
  if (n > 0) return "in_use";
  await db.delete(schema.categories).where(eq(schema.categories.slug, slug));
  await audit(actor, "category.delete", "category", slug);
  return "ok";
}

// ---------- brands
export async function listBrandsAdmin() {
  await ensureCatalogSeeded();
  const db = await getDb();
  const [rows, counts] = await Promise.all([
    db.select().from(schema.brands).orderBy(asc(schema.brands.name)),
    db.select({ id: schema.products.brandId, n: count() }).from(schema.products).groupBy(schema.products.brandId),
  ]);
  const n = new Map(counts.map((c) => [c.id, c.n]));
  return rows.map((b) => ({ ...b, products: n.get(b.id) ?? 0 }));
}

export async function saveBrand(id: string | null, name: string, actor: string): Promise<"ok" | "duplicate" | "invalid"> {
  const clean = name.trim().slice(0, 80);
  if (clean.length < 2) return "invalid";
  const db = await getDb();
  try {
    if (id) await db.update(schema.brands).set({ name: clean }).where(eq(schema.brands.id, id));
    else await db.insert(schema.brands).values({ name: clean });
  } catch (e) {
    if (String((e as Error).message).match(/duplicate|unique|brands_name/i)) return "duplicate";
    throw e;
  }
  await audit(actor, id ? "brand.update" : "brand.create", "brand", clean);
  return "ok";
}

export async function deleteBrand(id: string, actor: string): Promise<"ok" | "in_use"> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.products).where(eq(schema.products.brandId, id));
  if (n > 0) return "in_use";
  const [row] = await db.delete(schema.brands).where(eq(schema.brands.id, id)).returning();
  if (row) await audit(actor, "brand.delete", "brand", row.name);
  return "ok";
}

// ---------- audit log
export async function listAudit(opts: { entity?: string; q?: string; page?: number }) {
  const db = await getDb();
  const pageSize = 50;
  const page = Math.max(1, opts.page ?? 1);
  const where: SQL[] = [];
  if (opts.entity) where.push(eq(schema.auditLog.entityType, opts.entity.slice(0, 30)));
  const q = opts.q?.trim().slice(0, 60);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(or(ilike(schema.auditLog.actor, like), ilike(schema.auditLog.entityId, like), ilike(schema.auditLog.action, like))!);
  }
  const cond = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(schema.auditLog).where(cond).orderBy(desc(schema.auditLog.createdAt)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: count() }).from(schema.auditLog).where(cond),
  ]);
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
