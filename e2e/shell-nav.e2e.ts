import { test, expect } from "@playwright/test";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "../lib/layout/app-nav";
import { skipWithoutLiveSupabase } from "./helpers/env";
import { signInViaUi } from "./helpers/auth";
import { createTestUser, deleteTestUser, setTestUserRole } from "./helpers/test-user";

/**
 * Signed-in product shell smoke — recovered from PR #81 and adapted to:
 * - Partner home only (portal redirects to /partner/dashboard)
 * - Employee home only (portal redirects)
 * Self-skips without live Supabase. Creates and deletes throwaway users.
 */

test.describe("signed-in shell navigation", () => {
  test.beforeEach(() => {
    skipWithoutLiveSupabase();
  });

  test("PRIMARY + More + hamburger reach real product routes", async ({ page }) => {
    const user = await createTestUser();
    try {
      await signInViaUi(page, user.email, user.password);

      for (const item of APP_PRIMARY_NAV) {
        await expect(
          page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: item.label }),
        ).toBeVisible();
      }

      await page.getByRole("button", { name: "More" }).click();
      await expect(page.getByRole("menuitem", { name: "Journal" })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: "Companion" })).toHaveCount(0);
      await page.getByRole("menuitem", { name: "Journal" }).click();
      await expect(page).toHaveURL(/\/journal/);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Toggle menu" }).click();
      for (const item of [...APP_PRIMARY_NAV, ...APP_MORE_NAV].slice(0, 6)) {
        await expect(
          page.locator("#app-mobile-menu").getByRole("link", { name: item.label }),
        ).toBeVisible();
      }
      await expect(
        page.locator("#app-mobile-menu").getByRole("button", { name: "Jump to…" }),
      ).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("partner role shows switcher and partner home", async ({ page }) => {
    const user = await createTestUser();
    try {
      await setTestUserRole(user.id, "partner");
      await signInViaUi(page, user.email, user.password);

      const switcher = page.getByRole("navigation", { name: "Dashboard switcher" });
      await expect(switcher).toBeVisible();
      // Workspace is a single dropdown (not multi-pill) — open then pick Partner.
      await switcher.getByRole("button", { name: /Workspace:/ }).click();
      await expect(switcher.getByRole("menuitem", { name: "Personal" })).toBeVisible();
      await expect(switcher.getByRole("menuitem", { name: "Partner" })).toBeVisible();

      await switcher.getByRole("menuitem", { name: "Partner" }).click();
      await expect(page).toHaveURL(/\/partner\/dashboard/);
      // Portal is a redirect to partner home (operate program D2).
      await page.goto("/partner/portal");
      await expect(page).toHaveURL(/\/partner\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("employee role reaches employee dashboard", async ({ page }) => {
    const user = await createTestUser();
    try {
      await setTestUserRole(user.id, "employee");
      await signInViaUi(page, user.email, user.password);
      await page.reload();
      const switcher = page.getByRole("navigation", { name: "Dashboard switcher" });
      await switcher.getByRole("button", { name: /Workspace:/ }).click();
      await expect(switcher.getByRole("menuitem", { name: "Employee" })).toBeVisible({
        timeout: 20_000,
      });
      await page.goto("/employee/dashboard");
      await expect(page).toHaveURL(/\/employee\/dashboard/);
      await page.goto("/employee/portal");
      await expect(page).toHaveURL(/\/employee\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test.describe("shell nav config (always-on)", () => {
  test("PRIMARY and More exports stay coherent", async () => {
    expect(APP_PRIMARY_NAV[0].href).toBe("/dashboard");
    expect(APP_MORE_NAV.some((i) => i.href === "/advisor")).toBe(false);
    expect(APP_MORE_NAV.some((i) => i.href === "/journal")).toBe(true);
  });

  test("anonymous report path redirects to sign-in with next", async ({ page }) => {
    await page.goto("/report/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toContain("/report/");
  });
});
