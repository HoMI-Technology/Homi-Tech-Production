import { expect, type Page } from "@playwright/test";

/**
 * Signs in through the real UI (/auth/sign-in) and waits until the app has
 * routed into the authenticated area. Without a `next` param the app sends a
 * fresh sign-in to /dashboard (lib/auth/safeNext fallback).
 */
export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/sign-in");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Successful sign-in pushes to /dashboard; a failure stays on /auth/sign-in
  // and shows role=alert, so a timeout here means the credentials failed.
  await page.waitForURL("**/dashboard**", { timeout: 45_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
