import { expect, type Page } from "@playwright/test";

/**
 * Drives the real full-assessment flow (/assessment → /results) the way a
 * person would: answer whatever each step asks, then continue.
 *
 * The flow renders 45 canonical questions of three shapes (see
 * components/assessment/BankQuestionField.tsx):
 *   - single_choice → clickable cards (button[aria-pressed])
 *   - number        → input[type=number] (valid when > 0)
 *   - slider        → input[type=range] (answered once interacted with)
 * plus pillar intros, a decision picker, two optional conflict checks
 * (Continue/Skip), and a review step with the submit button.
 *
 * The helper is intentionally black-box: it detects the field shape per step
 * instead of hardcoding question ids, so question-bank edits don't break the
 * smoke path. Answers are "valid but unremarkable" — the spec asserts the
 * verdict PIPELINE (flow → score → badge), not a particular score.
 */

/** VerdictBadge labels (lib/brand VERDICT_META) as one matcher. */
export const VERDICT_BADGE = /READY|ALMOST THERE|BUILD FIRST|NOT YET/;

const STEP_COUNTER = /^Step \d+ of \d+$/;
const MAX_STEPS = 60; // flow is ~49 steps; headroom, never an infinite loop

export async function completeFullAssessment(page: Page): Promise<void> {
  await page.goto("/assessment");

  // A leftover draft banner only appears when localStorage has an in-progress
  // draft (never in a fresh context, but stay deterministic if reused).
  const startOver = page.getByRole("button", { name: "Start over" });
  if (await startOver.isVisible().catch(() => false)) {
    await startOver.click();
  }

  const counter = page.getByText(STEP_COUNTER);
  const reviewHeading = page.getByRole("heading", { name: "Review your answers" });

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (await reviewHeading.isVisible()) break;

    const before = (await counter.textContent()) ?? "";

    const slider = page.locator('input[type="range"]').first();
    const number = page.locator('input[type="number"]').first();
    const choiceCard = page.locator('button[aria-pressed="false"]:not([disabled])').first();

    if (await slider.count()) {
      // Clicking sets a value at the click point; ArrowRight guarantees a
      // change event even if the click landed on the current position.
      await slider.click();
      await slider.press("ArrowRight");
    } else if (await number.count()) {
      // Framer-motion page transitions remount fields; set value via DOM to
      // avoid Playwright stability/detach flakes on CI.
      await page.locator('input[type="number"]').first().evaluate((el) => {
        const input = el as HTMLInputElement;
        input.value = "5000";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    } else if (await choiceCard.count()) {
      await choiceCard.click();
    }
    // Pillar intros and the decision picker have nothing to fill — just continue.

    await page.getByRole("button", { name: /^(Continue|Skip)$/ }).click();

    // Every transition advances the "Step N of M" counter — wait for it.
    if (before) {
      await expect(counter).not.toHaveText(before);
    }
  }

  await expect(reviewHeading).toBeVisible();
  await page.getByRole("button", { name: "See my HōMI-Score" }).click();
  await page.waitForURL("**/results");
}
