import { expect, test } from "@playwright/test";
import { completeFullAssessment, VERDICT_BADGE } from "./helpers/assessment";

/**
 * Path 2 — assessment → verdict.
 *
 * Runs everywhere with zero secrets: the full assessment is a public,
 * client-scored flow (anonymous results persist to localStorage; the
 * background POST to /api/assessments simply 401s for anonymous users, which
 * the app handles by design). Only the dev server is needed.
 */
test.describe("assessment → verdict (anonymous)", () => {
  test("completing the full assessment lands on /results with a canon verdict", async ({ page }) => {
    // ~49 steps on a dev server that compiles routes on first hit.
    test.setTimeout(240_000);

    await completeFullAssessment(page);

    await expect(page).toHaveURL(/\/results$/);
    await expect(page.getByText("HōMI-Score out of 100")).toBeVisible();
    // ClientProviders AnimatePresence + results hydration — badge follows score.
    await expect(
      page.locator('[class*="bg-verdict-"]').or(page.getByText(VERDICT_BADGE)).first(),
    ).toBeVisible({ timeout: 30_000 });

    // The persisted result carries one of the four canonical verdict keys.
    // (We assert the enum, not thresholds — lib/scoring canon owns those.)
    const verdict = await page.evaluate(() => {
      const raw = window.localStorage.getItem("homi:last-assessment");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { result?: { verdict?: string } };
        return parsed.result?.verdict ?? null;
      } catch {
        return null;
      }
    });
    expect(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]).toContain(verdict);
  });
});
