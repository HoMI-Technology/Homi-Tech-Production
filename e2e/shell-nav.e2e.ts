import { test, expect } from "@playwright/test";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "../lib/layout/app-nav";
import { skipWithoutLiveSupabase } from "./helpers/env";
import { signInViaUi } from "./helpers/auth";
import { createTestUser, deleteTestUser, setTestUserRole } from "./helpers/test-user";
import { pinEnglishLocalePage } from "./helpers/locale";

/**
 * Signed-in product shell smoke — PRIMARY, More, hamburger, role switcher,
 * portal↔dashboard, and /es sign-in return. Self-skips without live Supabase.
 * Creates and deletes throwaway users (self-cleaning).
 */

test.describe("signed-in shell navigation", () => {
  test.beforeEach(() => {
    skipWithoutLiveSupabase();
  });

  test("PRIMARY + More + hamburger reach real product routes", async ({ page }) => {
    const user = await createTestUser();
    try {
      await signInViaUi(page, user.email, user.password);

      // Desktop PRIMARY
      for (const item of APP_PRIMARY_NAV) {
        await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: item.label })).toBeVisible();
      }

      // More dropdown includes Companion
      await page.getByRole("button", { name: "More" }).click();
      await expect(page.getByRole("menuitem", { name: "Companion" })).toBeVisible();
      await page.getByRole("menuitem", { name: "Companion" }).click();
      await expect(page).toHaveURL(/\/advisor/);

      // Hamburger on narrow viewport
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/dashboard");
      await page.getByRole("button", { name: "Toggle menu" }).click();
      for (const item of [...APP_PRIMARY_NAV, ...APP_MORE_NAV].slice(0, 6)) {
        await expect(page.locator("#app-mobile-menu").getByRole("link", { name: item.label })).toBeVisible();
      }
      await expect(page.locator("#app-mobile-menu").getByRole("button", { name: "Jump to…" })).toBeVisible();
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("partner role shows switcher and portal↔dashboard links", async ({ page }) => {
    const user = await createTestUser();
    try {
      await setTestUserRole(user.id, "partner");
      await signInViaUi(page, user.email, user.password);

      const switcher = page.getByRole("navigation", { name: "Dashboard switcher" });
      await expect(switcher).toBeVisible();
      await expect(switcher.getByRole("link", { name: "Personal" })).toBeVisible();
      await expect(switcher.getByRole("link", { name: "Partner" })).toBeVisible();

      await switcher.getByRole("link", { name: "Partner" }).click();
      await expect(page).toHaveURL(/\/partner\/dashboard/);
      await page.getByRole("link", { name: "Portal resources" }).click();
      await expect(page).toHaveURL(/\/partner\/portal/);
      await page.getByRole("link", { name: "Partner dashboard" }).click();
      await expect(page).toHaveURL(/\/partner\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("employee role reaches employee dashboard and portal", async ({ page }) => {
    const user = await createTestUser();
    try {
      await setTestUserRole(user.id, "employee");
      await signInViaUi(page, user.email, user.password);

      const switcher = page.getByRole("navigation", { name: "Dashboard switcher" });
      await expect(switcher.getByRole("link", { name: "Employee" })).toBeVisible();
      await switcher.getByRole("link", { name: "Employee" }).click();
      await expect(page).toHaveURL(/\/employee\/dashboard/);
      await page.getByRole("link", { name: "Full portal" }).or(page.getByRole("link", { name: "Employee dashboard" })).first();
      // Empty state may show Start assessment instead of Full portal — open portal via URL if needed
      await page.goto("/employee/portal");
      await expect(page.getByRole("link", { name: "Employee dashboard" })).toBeVisible();
      await page.getByRole("link", { name: "Employee dashboard" }).click();
      await expect(page).toHaveURL(/\/employee\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("/es sign-in return preserves locale on next", async ({ page }) => {
    const user = await createTestUser();
    try {
      await setTestUserRole(user.id, "partner");
      // Hit a protected Spanish URL while signed out → locale-aware sign-in
      await page.context().clearCookies();
      await page.goto("/es/partner/dashboard");
      await expect(page).toHaveURL(/\/es\/auth\/sign-in/);
      const url = new URL(page.url());
      expect(url.searchParams.get("next")).toMatch(/\/es\/partner\/dashboard/);

      await page.locator("#email").fill(user.email);
      await page.locator("#password").fill(user.password);
      await page.getByRole("button", { name: /Iniciar sesión|Sign in/i }).click();
      await page.waitForURL("**/partner/dashboard**", { timeout: 45_000 });
      await expect(page).toHaveURL(/\/es\/partner\/dashboard/);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test.describe("shell nav config (always-on)", () => {
  test("PRIMARY and More exports stay coherent", async () => {
    expect(APP_PRIMARY_NAV[0].href).toBe("/dashboard");
    expect(APP_MORE_NAV.some((i) => i.href === "/advisor")).toBe(true);
  });

  test("anonymous report path redirects to sign-in with next", async ({ page }) => {
    await pinEnglishLocalePage(page);
    await page.goto("/report/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    const next = new URL(page.url()).searchParams.get("next");
    expect(next).toContain("/report/");
  });
});
