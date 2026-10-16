import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;
// Uses a locally installed Chromium/Chrome instead of downloading browsers.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/usr/bin/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // The database may be far from the test machine; allow for round-trip latency.
  expect: { timeout: 15_000 },
  timeout: 90_000,
  use: { baseURL, trace: "retain-on-failure", launchOptions: { executablePath } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      // Local stand-in for the USPS API so carrier sync is tested end to end without real credentials.
      command: "node tests/e2e/mock-carrier.mjs",
      url: "http://127.0.0.1:4010/health",
      reuseExistingServer: false,
      timeout: 10_000,
    },
    {
      command: `npx next start -p ${PORT}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        BETTER_AUTH_URL: baseURL,
        NEXT_PUBLIC_SITE_URL: baseURL,
        ENABLE_DEMO_DATA: "true",
        USPS_CLIENT_ID: "e2e",
        USPS_CLIENT_SECRET: "e2e",
        USPS_API_BASE: "http://127.0.0.1:4010",
        // Real keys from .env must never be used by tests: they spend live quota.
        DHL_API_KEY: "",
        SHIP24_API_KEY: "",
        TRACKINGMORE_API_KEY: "",
        PUBLIC_CARRIER_LOOKUP: "true",
        CRON_SECRET: "e2e-cron-secret-0123456789abcdefghijklmnop",
      },
    },
  ],
});
