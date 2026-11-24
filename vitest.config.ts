import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit + integration tests. Integration tests run against a throwaway in-memory PostgreSQL
 * (PGlite, "memory://") with the real migrations and the DEMO catalog seed — no external services.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    pool: "forks", // each file gets its own process → its own in-memory database
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
