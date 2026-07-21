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
const MAX_STEPS = 60; // flow is ~52 steps today; headroom, never an infinite loop
const STEP_ANIM_MS = 450; // StepShell step-enter-anim duration (420ms) + buffer

async function setReactNumberInput(page: Page): Promise<void> {
  const field = page.getByRole("spinbutton").first();
  await field.click();
  await field.fill("5000");
}

export async function completeFullAssessment(page: Page): Promise<void> {
  // Pin English so review-step copy matches (PR #70 adds /es routing).
  await page.context().addCookies([
    { name: "NEXT_LOCALE", value: "en", domain: "localhost", path: "/" },
  ]);

  // Clear drafts before the app reads them on mount.
  await page.addInitScript(() => {
    localStorage.removeItem("homi:assessment-draft");
    localStorage.removeItem("homi:last-assessment");
  });

  await page.goto("/assessment");

  const acceptCookies = page.getByRole("button", { name: "Accept" });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }

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
    const number = page.getByRole("spinbutton").first();
    const choiceCard = page
      .locator('main button[aria-pressed="false"]:not([disabled])')
      .first();

    if (await slider.count()) {
      await slider.click();
      await slider.press("ArrowRight");
    } else if (await number.count()) {
      await setReactNumberInput(page);
    } else if (await choiceCard.count()) {
      await choiceCard.click();
    }

    const action = page.getByRole("button", { name: /^(Continue|Skip)$/ });
    await expect(action).toBeEnabled({ timeout: 15_000 });
    // Let step-enter CSS animation finish so onNext isn't dropped mid-transition.
    await page.waitForTimeout(STEP_ANIM_MS);

    // Retry Continue once if the step counter doesn't advance (i18n/motion flake).
    await expect(async () => {
      if (await reviewHeading.isVisible()) return;
      await action.click();
      if (!before) return;
      await expect(counter).not.toHaveText(before, { timeout: 5_000 });
    }).toPass({ timeout: 25_000 });
  }

  await expect(reviewHeading).toBeVisible();
  await page.getByRole("button", { name: "See my HōMI-Score" }).click();
  await page.waitForURL("**/results");
}
