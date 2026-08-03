import { expect, test } from "@playwright/test";
import { BASE_URL, skipWithoutLiveSupabase } from "./helpers/env";
import { dismissCookieConsent } from "./helpers/consent";
import {
  createTestUser,
  deleteTestUser,
  generateRecoveryLink,
  newTestPassword,
} from "./helpers/test-user";
import { signInViaUi } from "./helpers/auth";

/**
 * Path 5 — password reset.
 *
 * The first two tests are UI-state smoke and run anywhere (the recovery
 * request is intercepted, so no email/SMTP is involved). The third is the
 * full live round trip and skips unless a live Supabase test project with a
 * service-role key is configured (e2e/README.md).
 */
test.describe("password reset", () => {
  test("reset page without a recovery session shows the expired-link recovery path", async ({
    page,
  }) => {
    await page.goto("/auth/reset-password");
    await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Send a new reset link" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );
  });

  test("forgot-password accepts the request and shows the uniform confirmation", async ({
    page,
  }) => {
    // Hermetic: intercept the Supabase recovery endpoint so this test never
    // depends on SMTP, project rate limits, or even network access.
    await page.route(/\/auth\/v1\/recover/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
    );

    await page.goto("/auth/forgot-password");
    await dismissCookieConsent(page);

    await page.locator("#email").fill("someone@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();

    // Uniform by design (no account enumeration, AUDIT T1.8).
    await expect(page.getByText(/If an account exists for/)).toBeVisible();
  });

  test("full recovery round trip: link → new password → sign in (live)", async ({
    page,
    browser,
  }) => {
    skipWithoutLiveSupabase();
    test.setTimeout(180_000);

    const user = await createTestUser();
    const newPassword = newTestPassword();
    try {
      // What the reset email would contain: a recovery link that lands on our
      // auth callback, which exchanges the code and forwards to the form.
      const link = await generateRecoveryLink(
        user.email,
        `${BASE_URL}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
      );
      await page.goto(link);
      await page.waitForURL("**/auth/reset-password**", { timeout: 60_000 });

      await expect(page.getByRole("heading", { name: "Set a new password" })).toBeVisible();
      await page.locator("#password").fill(newPassword);
      await page.locator("#confirm").fill(newPassword);
      await page.getByRole("button", { name: "Update password" }).click();
      await expect(page.getByRole("heading", { name: "Password updated" })).toBeVisible();

      // Prove the new credential works in a completely fresh context.
      const fresh = await browser.newContext();
      try {
        const freshPage = await fresh.newPage();
        await signInViaUi(freshPage, user.email, newPassword);
      } finally {
        await fresh.close();
      }
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
