/**
 * Money Reality — smoke path for Stand → Track → Decide.
 * Public tools hub must remain reachable without auth.
 */
import { test, expect } from "@playwright/test";

test.describe("Money Reality", () => {
  test("public tools hub stays crawlable (not auth-walled)", async ({ page }) => {
    const res = await page.goto("/tools");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Tools" })).toBeVisible();
    // Must not redirect into a login-only decide shell as the only content.
    await expect(page.getByText(/calculators/i).first()).toBeVisible();
  });

  test("individual calculator stays public", async ({ page }) => {
    await page.goto("/tools/runway");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("finance consolidates to money (redirect)", async ({ page }) => {
    const res = await page.goto("/finance");
    // 308/301 → /money (may then hit auth middleware)
    const url = page.url();
    expect(url).toMatch(/\/money|\/auth|\/login|sign-in/i);
    expect(res?.status() ?? 200).toBeLessThan(500);
  });
});
