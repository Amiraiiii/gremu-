import { describe, expect, it } from "vitest";
import { searchProducts } from "@/features/catalog/repository";
import { DEMO_PRODUCTS } from "@/features/catalog/demo-data";
import { parseCsv } from "@/features/catalog/csv";
import { vehicleLine } from "@/features/inquiries/schema";
import { formatUZS } from "@/lib/format";
import { TRANSITIONS, ORDER_STATUSES } from "@/features/orders/admin";

describe("catalog search and fitment", () => {
  it("finds a product by exact OEM number first", () => {
    const p = DEMO_PRODUCTS.find((x) => x.oemNumber)!;
    const res = searchProducts(DEMO_PRODUCTS, { q: p.oemNumber!.toLowerCase().replace(/-/g, " ") });
    expect(res.items[0].id).toBe(p.id);
  });

  it("vehicle filter never returns not_compatible fitments", () => {
    // DEMO: Elantra brake disc is verified for 2016–2020 and not_compatible for 2021–2025.
    const fits2018 = searchProducts(DEMO_PRODUCTS, { make: "hyundai", model: "Elantra", year: 2018 });
    const fits2023 = searchProducts(DEMO_PRODUCTS, { make: "hyundai", model: "Elantra", year: 2023 });
    expect(fits2018.items.some((p) => p.slug === "front-brake-disc-hyundai-elantra")).toBe(true);
    expect(fits2023.items.some((p) => p.slug === "front-brake-disc-hyundai-elantra")).toBe(false);
    for (const item of fits2018.items) expect(item.matchedFitment?.status).not.toBe("not_compatible");
  });

  it("sorts by price and paginates", () => {
    const asc = searchProducts(DEMO_PRODUCTS, { sort: "price_asc" });
    const prices = asc.items.map((p) => p.priceMinor);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
    expect(asc.pageSize).toBe(12);
    expect(searchProducts(DEMO_PRODUCTS, { page: 99 }).page).toBe(asc.pageCount);
  });
});

describe("CSV parsing", () => {
  it("handles quotes, escaped quotes, ; delimiter and BOM", () => {
    const rows = parseCsv('﻿sku;title\r\nA-1;"Фильтр; ""масляный"""\r\n\r\nB-2;x\n');
    expect(rows).toEqual([
      ["sku", "title"],
      ["A-1", 'Фильтр; "масляный"'],
      ["B-2", "x"],
    ]);
  });
  it("detects a comma delimiter", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("money and text formatting", () => {
  it("formats tiyin as whole sums", () => {
    expect(formatUZS(42_000_000, "ru").replace(/\s/g, " ")).toBe("420 000 сум");
    expect(formatUZS(150, "uz")).toMatch(/^2 soʻm$/); // 1.5 sum rounds to 2
  });
  it("builds the vehicle line for the manager", () => {
    expect(vehicleLine({ make: "kia", model: "Cerato", year: "2019", engine: "2.0", vin: "KNAF341BBK5123456" })).toBe("Kia Cerato 2019, 2.0, VIN KNAF341BBK5123456");
    expect(vehicleLine({ make: "", model: "", year: "", engine: "", vin: "" })).toBeNull();
  });
});

describe("order status machine", () => {
  it("terminal states cannot change and every target is a known status", () => {
    expect(TRANSITIONS.completed).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
    for (const targets of Object.values(TRANSITIONS)) for (const t of targets) expect(ORDER_STATUSES).toContain(t);
  });
  it("a shipped order can no longer be cancelled", () => {
    expect(TRANSITIONS.shipped).not.toContain("cancelled");
  });
});
