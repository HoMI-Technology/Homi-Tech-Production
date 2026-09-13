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
 * Path 1 — signup → email confirm. PR15: destination is always `/`.
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

  test("signup → confirm link → landing `/` (live)", async ({ page }) => {
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

      await page.waitForURL((url) => url.pathname === "/", { timeout: 45_000 });

      userId = await findUserIdByEmail(email);
      expect(userId, "the signed-up user should exist in Supabase auth").not.toBeNull();

      let confirmLink: string | null = null;
      try {
        confirmLink = await generateSignupConfirmLink(
          email,
          password,
          `${BASE_URL}/auth/callback`,
        );
      } catch (err) {
        console.warn(
          `[e2e] signup confirmation link unavailable (project may auto-confirm signups): ${String(err)}`,
        );
      }

      if (confirmLink) {
        await page.goto(confirmLink);
        await page.waitForURL((url) => url.pathname === "/", { timeout: 60_000 });
      } else {
        await signInViaUi(page, email, password);
      }

      await page.goto("/settings");
      expect(new URL(page.url()).pathname).toBe("/");
      await page.goto("/dashboard");
      expect(new URL(page.url()).pathname).toBe("/");
    } finally {
      if (userId) await deleteTestUser(userId);
    }
  });
});
