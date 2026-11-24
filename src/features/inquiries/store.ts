import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDb, schema } from "@/lib/db";
import type { Inquiry } from "./schema";

/**
 * Inquiries live in the database (`inquiries` table). Before stage 9 they were appended to
 * `.data/inquiries.json` in mock mode; that file is imported once on first use and renamed
 * to `.data/inquiries.imported.json`, so no earlier request is lost.
 */
const LEGACY = path.join(process.cwd(), ".data", "inquiries.json");
const g = globalThis as unknown as { __gremuInqImport?: Promise<void> };

async function importLegacyFile() {
  let rows: Inquiry[];
  try {
    rows = JSON.parse(await fs.readFile(LEGACY, "utf8")) as Inquiry[];
  } catch {
    return; // no legacy file
  }
  const db = await getDb();
  if (rows.length) {
    await db
      .insert(schema.inquiries)
      .values(
        rows.map((r) => ({
          id: r.id,
          status: r.status ?? "new",
          source: r.source,
          topic: r.topic,
          name: r.name,
          phone: r.phone,
          email: r.email,
          message: r.message,
          sku: r.sku,
          vehicle: r.vehicle ?? null,
          locale: r.locale,
          emailStatus: r.emailStatus,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.createdAt),
        })),
      )
      .onConflictDoNothing();
  }
  await fs.rename(LEGACY, LEGACY.replace(/\.json$/, ".imported.json"));
  console.info(`[inquiries] imported ${rows.length} inquiries from the legacy JSON file`);
}

/** Await before reading or writing inquiries. Runs the one-time import at most once per process. */
export function ensureInquiriesReady(): Promise<void> {
  g.__gremuInqImport ??= importLegacyFile().catch((e) => {
    g.__gremuInqImport = undefined;
    console.error("[inquiries] legacy import failed", (e as Error).message);
  });
  return g.__gremuInqImport;
}
