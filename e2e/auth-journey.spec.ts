import { test, expect } from "@playwright/test";

/**
 * Signed-in journeys. Scaffolded now, self-skipping until a seeded test account
 * exists (E2E_TEST_EMAIL / E2E_TEST_PASSWORD) — so CI is green today and these
 * light up the moment the secrets are provisioned, per the launch runbook.
 */

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("authenticated funnel", () => {
  test.skip(!email || !password, "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run authed E2E.");

  test("sign in reaches the dashboard", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test("results page resolves a verdict for the signed-in user", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await page.goto("/results");
    await expect(page.getByText(/READY|ALMOST|BUILD FIRST|NOT YET|No results yet/i).first()).toBeVisible();
  });
});
