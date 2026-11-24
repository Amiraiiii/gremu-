/**
 * Apply database migrations once (production deploys run this before `next build`).
 *   npm run db:migrate
 * Uses DATABASE_URL; without it, the embedded PGlite in .data/pglite.
 */
process.env.DB_AUTO_MIGRATE = "1";

async function main() {
  const { getDb } = await import("../src/lib/db");
  await getDb();
  console.log(`Migrations applied (${process.env.DATABASE_URL ? "PostgreSQL" : "PGlite"}).`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", (e as Error).message);
  process.exit(1);
});
