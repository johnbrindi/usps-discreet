import { expect, test, type Page } from "@playwright/test";

/**
 * Whole-site sweep (tests that change data carry no @mobile tag, so they run once, on desktop): every public and admin route renders cleanly, every internal link resolves, every
 * customer form reaches the admin console, and staff can act on what arrives.
 */

const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;
const TOOL_SLUGS = ["price", "pickup", "ship", "change-address", "claim"];

/** Fails the test on console errors, uncaught exceptions and same-origin 4xx/5xx responses. */
function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`exception: ${e.message}`));
  page.on("response", (r) => {
    const url = new URL(r.url());
    if (url.origin === new URL(page.url() || "http://localhost:3100").origin && r.status() >= 400) {
      problems.push(`HTTP ${r.status()} ${url.pathname}${url.search}`);
    }
  });
  return problems;
}

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

/** Next weekday at least two days out, within the 30-day pickup window. */
function pickupDay() {
  const d = new Date(Date.now() + 2 * 86_400_000);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Fills every field of a Quick Tools form with valid data, chosen by field name and type. */
async function fillToolForm(page: Page, slug: string, tag: string) {
  const fields = page.locator("main form [name]:not([type=hidden]):not([name=website])");
  const count = await fields.count();
  for (let i = 0; i < count; i++) {
    const f = fields.nth(i);
    const name = (await f.getAttribute("name"))!;
    const tag_ = await f.evaluate((el) => el.tagName.toLowerCase());
    const type = (await f.getAttribute("type")) ?? "";
    if (name.startsWith("$")) continue; // React action internals
    if (tag_ === "select") {
      await f.selectOption({ index: 1 }).catch(() => f.selectOption({ index: 0 }));
      continue;
    }
    let value = "E2E value";
    if (name === "name" || name.endsWith("Name")) value = `E2E Customer ${tag}`;
    else if (name === "email") value = `e2e+${slug}@example.test`;
    else if (name === "phone") value = "+1 860 555 0100";
    else if (name === "trackingNumber") value = slug === "claim" ? "DEMO00000000000002" : "DEMO00000000000001";
    else if (/Postcode$/i.test(name)) value = "06103";
    else if (/Country$/i.test(name)) value = "United States";
    else if (/City$/.test(name)) value = "Hartford";
    else if (/Region$/.test(name)) value = "CT";
    else if (/Line1$/.test(name)) value = "100 Main Street";
    else if (/Line2$/.test(name)) value = "Suite 4";
    else if (name === "pickupDate") value = pickupDay();
    else if (name === "parcelCount") value = "2";
    else if (type === "number") value = "12";
    else if (tag_ === "textarea") value = `Automated end-to-end check ${tag}: everything about this parcel is described here.`;
    await f.fill(value);
  }
}

test.describe("every public route", () => {
  const routes = [
    "/",
    "/track",
    "/tools",
    ...TOOL_SLUGS.map((s) => `/tools/${s}`),
    "/help",
    "/contact",
    "/privacy",
    "/terms",
    "/track/DEMO00000000000001",
    "/track/DEMO00000000000002",
    "/track/DEMO00000000000003",
  ];
  for (const path of routes) {
    test(`${path} renders with no errors @mobile`, async ({ page }) => {
      const problems = watch(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(problems).toEqual([]);
    });
  }

  test("robots, sitemap and icon are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Disallow: \/admin/);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    for (const p of ["/track", "/tools/price", "/help", "/contact"]) expect(xml).toContain(p);
    for (const loc of xml.match(/<loc>[^<]+<\/loc>/g) ?? []) {
      const path = new URL(loc.slice(5, -6)).pathname;
      expect((await request.get(path)).status(), path).toBe(200);
    }
    expect((await request.get("/icon.svg")).status()).toBe(200);
  });

  test("unknown tool slugs and tracking pages 404 cleanly", async ({ request }) => {
    expect((await request.get("/tools/does-not-exist")).status()).toBe(404);
    expect((await request.get("/admin/shipments/not-a-real-id", { maxRedirects: 0 })).status()).toBeLessThan(500);
    const unknown = await request.get("/track/ZZ999999999ZZ");
    expect(unknown.status()).toBeLessThan(500);
  });

  test("support is shown as 24/7 everywhere", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("main").getByText("24/7, every day")).toBeVisible();
    await expect(page.locator("footer").getByText("Support: 24/7, every day")).toBeVisible();
    await expect(page.getByText(/Mon–Fri|Outside support hours/)).toHaveCount(0);
    await page.getByRole("button", { name: /chat/i }).first().click();
    await expect(page.getByText("Available 24/7 — replies are sent here")).toBeVisible();
    await expect(page.getByText(/around the clock/)).toBeVisible();
  });
});

test.describe("quick tools reach the admin console", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.20" } });

  const tag = `T${Date.now().toString(36)}`;
  const references: Record<string, string> = {};

  for (const slug of TOOL_SLUGS) {
    test(`/tools/${slug} validates, then submits`, async ({ page }) => {
      const problems = watch(page);
      await page.goto(`/tools/${slug}`);
      // Empty submit is rejected without losing the page.
      await page.locator("main form").getByRole("button", { name: /submit|send|request|book|get/i }).last().click();
      await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
      await expect(page).toHaveURL(`/tools/${slug}`);
      // Every message names what to fix — no raw validator output.
      await expect(page.locator("main form").getByText(/Invalid input|expected string/)).toHaveCount(0);

      await fillToolForm(page, slug, tag);
      await page.locator("main form").getByRole("button", { name: /submit|send|request|book|get/i }).last().click();
      await expect(page.getByText("Your reference")).toBeVisible();
      const ref = (await page.locator("p.font-mono").first().textContent())!.trim();
      expect(ref).toMatch(/^[A-Z]{2}-[2-9A-HJKMNP-Z]{8}$/);
      references[slug] = ref;
      expect(problems.filter((p) => !p.startsWith("HTTP 4"))).toEqual([]);
    });
  }

  test.describe("from another connection", () => {
    test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.23" } });

    test("an address change for a delivered parcel is refused", async ({ page }) => {
      await page.goto("/tools/change-address");
      await fillToolForm(page, "change-address", tag);
      await page.getByLabel("Tracking number").fill("DEMO00000000000002");
      await page.locator("main form").getByRole("button", { name: /submit|send|request|book|get/i }).last().click();
      await expect(page.getByText("This parcel has already been delivered or returned, so it can't be redirected.")).toBeVisible();
    });
  });

  test("a sixth request from one connection within 10 minutes is rate limited", async ({ page }) => {
    await page.goto("/tools/price");
    await fillToolForm(page, "price", tag);
    await page.locator("main form").getByRole("button", { name: /submit|send|request|book|get/i }).last().click();
    await expect(page.getByText("Too many requests from this connection. Please try again in a few minutes.")).toBeVisible();
  });

  test("staff see every request and can move it through its statuses", async ({ page }) => {
    const problems = watch(page);
    await signIn(page);
    await page.goto("/admin/requests");
    for (const ref of Object.values(references)) await expect(page.getByText(ref)).toBeVisible();

    await page.getByText(references.claim!).click();
    await expect(page.getByRole("heading", { name: new RegExp(references.claim!) }).or(page.getByText(references.claim!).first())).toBeVisible();
    await expect(page.getByText(`e2e+claim@example.test`).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark in progress" }).click();
    await expect(page.getByRole("button", { name: "Mark closed" })).toBeVisible();
    await page.getByRole("button", { name: "Mark closed" }).click();
    await expect(page.getByRole("button", { name: "Mark new" })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe("contact form reaches the admin console", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");
  test.use({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.21" } });

  test("submit an inquiry, then triage it", async ({ page }) => {
    const subject = `E2E inquiry ${Date.now()}`;
    await page.goto("/contact");
    await page.getByLabel("Your name").fill("E2E Contact");
    await page.getByLabel("Email").fill("e2e+contact@example.test");
    await page.getByLabel("How can we help?").fill(`${subject}: please confirm the contact form reaches staff.`);
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Message sent")).toBeVisible();

    const problems = watch(page);
    await signIn(page);
    await page.goto("/admin/inquiries");
    const card = page.locator("li, article, tr").filter({ hasText: subject }).first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Mark in progress" }).click();
    await expect(page.locator("li, article, tr").filter({ hasText: subject }).first().getByRole("button", { name: "Mark closed" })).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe("support chat round trip", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");

  test("a visitor's message is answered by staff and the reply appears in the widget", async ({ browser }) => {
    const text = `[e2e] round trip ${Date.now()}`;
    const visitor = await browser.newPage({ extraHTTPHeaders: { "x-forwarded-for": "198.51.100.22" } });
    await visitor.goto("/help");
    await visitor.getByRole("button", { name: /chat/i }).first().click();
    await visitor.getByRole("textbox", { name: /message/i }).fill(text);
    await visitor.getByRole("button", { name: /^send/i }).click();
    await expect(visitor.getByText(text)).toBeVisible();

    const staff = await browser.newPage();
    const problems = watch(staff);
    await signIn(staff);
    await staff.goto("/admin/messages");
    await staff.getByRole("link", { name: new RegExp(text.replace(/[[\]]/g, "\\$&")) }).first().click();
    await expect(staff.getByText(text)).toBeVisible();
    const reply = `Staff reply ${Date.now()}`;
    await staff.getByRole("textbox").last().fill(reply);
    await staff.getByRole("button", { name: /send|reply/i }).click();
    await expect(staff.getByText(reply)).toBeVisible();
    await staff.getByRole("button", { name: "Close conversation" }).click();
    await expect(staff.getByRole("button", { name: "Reopen" })).toBeVisible();
    await staff.getByRole("button", { name: "Reopen" }).click();
    await expect(staff.getByRole("button", { name: "Close conversation" })).toBeVisible();
    expect(problems).toEqual([]);

    // The visitor sees the reply after reopening the widget (it polls / reloads the thread).
    await visitor.reload();
    await visitor.getByRole("button", { name: /chat/i }).first().click();
    await expect(visitor.getByText(reply)).toBeVisible({ timeout: 15_000 });
    await visitor.close();
    await staff.close();
  });
});

test.describe("admin data never reaches anonymous visitors", () => {
  test("every admin route, as a page or as a navigation (RSC) request, gives nothing away", async ({ request }) => {
    const routes = ["/admin", "/admin/shipments", "/admin/shipments/new", "/admin/messages", "/admin/inquiries", "/admin/requests"];
    for (const path of routes) {
      for (const headers of [{}, { RSC: "1" }, { RSC: "1", "Next-Router-State-Tree": encodeURIComponent(JSON.stringify(["", { children: ["admin", { children: ["(console)", { children: ["__PAGE__", {}] }] }] }, null, null, true])) }] as Record<string, string>[]) {
        const res = await request.get(path, { headers, maxRedirects: 0 });
        const body = await res.text();
        expect([200, 303, 307, 308], `${path} ${JSON.stringify(headers)}`).toContain(res.status());
        if (res.status() === 200) {
          // A 200 may only carry the login redirect, never admin content or customer data.
          expect(body, path).not.toMatch(/Recently recorded events|Awaiting reply|New shipment|All request types|example\.test|DEMO0000/);
        }
      }
    }
  });
});

test.describe("admin console", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run");

  test("every admin page and every link on it loads without errors @mobile", async ({ page }) => {
    test.setTimeout(180_000);
    const problems = watch(page);
    await signIn(page);
    const seen = new Set<string>();
    const queue = ["/admin", "/admin/shipments", "/admin/shipments/new", "/admin/messages", "/admin/inquiries", "/admin/requests"];
    while (queue.length && seen.size < 80) {
      const path = queue.shift()!;
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page).not.toHaveURL(/\/admin\/login/);
      await expect(page.locator("main")).toBeVisible();
      for (const href of await page.locator("a[href^='/admin']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
        const clean = href.split("#")[0]!;
        if (!seen.has(clean) && !queue.includes(clean)) queue.push(clean);
      }
    }
    expect(seen.size).toBeGreaterThan(8);
    expect(problems).toEqual([]);
  });

  test("staff edit a shipment, record and remove an event, and sign out", async ({ page }) => {
    const problems = watch(page);
    const tn = `EDIT${Date.now()}`;
    await signIn(page);
    await page.goto("/admin/shipments/new");
    await page.getByLabel(/^Tracking number/).fill(tn);
    await page.getByLabel("City (public)").fill("Boston");
    await page.getByRole("button", { name: "Create shipment" }).click();
    await expect(page.getByText("Shipment created.")).toBeVisible();

    // Edit and save the shipment details.
    const city = page.getByLabel("City (public)");
    await city.fill("Springfield");
    await page.getByRole("button", { name: /save/i }).first().click();
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("City (public)")).toHaveValue("Springfield");

    // Record an event, see it publicly, then remove it.
    await page.getByLabel(/Date & time/).fill("2026-10-15T10:30");
    await page.getByLabel("Description (shown publicly)").fill("Shipment details received (edit flow)");
    await page.getByLabel("Time zone").fill("America/New_York");
    await page.getByRole("button", { name: "Record event" }).click();
    await expect(page.getByText("Event recorded.")).toBeVisible();
    await page.goto(`/track/${tn}`);
    await expect(page.getByText("Shipment details received (edit flow)")).toBeVisible();
    await expect(page.getByText("Springfield").first()).toBeVisible();

    await page.goBack();
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Remove latest" }).click();
    await expect(page.getByText("No events recorded yet").or(page.getByText("No events yet."))).toBeVisible();

    // Search finds it on the list page.
    await page.goto(`/admin/shipments?q=${tn}`);
    await expect(page.getByText(tn)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL("/admin/login");
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin/login");
    expect(problems).toEqual([]);
  });
});
