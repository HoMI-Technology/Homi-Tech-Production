import { test, expect } from "@playwright/test";

/**
 * Knowledge brief: AlignmentScene pin cinema is brochure, not the walk.
 * Guard the unmount so the sticky 4-step ring lecture cannot remount on `/`.
 */

test.describe("homepage walk — AlignmentScene unmounted", () => {
  test.use({ colorScheme: "dark" });

  test("does not mount the pin-scene on /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pin-scene")).toHaveCount(0);
    await expect(page.getByTestId("alignment-pin-stage")).toHaveCount(0);
  });
});
