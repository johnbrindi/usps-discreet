import { expect, test } from "@playwright/test";

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin authorization", () => {
  for (const path of ["/admin", "/admin/shipments", "/admin/shipments/new", "/admin/messages", "/admin/inquiries"]) {
    test(`${path} redirects anonymous visitors to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL("/admin/login");
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("public sign-up is disabled", async ({ request }) => {
    const res = await request.post("/api/auth/sign-up/email", {
      headers: { origin: "http://localhost:3100" },
      data: { email: "intruder@example.test", password: "a-long-password-123", name: "x" },
    });
    expect(res.ok()).toBe(false);
  });

  test("wrong credentials are rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });
});

test.describe("admin shipment workflow", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");

  test("create shipment, record events, enforce lifecycle, reply to chat", async ({ page }) => {
    const tn = `E2E${Date.now()}`;
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

    await page.goto("/admin/shipments/new");
    await page.getByLabel(/^Tracking number/).fill(tn);
    await page.getByLabel("City (public)").fill("Hartford");
    await page.getByLabel("Recipient name (private)").fill("Private Person");
    await page.getByLabel("Estimated delivery date").fill("2026-10-30");
    await page.getByRole("button", { name: "Create shipment" }).click();
    // An estimate without a source is rejected.
    await expect(page.getByText(/Say where the estimate comes from/)).toBeVisible();
    await page.getByLabel("Source of estimate").fill("E2E service standard");
    await page.getByRole("button", { name: "Create shipment" }).click();
    await expect(page.getByText("Shipment created.")).toBeVisible();

    // Lifecycle: first event options start at label created; delivered is not offered.
    const status = page.getByLabel("Status");
    await expect(status.locator("option")).toHaveText(["Shipment information received", "Accepted", "Delivery exception"]);
    await page.getByLabel(/Date & time/).fill("2026-10-14T09:00");
    await page.getByLabel("Description (shown publicly)").fill("Label created (e2e)");
    await page.getByLabel("Time zone").fill("America/New_York");
    await page.getByRole("button", { name: "Record event" }).click();
    await expect(page.getByText("Event recorded.")).toBeVisible();
    await expect(status.locator("option")).toHaveText(["Accepted", "Delivery exception"]);

    // Future events are refused.
    await status.selectOption("ACCEPTED");
    await page.getByLabel(/Date & time/).fill("2099-01-01T09:00");
    await page.getByLabel("Description (shown publicly)").fill("Accepted (e2e)");
    await page.getByRole("button", { name: "Record event" }).click();
    await expect(page.getByText("Events can't be recorded in the future.")).toBeVisible();

    // Public view hides private fields.
    await page.goto(`/track/${tn}`);
    await expect(page.getByText("Label created (e2e)")).toBeVisible();
    await expect(page.getByText("Source: E2E service standard")).toBeVisible();
    await expect(page.getByText("Private Person")).toHaveCount(0);

    // Reply to the e2e chat conversation if one exists.
    await page.goto("/admin/messages");
    const convo = page.getByRole("link", { name: /\[e2e\]/ }).first();
    if (await convo.count()) {
      await convo.click();
      await page.getByLabel(/Reply as James/).fill("[e2e] Reply from staff.");
      await page.getByRole("button", { name: "Send reply" }).click();
      await expect(page.getByText("[e2e] Reply from staff.")).toBeVisible();
    }
  });
});
