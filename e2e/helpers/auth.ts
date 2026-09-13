import { expect, type Page } from "@playwright/test";

/**
 * Signs in through the real UI and lands on `/` (PR15 post-login).
 */
export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Success leaves /auth/sign-in; failure stays and shows role=alert.
  await page.waitForURL((url) => url.pathname === "/", { timeout: 45_000 });
  expect(new URL(page.url()).pathname).toBe("/");
}
