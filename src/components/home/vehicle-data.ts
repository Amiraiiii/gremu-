// DEMO: model list for the selector until the catalog/fitment API is connected
// (GET /api/catalog/fitment/options). Model names only — no fitment claims are derived from it.
export const DEMO_MODELS = {
  hyundai: ["Accent", "Elantra", "Sonata", "Tucson", "Santa Fe", "Creta", "Palisade", "Staria"],
  kia: ["Rio", "Cerato", "K5", "Sportage", "Sorento", "Seltos", "Carnival", "Sonet"],
} as const;

export type Make = keyof typeof DEMO_MODELS;

export const YEARS = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => 2026 - i);
