import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/**
 * One database interface, two drivers:
 * - DATABASE_URL set → real PostgreSQL via postgres-js (staging / production).
 * - no DATABASE_URL  → PGlite, an embedded PostgreSQL stored in `.data/pglite` (local dev only).
 * Migrations from `./drizzle` run before the first query (and again in dev when new ones appear).
 *
 * Only the raw connection is cached on globalThis (it must survive dev hot reloads); the Drizzle
 * wrapper is rebuilt per module evaluation so it always knows the current schema.
 */
type PgClient = { kind: "pg"; client: ReturnType<typeof import("postgres").default> };
type LiteClient = { kind: "lite"; client: import("@electric-sql/pglite").PGlite };
type Client = PgClient | LiteClient;

async function makeDb(c: Client) {
  if (c.kind === "pg") {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    return drizzle(c.client, { schema });
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  return drizzle(c.client, { schema }) as unknown as ReturnType<typeof import("drizzle-orm/postgres-js").drizzle<typeof schema>>;
}
type Db = Awaited<ReturnType<typeof makeDb>>;

const migrationsFolder = () => path.join(process.cwd(), "drizzle");

async function migrate(db: Db, c: Client) {
  if (c.kind === "pg") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, { migrationsFolder: migrationsFolder() });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: migrationsFolder() });
  }
}

async function connect(): Promise<Client> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const { default: postgres } = await import("postgres");
    return { kind: "pg", client: postgres(url, { max: 10, prepare: false }) };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  // PGLITE_DATA_DIR lets tests use "memory://" (a throwaway in-memory database).
  const dir = process.env.PGLITE_DATA_DIR?.trim() || path.join(process.cwd(), ".data", "pglite");
  return { kind: "lite", client: new PGlite(dir) };
}

/** Number of migrations in ./drizzle — compared in development to notice new ones. */
function migrationCount(): number {
  try {
    const journal = JSON.parse(readFileSync(path.join(migrationsFolder(), "meta", "_journal.json"), "utf8"));
    return Array.isArray(journal.entries) ? journal.entries.length : 0;
  } catch {
    return 0;
  }
}

const g = globalThis as unknown as {
  __gremuClient?: Promise<Client>;
  __gremuMigrated?: number;
  __gremuMigrating?: Promise<void>;
  /** Pre-stage-10 cache key: a Drizzle instance. Reused so one process never opens PGlite twice. */
  __gremuDb?: Promise<{ $client: unknown }>;
};
let local: { client: Client; db: Db } | undefined;

export async function getDb(): Promise<Db> {
  if (!g.__gremuClient && g.__gremuDb) {
    const kind = process.env.DATABASE_URL?.trim() ? "pg" : "lite";
    g.__gremuClient = g.__gremuDb.then((d) => ({ kind, client: d.$client }) as Client);
  }
  if (!g.__gremuClient) {
    g.__gremuClient = connect().catch((e) => {
      g.__gremuClient = undefined;
      throw e;
    });
  }
  const client = await g.__gremuClient;
  if (!local || local.client !== client) local = { client, db: await makeDb(client) };
  const db = local.db;

  const target = process.env.NODE_ENV === "production" ? -1 : migrationCount();
  if (g.__gremuMigrated === undefined || (target !== -1 && target !== g.__gremuMigrated)) {
    g.__gremuMigrating ??= migrate(db, client)
      .then(() => void (g.__gremuMigrated = target))
      .finally(() => (g.__gremuMigrating = undefined));
    await g.__gremuMigrating;
  }
  return db;
}

export { schema };
