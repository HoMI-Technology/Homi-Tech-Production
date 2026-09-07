/**
 * Money Reality — public funnel + signed-in mode smoke.
 * Public tools hub must remain reachable without auth.
 */
import { test, expect } from "@playwright/test";

test.describe("Money Reality — public funnel", () => {
  test("public tools hub stays crawlable (not auth-walled)", async ({ page }) => {
    const res = await page.goto("/tools");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Tools" })).toBeVisible();
    await expect(page.getByText(/Educational estimates only/i)).toBeVisible();
  });

  test("individual calculator stays public with public back link", async ({ page }) => {
    await page.goto("/tools/runway");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const back = page.getByRole("link", { name: /all tools|all lenses|money · decide/i });
    await expect(back).toBeVisible();
    const href = await back.getAttribute("href");
    // Anonymous default must not be a protected money path.
    expect(href).toMatch(/^\/tools/);
  });

  test("finance consolidates to money (redirect)", async ({ page }) => {
    const res = await page.goto("/finance");
    const url = page.url();
    expect(url).toMatch(/\/money|\/auth|\/login|sign-in/i);
    expect(res?.status() ?? 200).toBeLessThan(500);
  });
});

test.describe("Money Reality — signed-in modes", () => {
  // Requires PLAYWRIGHT auth storage when available; otherwise skips.
  test("money modes: one h1 and mode rail when session exists", async ({ page }) => {
    const res = await page.goto("/money");
    const url = page.url();
    if (/sign-in|login|auth/i.test(url)) {
      test.skip(true, "No signed-in storage state — public funnel tests still cover law");
      return;
    }
    expect(res?.status()).toBeLessThan(400);
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText(/Connect accounts to see money reality|Your money picture/i);
    await expect(page.getByRole("navigation", { name: /money modes/i })).toHaveCount(0);

    await page.goto("/money/budget");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: /money modes/i })).toHaveCount(0);
    // No second product title
    await expect(page.getByRole("heading", { name: "Budget Planner" })).toHaveCount(0);

    await page.goto("/money/decide");
    await expect(page.locator("h1")).toHaveCount(1);

    await page.goto("/money/plan");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByText(/Money plan/i).first()).toBeVisible();
  });
});
