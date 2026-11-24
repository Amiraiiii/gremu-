"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { staffFor } from "@/lib/auth/admin";
import {
  categorySchema,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  productSchema,
  quickUpdate,
  saveBrand,
  saveCategory,
  saveProduct,
} from "@/features/catalog/admin";

/**
 * Catalog actions. Every one re-checks the staff session and role on the server, and after a
 * change revalidates the whole storefront so prices, stock and categories show up at once.
 */
export type ActionState = { ok?: boolean; error?: string; fields?: Record<string, string> };

const loc = (f: FormData) => (f.get("locale") === "uz" ? "uz" : "ru");
const str = (f: FormData, k: string) => String(f.get(k) ?? "");
const refreshStorefront = () => revalidatePath("/", "layout");
const productId = z.string().regex(/^[a-z0-9-]{3,40}$/);

function json<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function issues(e: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of e.issues) out[i.path.join(".") || "form"] ??= i.message;
  return out;
}

export async function saveProductAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await staffFor("staff");
  if (!session) return { error: "unauthorized" };
  const id = str(form, "id") || null;
  if (id && !productId.safeParse(id).success) return { error: "invalid" };

  const parsed = productSchema.safeParse({
    slug: str(form, "slug"),
    sku: str(form, "sku"),
    oemNumber: str(form, "oemNumber"),
    categorySlug: str(form, "categorySlug"),
    brand: str(form, "brand"),
    vehicleMake: str(form, "vehicleMake"),
    partType: str(form, "partType"),
    titleRu: str(form, "titleRu"),
    titleUz: str(form, "titleUz"),
    descriptionRu: str(form, "descriptionRu"),
    descriptionUz: str(form, "descriptionUz"),
    priceUzs: str(form, "priceUzs").replace(/\s/g, ""),
    stockQuantity: str(form, "stockQuantity").trim(),
    availability: str(form, "availability"),
    isPublished: form.get("isPublished") === "on",
    imageUrl: str(form, "imageUrl"),
    specs: json(str(form, "specs"), []),
    fitments: json(str(form, "fitments"), []),
  });
  if (!parsed.success) return { error: "invalid", fields: issues(parsed.error) };

  const res = await saveProduct(id, parsed.data, session.sub);
  if (!res.ok) return { error: res.error };
  refreshStorefront();
  redirect(`/${loc(form)}/admin/products/${res.id}?saved=1`);
}

export async function quickUpdateAction(form: FormData) {
  const session = await staffFor("staff");
  if (!session) return;
  const id = productId.safeParse(str(form, "id"));
  if (!id.success) return;
  const price = Number.parseInt(str(form, "priceUzs").replace(/\s/g, ""), 10);
  const stockRaw = str(form, "stockQuantity").trim();
  const stock = stockRaw === "" ? null : Number.parseInt(stockRaw, 10);
  if (!Number.isInteger(price) || price < 0 || (stock !== null && (!Number.isInteger(stock) || stock < 0))) return;
  await quickUpdate(id.data, { priceUzs: price, stockQuantity: stock, isPublished: form.get("isPublished") === "on" }, session.sub);
  refreshStorefront();
}

export async function deleteProductAction(form: FormData) {
  const session = await staffFor("admin");
  if (!session) return;
  const id = productId.safeParse(str(form, "id"));
  if (!id.success) return;
  await deleteProduct(id.data, session.sub);
  refreshStorefront();
  redirect(`/${loc(form)}/admin/products?deleted=1`);
}

export async function saveCategoryAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await staffFor("admin");
  if (!session) return { error: "unauthorized" };
  const parsed = categorySchema.safeParse({
    slug: str(form, "slug"),
    nameRu: str(form, "nameRu"),
    nameUz: str(form, "nameUz"),
    partsRu: str(form, "partsRu"),
    partsUz: str(form, "partsUz"),
    sortOrder: str(form, "sortOrder") || "0",
    isPublished: form.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: "invalid", fields: issues(parsed.error) };
  const original = str(form, "originalSlug") || null;
  const res = await saveCategory(original, parsed.data, session.sub);
  if (res !== "ok") return { error: res };
  refreshStorefront();
  return { ok: true };
}

export async function deleteCategoryAction(form: FormData) {
  const session = await staffFor("admin");
  if (!session) return;
  const res = await deleteCategory(str(form, "slug").slice(0, 60), session.sub);
  refreshStorefront();
  if (res === "in_use") redirect(`/${loc(form)}/admin/catalog?error=category_in_use`);
}

export async function saveBrandAction(form: FormData) {
  const session = await staffFor("admin");
  if (!session) return;
  const id = str(form, "id") || null;
  if (id && !z.string().uuid().safeParse(id).success) return;
  const res = await saveBrand(id, str(form, "name"), session.sub);
  refreshStorefront();
  if (res !== "ok") redirect(`/${loc(form)}/admin/catalog?error=brand_${res}`);
}

export async function deleteBrandAction(form: FormData) {
  const session = await staffFor("admin");
  if (!session) return;
  const id = z.string().uuid().safeParse(str(form, "id"));
  if (!id.success) return;
  const res = await deleteBrand(id.data, session.sub);
  refreshStorefront();
  if (res === "in_use") redirect(`/${loc(form)}/admin/catalog?error=brand_in_use`);
}

export type ImportState = { report?: import("@/features/catalog/csv").ImportReport; error?: string };

/** CSV import (admin). Max 2 MB; "check only" validates without writing. */
export async function importCsvAction(_prev: ImportState, form: FormData): Promise<ImportState> {
  const session = await staffFor("admin");
  if (!session) return { error: "Нужны права администратора" };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите CSV-файл" };
  if (file.size > 2 * 1024 * 1024) return { error: "Файл больше 2 МБ — разбейте его на части" };
  if (!/\.(csv|txt)$/i.test(file.name)) return { error: "Нужен файл .csv" };
  const text = await file.text();
  const { importProductsCsv } = await import("@/features/catalog/csv");
  const report = await importProductsCsv(text, session.sub, form.get("dryRun") === "on");
  if (report.ok && !report.dryRun) refreshStorefront();
  return { report };
}
