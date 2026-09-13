import { test, expect } from "@playwright/test";
import { dismissCookieConsent } from "./helpers/consent";

/**
 * Easy signed-in smoke — only needs an existing account:
 *   SMOKE_EMAIL / SMOKE_PASSWORD  (or E2E_TEST_EMAIL / E2E_TEST_PASSWORD)
 *
 * PR15: post-login is `/`; product URLs are KILL.
 */

const email = process.env.SMOKE_EMAIL ?? process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.SMOKE_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? "";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/auth/sign-in");
  await dismissCookieConsent(page);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20_000 });
  expect(new URL(page.url()).pathname).toBe("/");
  await dismissCookieConsent(page);
}

test.describe.configure({ mode: "serial" });

test.describe("signed-in smoke (easy)", () => {
  test.skip(
    !email || !password,
    "Set SMOKE_EMAIL + SMOKE_PASSWORD (or E2E_TEST_*), then: npm run smoke:auth",
  );

  test("1) sign in reaches `/`", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("[data-app-shell='pr10-rail']")).toHaveCount(0);
  });

  test("2) /assessment is KILL → `/`", async ({ page }) => {
    await signIn(page);
    await page.goto("/assessment");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("3) /tools is KILL → `/`", async ({ page }) => {
    await signIn(page);
    await page.goto("/tools/mortgage");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("4) /finance is KILL → `/`", async ({ page }) => {
    await signIn(page);
    await page.goto("/finance");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
