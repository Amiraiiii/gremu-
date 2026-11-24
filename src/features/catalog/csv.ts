import "server-only";
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { productSchema, type ProductInput } from "./admin";
import { ensureCatalogSeeded, loadProducts } from "./repository";

/**
 * Catalog CSV. One row per product, keyed by SKU (existing SKU → update, new SKU → create).
 * Fitments live in one cell: "make|model|year_from|year_to|engine|status|generation" rows
 * separated by ";" — e.g. "kia|Cerato|2018|2023|2.0|verified|BD; kia|K3|2019|2023||unverified|".
 * Import is all-or-nothing: every row is validated first; any error → nothing is written.
 */
export const COLUMNS = [
  "sku",
  "slug",
  "title_ru",
  "title_uz",
  "category",
  "brand",
  "vehicle_make",
  "part_type",
  "price_uzs",
  "stock",
  "availability",
  "published",
  "oem",
  "description_ru",
  "description_uz",
  "fitments",
  "image",
] as const;
const REQUIRED = ["sku", "slug", "title_ru", "title_uz", "category", "vehicle_make", "part_type", "price_uzs", "availability"] as const;
export const MAX_ROWS = 5000;

// ---------- parsing (RFC 4180, "," or ";" delimiter, optional UTF-8 BOM)
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Quote a cell; text that a spreadsheet could run as a formula gets a leading apostrophe. */
function cell(v: unknown, isText = true): string {
  let s = v == null ? "" : String(v);
  if (isText && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const fitmentsToCell = (fs: { make: string; model: string; yearFrom: number; yearTo: number; engine?: string; status: string; generation?: string }[]) =>
  fs.map((f) => [f.make, f.model, f.yearFrom, f.yearTo, f.engine ?? "", f.status, f.generation ?? ""].join("|")).join("; ");

export async function exportProductsCsv(): Promise<string> {
  await ensureCatalogSeeded();
  const db = await getDb();
  const products = await loadProducts({ all: true });
  const pub = new Map((await db.select({ id: schema.products.id, p: schema.products.isPublished }).from(schema.products)).map((r) => [r.id, r.p]));
  const lines = [COLUMNS.join(";")];
  for (const p of products) {
    lines.push(
      [
        cell(p.sku),
        cell(p.slug),
        cell(p.title.ru),
        cell(p.title.uz),
        cell(p.categorySlug),
        cell(p.manufacturer === "—" ? "" : p.manufacturer),
        cell(p.vehicleMake),
        cell(p.partType),
        cell(Math.round(p.priceMinor / 100), false),
        cell(p.stockQuantity ?? "", false),
        cell(p.availability),
        cell(pub.get(p.id) ? "yes" : "no"),
        cell(p.oemNumber ?? ""),
        cell(p.description.ru),
        cell(p.description.uz),
        cell(fitmentsToCell(p.fitments)),
        cell(p.imageUrl ?? ""),
      ].join(";"),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

// ---------- import
export type ImportError = { row: number; field: string; message: string };
export type ImportReport = { ok: boolean; dryRun: boolean; rows: number; created: number; updated: number; errors: ImportError[] };

const MSG: Record<string, string> = {
  slug: "slug: латиница, цифры и дефисы",
  sku: "артикул: латиница, цифры, дефис (2–40)",
  title: "название от 2 символов",
  price: "цена — целое число сумов ≥ 0",
  stock: "остаток — целое число ≥ 0 или пусто",
  stock_zero: "при остатке 0 наличие должно быть out_of_stock или on_request",
  model: "в совместимости не указана модель",
  years: "в совместимости год «по» раньше года «с»",
};

function parseFitments(raw: string) {
  if (!raw.trim()) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [make, model, yearFrom, yearTo, engine, status, generation] = s.split("|").map((x) => (x ?? "").trim());
      return { make: make?.toLowerCase(), model, yearFrom, yearTo, engine, status: status?.toLowerCase(), generation };
    });
}

export async function importProductsCsv(text: string, actor: string, dryRun: boolean): Promise<ImportReport> {
  await ensureCatalogSeeded();
  const report: ImportReport = { ok: false, dryRun, rows: 0, created: 0, updated: 0, errors: [] };
  const table = parseCsv(text);
  if (table.length < 2) {
    report.errors.push({ row: 1, field: "file", message: "Файл пустой или без строк с товарами" });
    return report;
  }
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    report.errors.push({ row: 1, field: "header", message: `Нет обязательных колонок: ${missing.join(", ")}` });
    return report;
  }
  const body = table.slice(1);
  if (body.length > MAX_ROWS) {
    report.errors.push({ row: 1, field: "file", message: `Слишком много строк: ${body.length} (максимум ${MAX_ROWS})` });
    return report;
  }
  report.rows = body.length;

  const db = await getDb();
  const cats = new Set((await db.select({ slug: schema.categories.slug }).from(schema.categories)).map((c) => c.slug));
  const parsed: { row: number; input: ProductInput }[] = [];
  const seenSku = new Map<string, number>();
  const seenSlug = new Map<string, number>();

  body.forEach((cells, i) => {
    const rowNo = i + 2;
    if (cells.length > header.length && cells.slice(header.length).some((c) => c.trim())) {
      // Usually an unquoted cell containing the delimiter (e.g. several fitments split by ";").
      report.errors.push({
        row: rowNo,
        field: "row",
        message: `лишние колонки (${cells.length} вместо ${header.length}) — ячейку с «;» нужно взять в кавычки`,
      });
      return;
    }
    const get = (c: string) => {
      const v = (cells[header.indexOf(c)] ?? "").trim();
      return v.startsWith("'") && /^'[=+\-@]/.test(v) ? v.slice(1) : v; // undo our own export escaping
    };
    const pub = get("published").toLowerCase();
    const result = productSchema.safeParse({
      slug: get("slug"),
      sku: get("sku"),
      oemNumber: get("oem"),
      categorySlug: get("category"),
      brand: get("brand"),
      vehicleMake: get("vehicle_make").toLowerCase(),
      partType: get("part_type").toLowerCase(),
      titleRu: get("title_ru"),
      titleUz: get("title_uz"),
      descriptionRu: get("description_ru"),
      descriptionUz: get("description_uz"),
      priceUzs: get("price_uzs").replace(/\s/g, ""),
      stockQuantity: get("stock").replace(/\s/g, ""),
      availability: get("availability").toLowerCase(),
      isPublished: ["yes", "да", "1", "true", "ha"].includes(pub),
      imageUrl: header.includes("image") ? get("image") : "",
      specs: [],
      fitments: parseFitments(get("fitments")),
    });
    if (!result.success) {
      for (const iss of result.error.issues.slice(0, 5)) {
        const field = iss.path.join(".") || "row";
        report.errors.push({ row: rowNo, field, message: MSG[iss.message] ?? (iss.code === "invalid_value" ? `недопустимое значение` : iss.message) });
      }
      return;
    }
    const v = result.data;
    if (!cats.has(v.categorySlug)) report.errors.push({ row: rowNo, field: "category", message: `нет категории «${v.categorySlug}»` });
    if (seenSku.has(v.sku)) report.errors.push({ row: rowNo, field: "sku", message: `артикул повторяется (строка ${seenSku.get(v.sku)})` });
    if (seenSlug.has(v.slug)) report.errors.push({ row: rowNo, field: "slug", message: `slug повторяется (строка ${seenSlug.get(v.slug)})` });
    seenSku.set(v.sku, rowNo);
    seenSlug.set(v.slug, rowNo);
    parsed.push({ row: rowNo, input: v });
  });

  // A slug already used by a different SKU in the DB would break on write — report it now.
  const slugs = parsed.map((p) => p.input.slug);
  const existingBySlug = slugs.length
    ? await db.select({ slug: schema.products.slug, sku: schema.products.sku }).from(schema.products).where(inArray(schema.products.slug, slugs))
    : [];
  for (const e of existingBySlug) {
    const p = parsed.find((x) => x.input.slug === e.slug);
    if (p && p.input.sku !== e.sku) report.errors.push({ row: p.row, field: "slug", message: `slug уже занят товаром ${e.sku}` });
  }

  const skus = parsed.map((p) => p.input.sku);
  const existing = new Map(
    (skus.length ? await db.select({ id: schema.products.id, sku: schema.products.sku }).from(schema.products).where(inArray(schema.products.sku, skus)) : []).map(
      (r) => [r.sku, r.id],
    ),
  );
  report.created = parsed.filter((p) => !existing.has(p.input.sku)).length;
  report.updated = parsed.length - report.created;
  report.errors.sort((a, b) => a.row - b.row);
  if (report.errors.length || dryRun) {
    report.ok = !report.errors.length;
    return report;
  }

  await db.transaction(async (tx) => {
    const brandNames = [...new Set(parsed.map((p) => p.input.brand).filter(Boolean))] as string[];
    if (brandNames.length) await tx.insert(schema.brands).values(brandNames.map((name) => ({ name }))).onConflictDoNothing();
    const brandId = new Map((await tx.select().from(schema.brands)).map((b) => [b.name.toLowerCase(), b.id]));

    for (const { input: v } of parsed) {
      const values = {
        slug: v.slug,
        sku: v.sku,
        oemNumber: v.oemNumber,
        categorySlug: v.categorySlug,
        brandId: v.brand ? (brandId.get(v.brand.toLowerCase()) ?? null) : null,
        vehicleMake: v.vehicleMake,
        partType: v.partType,
        titleRu: v.titleRu,
        titleUz: v.titleUz,
        descriptionRu: v.descriptionRu,
        descriptionUz: v.descriptionUz,
        priceMinor: v.priceUzs * 100,
        stockQuantity: v.stockQuantity,
        availability: v.availability,
        isPublished: v.isPublished,
        ...(header.includes("image") ? { imageUrl: v.imageUrl } : {}),
        updatedAt: new Date(),
      };
      let id = existing.get(v.sku);
      if (id) await tx.update(schema.products).set(values).where(eq(schema.products.id, id));
      else {
        id = `p-${randomBytes(6).toString("hex")}`;
        await tx.insert(schema.products).values({ id, ...values, specs: [] });
      }
      await tx.delete(schema.productFitments).where(eq(schema.productFitments.productId, id));
      if (v.fitments.length) {
        await tx
          .insert(schema.productFitments)
          .values(v.fitments.map((f) => ({ ...f, productId: id!, verifiedBy: f.status === "verified" ? `${actor} (CSV)` : null })));
      }
    }
    await tx.insert(schema.auditLog).values({
      actor,
      action: "catalog.csv_import",
      entityType: "product",
      entityId: null,
      metadata: JSON.stringify({ rows: parsed.length, created: report.created, updated: report.updated }),
    });
  });
  report.ok = true;
  return report;
}
