import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke tests against a running site (default http://localhost:3000 — start it with
 * `npm run dev` or `npm run build && npm start`). Uses the installed Google Chrome, so no
 * browser download is needed. They create real test orders/inquiries in that site's database.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "chrome",
    locale: "ru-RU",
    navigationTimeout: 90_000,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
});
