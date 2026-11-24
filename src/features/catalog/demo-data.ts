/**
 * DEMO CATALOG — placeholder data for building the storefront before the real catalog is
 * imported. Every product is flagged `isDemo: true` and the UI labels it as demo.
 * SKUs and OEM numbers carry a DEMO prefix on purpose so they can never be mistaken for real
 * part numbers. Prices, stock and fitment are illustrative only.
 */
import type { Availability, Fitment, Make, PartType, Product } from "./types";

type Seed = {
  slug: string;
  category: string;
  ru: string;
  uz: string;
  make: Make;
  type: PartType;
  price: number; // UZS
  stock: number | null;
  availability: Availability;
  fit: Omit<Fitment, "make">[];
  specs?: [string, string, string][]; // [ru, uz, value]
};

const seeds: Seed[] = [
  { slug: "oil-filter-hyundai-accent", category: "filters", ru: "Фильтр масляный", uz: "Moy filtri", make: "hyundai", type: "original", price: 65000, stock: 24, availability: "in_stock", fit: [{ model: "Accent", yearFrom: 2017, yearTo: 2023, status: "verified" }, { model: "Creta", yearFrom: 2016, yearTo: 2021, status: "unverified" }], specs: [["Высота", "Balandlik", "— мм"], ["Резьба", "Rezba", "—"]] },
  { slug: "air-filter-kia-rio", category: "filters", ru: "Фильтр воздушный", uz: "Havo filtri", make: "kia", type: "aftermarket", price: 85000, stock: 12, availability: "in_stock", fit: [{ model: "Rio", yearFrom: 2017, yearTo: 2024, status: "verified" }] },
  { slug: "cabin-filter-hyundai-tucson", category: "filters", ru: "Фильтр салонный угольный", uz: "Salon filtri (koʻmirli)", make: "hyundai", type: "aftermarket", price: 120000, stock: 3, availability: "low_stock", fit: [{ model: "Tucson", yearFrom: 2015, yearTo: 2020, status: "verified" }, { model: "Sportage", yearFrom: 2016, yearTo: 2021, status: "unverified" }] },
  { slug: "front-brake-pads-kia-cerato", category: "brakes", ru: "Колодки тормозные передние", uz: "Old tormoz kolodkalari", make: "kia", type: "original", price: 420000, stock: 8, availability: "in_stock", fit: [{ model: "Cerato", yearFrom: 2018, yearTo: 2023, status: "verified" }] },
  { slug: "front-brake-disc-hyundai-elantra", category: "brakes", ru: "Диск тормозной передний вентилируемый", uz: "Old tormoz diski (ventilyatsiyali)", make: "hyundai", type: "aftermarket", price: 690000, stock: 4, availability: "low_stock", fit: [{ model: "Elantra", yearFrom: 2016, yearTo: 2020, status: "verified" }, { model: "Elantra", yearFrom: 2021, yearTo: 2025, status: "not_compatible" }], specs: [["Диаметр", "Diametr", "— мм"], ["Толщина", "Qalinlik", "— мм"]] },
  { slug: "rear-brake-pads-hyundai-sonata", category: "brakes", ru: "Колодки тормозные задние", uz: "Orqa tormoz kolodkalari", make: "hyundai", type: "original", price: 380000, stock: null, availability: "on_request", fit: [{ model: "Sonata", yearFrom: 2019, yearTo: 2024, status: "unverified" }] },
  { slug: "front-shock-absorber-kia-sportage", category: "suspension", ru: "Амортизатор передний", uz: "Old amortizator", make: "kia", type: "aftermarket", price: 950000, stock: 2, availability: "low_stock", fit: [{ model: "Sportage", yearFrom: 2016, yearTo: 2021, status: "verified" }] },
  { slug: "lower-control-arm-hyundai-santa-fe", category: "suspension", ru: "Рычаг передний нижний", uz: "Old pastki richag", make: "hyundai", type: "original", price: 1250000, stock: 0, availability: "out_of_stock", fit: [{ model: "Santa Fe", yearFrom: 2018, yearTo: 2023, status: "verified" }] },
  { slug: "timing-belt-kit-kia-k5", category: "engine", ru: "Комплект ремня ГРМ", uz: "GRM tasmasi toʻplami", make: "kia", type: "aftermarket", price: 1100000, stock: 5, availability: "in_stock", fit: [{ model: "K5", yearFrom: 2020, yearTo: 2025, engine: "2.0", status: "unverified" }] },
  { slug: "valve-cover-gasket-hyundai-creta", category: "engine", ru: "Прокладка клапанной крышки", uz: "Klapan qopqogʻi prokladkasi", make: "hyundai", type: "original", price: 140000, stock: 15, availability: "in_stock", fit: [{ model: "Creta", yearFrom: 2016, yearTo: 2021, engine: "1.6", status: "verified" }] },
  { slug: "headlight-left-kia-seltos", category: "body", ru: "Фара левая", uz: "Chap fara", make: "kia", type: "original", price: 3900000, stock: null, availability: "on_request", fit: [{ model: "Seltos", yearFrom: 2020, yearTo: 2024, status: "verified" }] },
  { slug: "spark-plug-hyundai-accent", category: "electrics", ru: "Свеча зажигания иридиевая", uz: "Iridiyli oʻt oldirish shami", make: "hyundai", type: "aftermarket", price: 95000, stock: 40, availability: "in_stock", fit: [{ model: "Accent", yearFrom: 2017, yearTo: 2023, engine: "1.6", status: "verified" }, { model: "Elantra", yearFrom: 2016, yearTo: 2020, engine: "1.6", status: "verified" }] },
  { slug: "radiator-kia-rio", category: "cooling", ru: "Радиатор охлаждения", uz: "Sovutish radiatori", make: "kia", type: "aftermarket", price: 1450000, stock: 1, availability: "low_stock", fit: [{ model: "Rio", yearFrom: 2017, yearTo: 2024, status: "unverified" }] },
  { slug: "clutch-kit-hyundai-accent", category: "transmission", ru: "Комплект сцепления", uz: "Ilashish toʻplami", make: "hyundai", type: "aftermarket", price: 2100000, stock: 3, availability: "in_stock", fit: [{ model: "Accent", yearFrom: 2017, yearTo: 2023, status: "verified" }] },
  { slug: "engine-oil-5w30-4l", category: "consumables", ru: "Масло моторное 5W-30, 4 л", uz: "Motor moyi 5W-30, 4 l", make: "hyundai", type: "aftermarket", price: 480000, stock: 30, availability: "in_stock", fit: [] },
  { slug: "floor-mats-kia-sportage", category: "accessories", ru: "Коврики салона, комплект", uz: "Salon gilamchalari, toʻplam", make: "kia", type: "aftermarket", price: 650000, stock: 6, availability: "in_stock", fit: [{ model: "Sportage", yearFrom: 2022, yearTo: 2025, status: "verified" }] },
];

const MANUFACTURER: Record<PartType, string> = {
  original: "Demo OEM",
  aftermarket: "Demo Aftermarket",
  used: "Demo Used",
};

export const DEMO_PRODUCTS: Product[] = seeds.map((s, i) => {
  const n = String(i + 1).padStart(3, "0");
  return {
    id: `demo-${n}`,
    slug: s.slug,
    categorySlug: s.category,
    title: { ru: s.ru, uz: s.uz },
    description: {
      ru: "Демонстрационный товар. Описание, характеристики и применимость будут загружены из каталога магазина.",
      uz: "Namoyish uchun mahsulot. Tavsif, xususiyatlar va qoʻllanilishi doʻkon katalogidan yuklanadi.",
    },
    sku: `GR-DEMO-${n}`,
    oemNumber: s.type === "original" || i % 2 === 0 ? `DEMO-${10000 + i * 137}-${n}` : null,
    manufacturer: MANUFACTURER[s.type],
    vehicleMake: s.make,
    partType: s.type,
    priceMinor: s.price * 100,
    currency: "UZS",
    stockQuantity: s.stock,
    availability: s.availability,
    fitments: s.fit.map((f) => ({ ...f, make: s.make })),
    specs: (s.specs ?? []).map(([ru, uz, value]) => ({ label: { ru, uz }, value })),
    imageUrl: null,
    isDemo: true,
    updatedAt: new Date(Date.UTC(2026, 10, 1 + i)).toISOString(),
  };
});
