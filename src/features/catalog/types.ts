import type { Locale } from "@/i18n/config";

export type Make = "hyundai" | "kia";
export type PartType = "original" | "aftermarket" | "used";
export type Availability = "in_stock" | "low_stock" | "out_of_stock" | "on_request";
export type FitmentStatus = "verified" | "unverified" | "not_compatible";

export type Fitment = {
  make: Make;
  model: string;
  generation?: string;
  yearFrom: number;
  yearTo: number;
  engine?: string;
  status: FitmentStatus;
};

export type Product = {
  id: string;
  slug: string;
  categorySlug: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  sku: string;
  oemNumber: string | null;
  manufacturer: string;
  vehicleMake: Make;
  partType: PartType;
  /** Price in tiyin (1/100 UZS). Integer only — never floats for money. */
  priceMinor: number;
  currency: "UZS";
  stockQuantity: number | null;
  availability: Availability;
  fitments: Fitment[];
  specs: { label: Record<Locale, string>; value: string }[];
  /** Product photo: a site path like "/products/x.webp" or an https URL; null → category icon. */
  imageUrl: string | null;
  isDemo: boolean;
  updatedAt: string; // ISO, UTC
};

export type SortKey = "relevance" | "price_asc" | "price_desc" | "newest";

export type CatalogQuery = {
  q?: string;
  make?: Make;
  model?: string;
  year?: number;
  category?: string;
  partType?: PartType;
  availability?: "in_stock";
  minPrice?: number; // UZS (whole sums)
  maxPrice?: number;
  sort?: SortKey;
  page?: number;
};

export type CatalogResult = {
  items: (Product & { matchedFitment?: Fitment })[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

/** Boundary to the data source. The demo implementation can be swapped for the DB one. */
export interface CatalogRepository {
  search(query: CatalogQuery): Promise<CatalogResult>;
  getBySlug(slug: string): Promise<Product | null>;
  getByIds(ids: string[]): Promise<Product[]>;
  findByOem(number: string): Promise<Product[]>;
  manufacturers(): Promise<string[]>;
}
