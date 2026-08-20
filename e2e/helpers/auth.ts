import { expect, type Page } from "@playwright/test";

/**
 * Signs in through the real UI and lands on Home. Uses explicit `next=/dashboard`
 * so shell tests stay on Home even when the account has no completed assessment
 * (bare sign-in otherwise routes first-run users to `/assessment`).
 */
export async function signInViaUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/sign-in?next=/dashboard");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // Successful sign-in honors next=/dashboard; a failure stays on /auth/sign-in
  // and shows role=alert, so a timeout here means the credentials failed.
  await page.waitForURL("**/dashboard**", { timeout: 45_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}
