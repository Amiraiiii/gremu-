import "server-only";
import { catalog } from "@/features/catalog/repository";
import type { Make, Product } from "@/features/catalog/types";
import { getInfoPage, INFO_SLUGS } from "@/content/info-pages";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

/**
 * The assistant's ONLY capabilities: read-only lookups in the site catalog and knowledge base.
 * There is no tool that changes prices, stock, orders or payments — the model cannot do it
 * even if a user (or text inside the data) asks it to.
 */
export type CardProduct = { sku: string; title: string; url: string; priceMinor: number; availability: string; isDemo: boolean };

type Args = Record<string, unknown>;
const s = (v: unknown, max = 80) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const make = (v: unknown): Make | undefined => (v === "hyundai" || v === "kia" ? v : undefined);
const year = (v: unknown) => {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n >= 1990 && n <= 2100 ? n : undefined;
};

function fitmentVerdict(p: Product, q: { make?: Make; model?: string; year?: number; engine?: string }) {
  if (!q.model || !q.year) return "need_vehicle";
  const rows = p.fitments.filter(
    (f) => (!q.make || f.make === q.make) && f.model.toLowerCase() === q.model!.toLowerCase() && q.year! >= f.yearFrom && q.year! <= f.yearTo,
  );
  const byEngine = q.engine ? rows.filter((f) => !f.engine || q.engine!.includes(f.engine)) : rows;
  if (byEngine.some((f) => f.status === "verified")) return "verified";
  if (byEngine.some((f) => f.status === "not_compatible")) return "not_compatible";
  if (byEngine.some((f) => f.status === "unverified")) return "unverified_ask_manager";
  return "no_data_ask_manager";
}

function brief(p: Product, locale: Locale) {
  return {
    sku: p.sku,
    oem: p.oemNumber,
    title: p.title[locale],
    manufacturer: p.manufacturer,
    condition: p.partType, // original | aftermarket | used
    price_uzs: Math.round(p.priceMinor / 100),
    availability: p.availability, // in_stock | low_stock | out_of_stock | on_request
    url: `/${locale}/products/${p.slug}`,
    is_demo: p.isDemo,
  };
}

export function toCard(p: Product, locale: Locale): CardProduct {
  return { sku: p.sku, title: p.title[locale], url: `/${locale}/products/${p.slug}`, priceMinor: p.priceMinor, availability: p.availability, isDemo: p.isDemo };
}

export const TOOL_DECLARATIONS = [
  {
    name: "search_catalog",
    description:
      "Search the gremu catalog by part name, SKU or OEM number, optionally for a vehicle. Returns at most 6 products with price, availability and the fitment verdict for that vehicle.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Part name, SKU or OEM number. May be empty when searching by vehicle only." },
        make: { type: "string", enum: ["hyundai", "kia"] },
        model: { type: "string", description: "Model, e.g. Sportage, Elantra" },
        year: { type: "integer" },
        engine: { type: "string", description: "Engine, e.g. 1.6 or 2.0" },
      },
    },
  },
  {
    name: "get_product",
    description: "Full details of one product by SKU or OEM number, including every fitment row with its status.",
    parameters: { type: "object", properties: { sku_or_oem: { type: "string" } }, required: ["sku_or_oem"] },
  },
  {
    name: "search_knowledge",
    description: "Search the site's FAQ and info pages (delivery, payment, returns). Sections marked pending=true are NOT confirmed by the shop.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
] as const;

async function findOne(code: string) {
  const byOem = await catalog.findByOem(code);
  if (byOem.length) return byOem[0];
  const res = await catalog.search({ q: code });
  return res.items.find((p) => p.sku.toLowerCase() === code.toLowerCase()) ?? null;
}

export async function runTool(name: string, args: Args, locale: Locale): Promise<{ result: unknown; cards: CardProduct[] }> {
  if (name === "search_catalog") {
    const q = { make: make(args.make), model: s(args.model, 40) || undefined, year: year(args.year), engine: s(args.engine, 20) || undefined };
    const res = await catalog.search({ q: s(args.query) || undefined, make: q.make, model: q.model, year: q.year });
    const items = res.items.slice(0, 6);
    return {
      result: { total_found: res.total, products: items.map((p) => ({ ...brief(p, locale), fitment_for_vehicle: fitmentVerdict(p, q) })) },
      cards: items.map((p) => toCard(p, locale)),
    };
  }

  if (name === "get_product") {
    const p = await findOne(s(args.sku_or_oem, 40));
    if (!p) return { result: { found: false }, cards: [] };
    return {
      result: {
        found: true,
        ...brief(p, locale),
        stock_quantity: p.stockQuantity,
        fitments: p.fitments.map((f) => ({ make: f.make, model: f.model, years: `${f.yearFrom}-${f.yearTo}`, engine: f.engine ?? null, status: f.status })),
      },
      cards: [toCard(p, locale)],
    };
  }

  if (name === "search_knowledge") {
    const words = s(args.query, 120).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const docs: { source: string; title: string; text: string; pending: boolean }[] = [];
    for (const slug of INFO_SLUGS) {
      const page = getInfoPage(locale, slug);
      for (const sec of page.sections) docs.push({ source: `/${locale}/${slug}`, title: sec.heading, text: sec.body.join(" "), pending: Boolean(sec.pending) });
    }
    for (const item of getDictionary(locale).faq.items) docs.push({ source: `/${locale}/faq`, title: item.q, text: item.a, pending: false });
    const scored = docs
      .map((d) => ({ d, score: words.reduce((n, w) => (`${d.title} ${d.text}`.toLowerCase().includes(w) ? n + 1 : n), 0) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.d);
    return { result: { matches: scored }, cards: [] };
  }

  return { result: { error: "unknown_tool" }, cards: [] };
}
