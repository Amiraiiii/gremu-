import { afterEach, describe, expect, it, vi } from "vitest";
import { listInquiries, retryFailedEmails, submitInquiry } from "@/features/inquiries/service";
import { importProductsCsv } from "@/features/catalog/csv";
import { catalog } from "@/features/catalog/repository";

const input = {
  locale: "ru" as const,
  name: "Inquiry Test",
  phone: "+998901112233",
  email: "",
  topic: "fitment" as const,
  message: "Подойдут ли колодки?",
  sku: "",
  make: "kia" as const,
  model: "Cerato",
  year: "2019",
  engine: "",
  vin: "",
};

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.MANAGER_EMAIL;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.EMAIL_API_KEY;
  delete process.env.EMAIL_FROM;
});

describe("inquiries and manager email", () => {
  it("saves the inquiry even when no email is configured", async () => {
    const res = await submitInquiry(input, "fitment_request");
    const row = (await listInquiries({ q: res.id })).rows[0];
    expect(row).toMatchObject({ id: res.id, status: "new", emailStatus: "not_configured", vehicle: "Kia Cerato 2019" });
  });

  it("keeps the inquiry when the mail provider fails, then delivers on retry", async () => {
    process.env.MANAGER_EMAIL = "manager@example.test";
    process.env.EMAIL_PROVIDER = "resend";
    process.env.EMAIL_API_KEY = "test";
    process.env.EMAIL_FROM = "gremu <noreply@example.test>";
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await submitInquiry({ ...input, topic: "general" }, "contact_form");
    expect(res.notified).toBe(false);
    let row = (await listInquiries({ q: res.id })).rows[0];
    expect(row).toMatchObject({ emailStatus: "failed", emailAttempts: 1 });
    expect(row.emailError).toContain("503");

    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    const retry = await retryFailedEmails();
    expect(retry.sent).toBeGreaterThanOrEqual(1);
    row = (await listInquiries({ q: res.id })).rows[0];
    expect(row).toMatchObject({ emailStatus: "sent", emailAttempts: 2, emailError: null });
    // the email went to the configured manager address only
    const body = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
    expect(body.to).toEqual(["manager@example.test"]);
  });
});

describe("catalog CSV import", () => {
  const header = "sku;slug;title_ru;title_uz;category;brand;vehicle_make;part_type;price_uzs;stock;availability;published;oem;description_ru;description_uz;fitments";

  it("writes nothing when any row is invalid", async () => {
    const csv = [header, "CSV-OK-1;csv-ok-1;Тест один;Test bir;filters;B;kia;original;1000;1;in_stock;yes;;;;", "CSV-BAD;Bad Slug;x;y;nope;;bmw;new;abc;;in_stock;yes;;;;"].join("\n");
    const r = await importProductsCsv(csv, "test", false);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.row === 3)).toBe(true);
    expect((await catalog.search({ q: "CSV-OK-1" })).total).toBe(0);
  });

  it("creates, then updates by SKU; only verified fitment shows as a match", async () => {
    const row = (price: number) =>
      `CSV-NEW-1;csv-new-1;Тест фильтр;Test filtr;filters;CSV Brand;kia;aftermarket;${price};5;in_stock;yes;CSV-OEM-1;;;"kia|Rio|2017|2024||verified|; kia|Rio|2011|2016||unverified|"`;
    const dry = await importProductsCsv([header, row(1000)].join("\n"), "test", true);
    expect(dry).toMatchObject({ ok: true, dryRun: true, created: 1 });
    expect((await catalog.search({ q: "CSV-NEW-1" })).total).toBe(0);

    expect(await importProductsCsv([header, row(1000)].join("\n"), "test", false)).toMatchObject({ ok: true, created: 1 });
    expect(await importProductsCsv([header, row(1200)].join("\n"), "test", false)).toMatchObject({ ok: true, updated: 1, created: 0 });
    const p = (await catalog.findByOem("CSV-OEM-1"))[0];
    expect(p.priceMinor).toBe(120_000);
    expect(p.fitments).toHaveLength(2);

    const verified = await catalog.search({ make: "kia", model: "Rio", year: 2020, q: "CSV-NEW-1" });
    expect(verified.items[0]?.matchedFitment?.status).toBe("verified");
    const unverified = await catalog.search({ make: "kia", model: "Rio", year: 2012, q: "CSV-NEW-1" });
    expect(unverified.items[0]?.matchedFitment?.status).toBe("unverified");
  });
});
