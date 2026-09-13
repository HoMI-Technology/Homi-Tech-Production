import { test, expect } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("authenticated funnel", () => {
  test.skip(!email || !password, "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run authed E2E.");

  test("sign in reaches `/`", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("signed-in /results and /dashboard redirect to `/`", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
    await page.goto("/results");
    expect(new URL(page.url()).pathname).toBe("/");
    await page.goto("/dashboard");
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
