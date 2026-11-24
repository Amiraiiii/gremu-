/**
 * Catalog CSV import from the console — the same importer, validation and audit log as
 * "Админка → Товары → Импорт CSV", for whoever has shell access to the server.
 *
 *   npm run catalog:import -- data/import/file.csv            # import (all-or-nothing)
 *   npm run catalog:import -- data/import/file.csv --dry-run  # validate only
 *   npm run catalog:import -- data/import/file.csv --hide-demo  # import, then unpublish DEMO products
 *
 * With the embedded dev database (no DATABASE_URL), stop `npm run dev` first: PGlite allows
 * one process at a time. With DATABASE_URL it can run while the site is up.
 */
import { readFileSync } from "node:fs";
import { importProductsCsv } from "../src/features/catalog/csv";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  if (!file) {
    console.error("Usage: npm run catalog:import -- <file.csv> [--dry-run]");
    process.exit(2);
  }
  const actor = `cli:${process.env.USERNAME ?? process.env.USER ?? "console"}`;
  const report = await importProductsCsv(readFileSync(file, "utf8"), actor, dryRun);
  if (report.ok && !dryRun && args.includes("--hide-demo")) {
    // Once the real catalog is in, the DEMO placeholders are unpublished (kept, can be re-enabled in admin).
    const { getDb, schema } = await import("../src/lib/db");
    const { eq } = await import("drizzle-orm");
    const db = await getDb();
    const hidden = await db
      .update(schema.products)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(schema.products.isDemo, true))
      .returning({ sku: schema.products.sku });
    await db.insert(schema.auditLog).values({ actor, action: "catalog.hide_demo", entityType: "product", entityId: null, metadata: JSON.stringify({ hidden: hidden.length }) });
    console.log(`Демо-товары скрыты: ${hidden.length}.`);
  }
  console.log(
    `${report.ok ? (dryRun ? "Проверка пройдена" : "Импорт выполнен") : "Есть ошибки — ничего не записано"}. ` +
      `Строк: ${report.rows}, новых: ${report.created}, обновлено: ${report.updated}.`,
  );
  for (const e of report.errors.slice(0, 200)) console.log(`  строка ${e.row}, ${e.field}: ${e.message}`);
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Import failed:", (e as Error).message);
  process.exit(1);
});
