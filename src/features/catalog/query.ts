import type { CatalogQuery, Make, PartType, SortKey } from "./types";

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const int = (v: string | undefined, min: number, max: number) => {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};

const MAKES: Make[] = ["hyundai", "kia"];
const TYPES: PartType[] = ["original", "aftermarket", "used"];
const SORTS: SortKey[] = ["relevance", "price_asc", "price_desc", "newest"];

/** Parse and validate URL search params at the boundary — unknown values are dropped. */
export function parseCatalogQuery(sp: Params): CatalogQuery {
  const make = one(sp.make)?.toLowerCase() as Make | undefined;
  const partType = one(sp.type) as PartType | undefined;
  const sort = one(sp.sort) as SortKey | undefined;
  const q = one(sp.q)?.slice(0, 80);
  return {
    q,
    make: make && MAKES.includes(make) ? make : undefined,
    model: one(sp.model)?.slice(0, 40),
    year: int(one(sp.year), 1990, 2100),
    category: one(sp.category)?.slice(0, 40),
    partType: partType && TYPES.includes(partType) ? partType : undefined,
    availability: one(sp.stock) === "1" ? "in_stock" : undefined,
    minPrice: int(one(sp.min), 0, 1_000_000_000),
    maxPrice: int(one(sp.max), 0, 1_000_000_000),
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: int(one(sp.page), 1, 10_000),
  };
}

export function toSearchParams(q: CatalogQuery, override: Partial<Record<string, string | undefined>> = {}) {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => v != null && v !== "" && p.set(k, String(v));
  set("q", q.q);
  set("make", q.make);
  set("model", q.model);
  set("year", q.year);
  set("category", q.category);
  set("type", q.partType);
  if (q.availability) p.set("stock", "1");
  set("min", q.minPrice);
  set("max", q.maxPrice);
  set("sort", q.sort);
  set("page", q.page && q.page > 1 ? q.page : undefined);
  for (const [k, v] of Object.entries(override)) {
    if (v == null || v === "") p.delete(k);
    else p.set(k, v);
  }
  return p.toString();
}
