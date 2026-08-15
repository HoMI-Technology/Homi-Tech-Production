import { test, expect } from "@playwright/test";

/**
 * Homepage walk no longer mounts AlignmentScene pin cinema.
 * The 4-step ring tour (Financial Reality → Emotional Truth → Perfect Timing
 * → key) was density, not one idea per scroll. This spec guards the unmount
 * so the old sticky-pin suite cannot silently remount on `/`.
 */

test.describe("homepage walk — AlignmentScene unmounted", () => {
  test.use({ colorScheme: "dark" });

  test("does not mount the pin-scene on /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".pin-scene")).toHaveCount(0);
    await expect(page.getByTestId("alignment-pin-stage")).toHaveCount(0);
  });
});
