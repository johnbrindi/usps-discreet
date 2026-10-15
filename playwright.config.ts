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
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { BETTER_AUTH_URL: baseURL, NEXT_PUBLIC_SITE_URL: baseURL, ENABLE_DEMO_DATA: "true" },
  },
});
