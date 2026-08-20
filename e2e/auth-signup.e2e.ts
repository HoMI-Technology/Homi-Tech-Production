import { expect, test } from "@playwright/test";
import { BASE_URL, skipWithoutLiveSupabase } from "./helpers/env";
import {
  deleteTestUser,
  findUserIdByEmail,
  generateSignupConfirmLink,
  newTestEmail,
  newTestPassword,
} from "./helpers/test-user";
import { signInViaUi } from "./helpers/auth";

/**
 * Path 1 — signup → email confirm.
 *
 * The render smoke runs anywhere. The live round trip drives a real signup
 * and then "opens the email" by minting the exact confirmation link Supabase
 * would send (admin.generateLink) — no inbox required — and skips unless a
 * live Supabase test project with a service-role key is configured.
 */
test.describe("signup → email confirm", () => {
  test("sign-up page renders the account form", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.locator("#fullName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Email me a magic link" })).toBeVisible();
  });

  test("signup → confirm link → authenticated app access (live)", async ({ page }) => {
    skipWithoutLiveSupabase();
    test.setTimeout(180_000);

    const email = newTestEmail();
    const password = newTestPassword();

    let userId: string | null = null;
    try {
      await page.goto("/auth/sign-up");
      await page.locator("#fullName").fill("E2E Smoke");
      await page.locator("#email").fill(email);
      await page.locator("#password").fill(password);
      await page.getByRole("button", { name: "Create account" }).click();

      // A successful signup routes into Assess (first measurement).
      await page.waitForURL("**/assessment**", { timeout: 45_000 });

      userId = await findUserIdByEmail(email);
      expect(userId, "the signed-up user should exist in Supabase auth").not.toBeNull();

      // Simulate opening the confirmation email. When the project instead
      // auto-confirms signups, generateLink errors — fall back to proving the
      // account signs in directly (the confirm path is then a no-op there).
      let confirmLink: string | null = null;
      try {
        confirmLink = await generateSignupConfirmLink(
          email,
          password,
          `${BASE_URL}/auth/callback?next=${encodeURIComponent("/dashboard")}`,
        );
      } catch (err) {
        console.warn(
          `[e2e] signup confirmation link unavailable (project may auto-confirm signups): ${String(err)}`,
        );
      }

      if (confirmLink) {
        await page.goto(confirmLink);
        await page.waitForURL("**/dashboard**", { timeout: 60_000 });
      } else {
        await signInViaUi(page, email, password);
      }

      // Authenticated proof: a protected route renders without bouncing to sign-in.
      await page.goto("/settings");
      await expect(page).toHaveURL(/\/settings/);
      await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
    } finally {
      if (userId) await deleteTestUser(userId);
    }
  });
});
