import { expect, test } from "@playwright/test";
import { dismissCookieConsent } from "./helpers/consent";

/**
 * Prod smoke: Pre-Flight, Path empty state, status page.
 * No auth secrets required.
 */

test.describe("Path stack smoke (public)", () => {
  test("status page loads", async ({ page }) => {
    await page.goto("/status");
    await dismissCookieConsent(page);
    await expect(page.getByRole("heading", { name: "System status" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/SLO|Operational/i).first()).toBeVisible();
  });

  test("preflight tool loads and shows a badge", async ({ page }) => {
    await page.goto("/tools/preflight");
    await dismissCookieConsent(page);
    await expect(page.getByRole("heading", { name: /Pre-Flight/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/DO NOT PROCEED|WAIT|PROCEED WITH CARE/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("path page empty state offers assessment or generate", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("homi:readiness-path");
      localStorage.removeItem("homi:last-assessment");
    });
    await page.goto("/path");
    await dismissCookieConsent(page);
    await expect(page.getByText(/No active path|Path to Ready/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
