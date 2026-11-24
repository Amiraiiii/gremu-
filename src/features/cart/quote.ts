import "server-only";
import { z } from "zod";
import { catalog } from "@/features/catalog/repository";
import type { Availability } from "@/features/catalog/types";

export const MAX_QTY = 99;

export const quoteRequestSchema = z.object({
  locale: z.enum(["ru", "uz"]),
  items: z
    .array(z.object({ id: z.string().min(1).max(64), qty: z.number().int().min(1).max(MAX_QTY) }))
    .max(50),
});

export type QuoteLine = {
  id: string;
  slug: string;
  title: string;
  sku: string;
  categorySlug: string;
  unitPriceMinor: number;
  qty: number;
  lineTotalMinor: number;
  availability: Availability;
  stockQuantity: number | null;
  purchasable: boolean;
  imageUrl: string | null;
  isDemo: boolean;
  /** Set when the requested quantity had to be reduced to what is in stock */
  adjustedFrom?: number;
};

export type Quote = {
  lines: QuoteLine[];
  missing: string[]; // ids no longer in the catalog
  subtotalMinor: number;
  currency: "UZS";
  computedAt: string;
};

/**
 * Prices and stock come from the catalog on the server — never from the client.
 * Integer arithmetic in tiyin only.
 */
export async function buildQuote(input: z.infer<typeof quoteRequestSchema>): Promise<Quote> {
  // Merge duplicate ids from a tampered cart
  const wanted = new Map<string, number>();
  for (const it of input.items) wanted.set(it.id, Math.min((wanted.get(it.id) ?? 0) + it.qty, MAX_QTY));

  const products = await catalog.getByIds([...wanted.keys()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: QuoteLine[] = [];
  const missing: string[] = [];

  for (const [id, requested] of wanted) {
    const p = byId.get(id);
    if (!p) {
      missing.push(id);
      continue;
    }
    const purchasable = p.availability !== "out_of_stock";
    let qty = requested;
    let adjustedFrom: number | undefined;
    if (purchasable && p.stockQuantity != null && p.availability !== "on_request" && qty > p.stockQuantity) {
      adjustedFrom = qty;
      qty = Math.max(p.stockQuantity, 0);
    }
    const lineTotal = purchasable ? p.priceMinor * qty : 0;
    lines.push({
      id: p.id,
      slug: p.slug,
      title: p.title[input.locale],
      sku: p.sku,
      categorySlug: p.categorySlug,
      unitPriceMinor: p.priceMinor,
      qty,
      lineTotalMinor: lineTotal,
      availability: p.availability,
      stockQuantity: p.stockQuantity,
      purchasable,
      imageUrl: p.imageUrl,
      isDemo: p.isDemo,
      adjustedFrom,
    });
  }

  const subtotalMinor = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
  return { lines, missing, subtotalMinor, currency: "UZS", computedAt: new Date().toISOString() };
}
