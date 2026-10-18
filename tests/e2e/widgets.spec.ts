import { expect, test } from "@playwright/test";

test.describe("floating support widgets", () => {
  test("chat sits above WhatsApp and both stay fixed while scrolling @mobile", async ({ page }) => {
    await page.goto("/help");
    const chat = page.getByRole("button", { name: "Chat with James" });
    const wa = page.getByRole("link", { name: /Contact us on WhatsApp/ });
    await expect(chat).toBeVisible();
    await expect(wa).toBeVisible();

    const before = { chat: await chat.boundingBox(), wa: await wa.boundingBox() };
    expect(before.chat!.y + before.chat!.height).toBeLessThanOrEqual(before.wa!.y); // chat above WhatsApp
    expect(Math.abs(before.chat!.x + before.chat!.width - (before.wa!.x + before.wa!.width))).toBeLessThan(1); // right-aligned

    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(300);
    const after = { chat: await chat.boundingBox(), wa: await wa.boundingBox() };
    expect(after).toEqual(before);

    const vp = page.viewportSize()!;
    expect(before.wa!.x + before.wa!.width).toBeLessThanOrEqual(vp.width);
    expect(before.wa!.y + before.wa!.height).toBeLessThanOrEqual(vp.height);
    expect(before.chat!.width).toBeGreaterThanOrEqual(44); // touch target
  });

  test("WhatsApp link uses the configured number safely", async ({ page }) => {
    await page.goto("/");
    const wa = page.getByRole("link", { name: /Contact us on WhatsApp/ });
    await expect(wa).toHaveAttribute("href", "https://wa.me/18603983750");
    await expect(wa).toHaveAttribute("target", "_blank");
    await expect(wa).toHaveAttribute("rel", /noopener/);
    await expect(wa).toHaveAccessibleName(/\+1 860 398 3750/);
  });

  test("chat opens, sends a message, and closes with Escape @mobile", async ({ page }) => {
    await page.goto("/");
    const launcher = page.getByRole("button", { name: "Chat with James" });
    await launcher.click();
    const panel = page.getByRole("dialog", { name: /James · Customer support/ });
    await expect(panel).toBeVisible();
    await expect(launcher).toHaveAttribute("aria-expanded", "true");
    await expect(panel.getByText(/around the clock/)).toBeVisible();
    await expect(panel.getByText("Available 24/7 — replies are sent here")).toBeVisible();
    await expect(panel.getByText("No messages yet.", { exact: false })).toBeVisible();

    const input = panel.getByLabel("Message");
    await expect(input).toBeFocused();
    await expect(panel.getByRole("button", { name: "Send message" })).toBeDisabled();
    await input.fill("[e2e] Hello, automated widget test.");
    await input.press("Enter");
    await expect(panel.getByText("[e2e] Hello, automated widget test.")).toBeVisible();
    await expect(input).toHaveValue("");

    // The panel stays inside the viewport.
    const box = (await panel.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(launcher).toBeFocused();

    // History persists for this visitor (cookie) after reload.
    await page.reload();
    await page.getByRole("button", { name: "Chat with James" }).click();
    await expect(page.getByText("[e2e] Hello, automated widget test.")).toBeVisible();
  });

  test("launchers stay visible and tappable while the chat panel is open @mobile", async ({ page }) => {
    await page.goto("/");
    const chat = page.getByRole("button", { name: /Chat with James|Close chat/ }).first();
    await chat.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const wa = page.getByRole("link", { name: /Contact us on WhatsApp/ });
    for (const el of [chat, wa]) {
      await expect(el).toBeVisible();
      // The launcher is the topmost element at its centre, i.e. the panel doesn't cover it.
      const covered = await el.evaluate((node) => {
        const b = node.getBoundingClientRect();
        const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return !top || !(node === top || node.contains(top));
      });
      expect(covered).toBe(false);
    }
    const panel = (await page.getByRole("dialog").boundingBox())!;
    const chatBox = (await chat.boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(chatBox.y);
  });

  test("desktop chat panel doesn't overlap the launchers", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.goto("/");
    await page.getByRole("button", { name: "Chat with James" }).click();
    const panel = (await page.getByRole("dialog").boundingBox())!;
    const launcher = (await page.getByRole("button", { name: "Chat with James" }).boundingBox())!;
    expect(panel.y + panel.height).toBeLessThanOrEqual(launcher.y);
  });

  test("chat API rejects cross-origin and oversized posts", async ({ request }) => {
    const cross = await request.post("/api/chat", {
      headers: { origin: "https://evil.example", "content-type": "application/json" },
      data: { body: "hi" },
    });
    expect(cross.status()).toBe(403);
    const big = await request.post("/api/chat", {
      headers: { origin: "http://localhost:3100", "content-type": "application/json" },
      data: { body: "x".repeat(9000) },
    });
    expect([400, 413]).toContain(big.status());
  });
});
