import { test, expect } from "@playwright/test";
import { skipWithoutLiveSupabase } from "./helpers/env";
import { signInViaUi } from "./helpers/auth";
import { createTestUser, deleteTestUser } from "./helpers/test-user";
import { expectKillToHome } from "./helpers/kill";

/**
 * PR15: no dashboard shell / left rail / role homes.
 * Self-skips without live Supabase. Creates and deletes throwaway users.
 */

test.describe("signed-in shell is scratched", () => {
  test.beforeEach(() => {
    skipWithoutLiveSupabase();
  });

  test("sign-in lands on `/`; product chrome is absent", async ({ page }) => {
    const user = await createTestUser();
    try {
      await signInViaUi(page, user.email, user.password);
      expect(new URL(page.url()).pathname).toBe("/");
      await expect(page.locator("[data-app-shell='pr10-rail']")).toHaveCount(0);
      await expect(page.getByLabel("HōMI dashboard")).toHaveCount(0);

      await expectKillToHome(page, "/dashboard");
      await expectKillToHome(page, "/path");
      await expectKillToHome(page, "/partner/dashboard");
      await expectKillToHome(page, "/employee/dashboard");
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test.describe("KILL routes (always-on)", () => {
  test("anonymous product URLs redirect to `/`, not sign-in", async ({ page }) => {
    await page.goto("/report/00000000-0000-0000-0000-000000000000");
    expect(new URL(page.url()).pathname).toBe("/");
    await page.goto("/dashboard");
    expect(new URL(page.url()).pathname).toBe("/");
    expect(page.url()).not.toContain("/auth/sign-in");
  });
});
