import { expect, test, type Page } from "@playwright/test";

const DEMO_IN_TRANSIT = "DEMO00000000000001";
const DEMO_DELIVERED = "DEMO00000000000002";

function trackConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test.describe("public routes", () => {
  for (const [path, heading] of [
    ["/", "Where's my parcel?"],
    ["/track", "Track a parcel"],
    ["/help", "Help centre"],
    ["/contact", "Contact us"],
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms of service"],
  ] as const) {
    test(`${path} renders without console errors @mobile`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page).toHaveTitle(/usps-discreet/);
      // No horizontal overflow at this viewport.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }

  test("unknown routes return the 404 page", async ({ page }) => {
    const res = await page.goto("/does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("every internal link on public pages resolves", async ({ page, request }) => {
    const seen = new Set<string>();
    for (const path of ["/", "/help", "/contact", "/track"]) {
      await page.goto(path);
      const hrefs = await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")!.split("#")[0]!));
      hrefs.forEach((h) => seen.add(h || "/"));
    }
    for (const href of seen) {
      const res = await request.get(href);
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  test("security headers are set", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("tracking workflow", () => {
  test("validates on the client before navigating", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page.getByRole("search").getByRole("alert")).toHaveText("Enter a tracking number.");
    await page.getByLabel("Tracking number").fill("abc");
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page.getByRole("search").getByRole("alert")).toContainText("10–34 letters and digits");
    await expect(page).toHaveURL("/");
  });

  test("looks up a demo shipment and shows the ordered timeline @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Tracking number").fill("demo 0000 0000 0000 01");
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page).toHaveURL(`/track/${DEMO_IN_TRANSIT}`);
    await expect(page.getByText("Sample record — not a real shipment")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DEMO 0000 0000 0000 01");
    const times = await page.locator("ol time").evaluateAll((els) => els.map((e) => e.getAttribute("datetime")!));
    expect(times.length).toBe(5);
    expect([...times].sort().reverse()).toEqual(times); // newest first
    await expect(page.getByText("Not available yet")).toBeVisible(); // no fabricated estimate
  });

  test("shows delivered state", async ({ page }) => {
    await page.goto(`/track/${DEMO_DELIVERED}`);
    await expect(page.getByText(/^Delivered /).first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Delivery progress" }).locator("li").last()).toContainText("completed");
  });

  test("handles unknown and malformed numbers", async ({ page }) => {
    await page.goto("/track/ZZ00000000000000000099");
    await expect(page.getByRole("heading", { name: "We couldn't find that tracking number" })).toBeVisible();
    await page.goto("/track/abc");
    await expect(page.getByRole("heading", { name: "That isn't a valid tracking number" })).toBeVisible();
    await page.goto("/track/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
    await expect(page.getByRole("heading", { name: "That isn't a valid tracking number" })).toBeVisible();
  });

  test("works without JavaScript via GET fallback", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto("/track");
    await page.getByLabel("Tracking number").fill(DEMO_IN_TRANSIT);
    await page.getByRole("button", { name: "Track", exact: true }).click();
    await expect(page).toHaveURL(`/track/${DEMO_IN_TRANSIT}`);
    await page.goto("/track?trackingNumber=bad");
    await expect(page.getByText(/10–34 letters and digits/)).toBeVisible();
    await ctx.close();
  });

  test("tracking results are excluded from search engines", async ({ page }) => {
    await page.goto(`/track/${DEMO_IN_TRANSIT}`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test.describe("contact form", () => {
  test("shows server-side validation and keeps input", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Your name").fill("E2E Test");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("How can we help?").fill("short");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText(/at least 10 characters/)).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("E2E Test");
  });

  test("submits a valid message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Your name").fill("E2E Test");
    await page.getByLabel("Email").fill("e2e@example.test");
    await page.getByLabel("How can we help?").fill("[e2e] Automated test message — please ignore.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message sent")).toBeVisible();
    await expect(page.getByText(/Reference: [A-Z0-9]{8}/)).toBeVisible();
  });
});

test.describe("keyboard access", () => {
  test("skip link is the first tab stop and focus is visible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
  });
});
