import { test, expect } from "@playwright/test";
import { dismissCookieConsent } from "./helpers/consent";

/**
 * Easy signed-in smoke — only needs an existing account:
 *   SMOKE_EMAIL / SMOKE_PASSWORD  (or E2E_TEST_EMAIL / E2E_TEST_PASSWORD)
 *
 * No service-role. No user create/delete. Safe against production if you
 * use a throwaway account you own.
 *
 * Run: npm run smoke:auth
 *
 * Browser: playwright.config prefers system Chrome/Edge on local Windows so
 * SAC-blocked chrome-headless-shell never runs.
 */

const email = process.env.SMOKE_EMAIL ?? process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.SMOKE_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? "";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth/sign-in");
  await dismissCookieConsent(page);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|assessment|results|path|finance)/, {
    timeout: 20_000,
  });
  await dismissCookieConsent(page);
}

// Serial: one account signing in 4× in parallel trips rate limits / consent races.
test.describe.configure({ mode: "serial" });

test.describe("signed-in smoke (easy)", () => {
  test.skip(!email || !password, "Set SMOKE_EMAIL + SMOKE_PASSWORD (or E2E_TEST_*), then: npm run smoke:auth");

  test("1) sign in reaches a product surface", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("body")).toBeVisible();
  });

  test("2) assessment is available without Coming soon picker clutter", async ({ page }) => {
    await signIn(page);
    await page.goto("/assessment");
    await dismissCookieConsent(page);
    // Launch honesty: single active vertical — no disabled Coming soon cards.
    await expect(page.getByText(/Coming soon/i)).toHaveCount(0);
    // Flow should show real assessment chrome (questions or intro).
    await expect(page.locator("main, #main, body").first()).toBeVisible();
  });

  test("3) companion launcher is present on a product page", async ({ page }) => {
    await signIn(page);
    await page.goto("/tools/mortgage");
    await dismissCookieConsent(page);
    // Host shows idle launcher; wait past idle window (≤3s).
    const launcher = page.getByRole("button", {
      name: /Open HōMI Companion|Close HōMI Companion/i,
    });
    await expect(launcher).toBeVisible({ timeout: 10_000 });
    // Banner can reappear after nav — force-click if needed.
    await launcher.click({ force: true });
    await expect(page.getByRole("dialog", { name: /HōMI Companion/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("4) finance surface loads", async ({ page }) => {
    await signIn(page);
    await page.goto("/finance");
    await dismissCookieConsent(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 15_000 });
  });
});
