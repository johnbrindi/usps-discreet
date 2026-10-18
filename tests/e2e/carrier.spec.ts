import { expect, test } from "@playwright/test";

/** Runs against tests/e2e/mock-carrier.mjs (USPS API stand-in) — see playwright.config.ts. */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const CRON = "e2e-cron-secret-0123456789abcdefghijklmnop";

// Unique per run; the fixed "7" suffix keeps it clear of the mock's "ends in 0000 = not found" rule.
const uspsNumber = () => `9400${String(Date.now()).padStart(17, "1")}7`;

test.describe("carrier tracking", () => {
  test("a public lookup of a USPS number shows live carrier data", async ({ page }) => {
    const tn = uspsNumber();
    await page.goto(`/track/${tn}`);
    await expect(page.getByText("Live tracking from")).toBeVisible();
    await expect(page.getByText("USPS", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Arrived at USPS Regional Facility")).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: "Austin TX Distribution Center" })).toBeVisible();
    // Carrier facility names are placed on the route map too.
    await expect(page.getByRole("figure").getByText("Austin TX Distribution Center")).toBeVisible();
    await expect(page.getByText("Source: USPS (carrier estimate)")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/9400/);
  });

  test("a number the carrier rejects shows not found", async ({ page }) => {
    await page.goto("/track/9400111111111111110000");
    await expect(page.getByRole("heading", { name: /couldn.t find that tracking number/ })).toBeVisible();
  });

  test("the cron endpoint requires its secret", async ({ request }) => {
    expect((await request.get("/api/cron/sync-shipments")).status()).toBe(401);
    const ok = await request.get("/api/cron/sync-shipments", { headers: { authorization: `Bearer ${CRON}` } });
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toHaveProperty("processed");
  });

  test.describe("admin", () => {
    test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");

    test("staff create a carrier-tracked shipment and sync it", async ({ page }) => {
      const tn = uspsNumber();
      await page.goto("/admin/login");
      await page.getByLabel("Email").fill(email!);
      await page.getByLabel("Password").fill(password!);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

      await page.goto("/admin/shipments/new");
      await page.getByLabel(/Live from carrier API/).check();
      await page.getByLabel("Carrier tracking number").fill(tn);
      await expect(page.getByText("Configured: USPS.")).toBeVisible();
      await page.getByLabel("Recipient name (private)").fill("Private Person");
      await page.getByRole("button", { name: "Create shipment" }).click();

      await expect(page.getByRole("heading", { name: "Carrier sync" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Record a tracking event" })).toHaveCount(0);
      await expect(page.getByText("Your item is out for delivery")).toBeVisible();
      await expect(page.getByRole("cell", { name: "create" })).toBeVisible();

      await page.getByRole("button", { name: "Sync now" }).click();
      await expect(page.getByText("Synced. 0 new events.")).toBeVisible();
      await expect(page.getByRole("cell", { name: "manual" })).toBeVisible();

      await page.goto(`/track/${tn}`);
      await expect(page.getByText("Shipping Label Created, USPS Awaiting Item")).toBeVisible();
      await expect(page.getByText("Private Person")).toHaveCount(0);
    });
  });
});
