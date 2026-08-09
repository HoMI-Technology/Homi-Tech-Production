import { expect, type Locator, type Page } from "@playwright/test";
import { dismissCookieConsent } from "./consent";

/**
 * Drives the real full-assessment flow (/assessment → /results) the way a
 * person would: answer whatever each step asks, then continue.
 *
 * The flow renders 45 canonical questions of three shapes (see
 * components/assessment/BankQuestionField.tsx):
 *   - single_choice → clickable radio cards ([role=radio][aria-checked])
 *   - number        → input[type=number] (valid when > 0)
 *   - slider        → input[type=range] (answered once interacted with)
 * plus pillar intros, two optional conflict checks (Continue/Skip), and a
 * review step with the submit button. The decision-type picker is omitted
 * while only home_buying is in ACTIVE_DECISION_TYPES (auto-set).
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

/**
 * Set a number field via the native value setter so framer-motion /
 * step-shell remounts cannot detach the node mid-click/fill.
 */
async function setReactNumberInput(assessmentPane: Locator): Promise<void> {
  const field = assessmentPane.getByRole("spinbutton").first();
  await expect(field).toBeVisible({ timeout: 15_000 });
  await field.evaluate((el) => {
    const input = el as HTMLInputElement;
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
    proto?.set?.call(input, "5000");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export async function completeFullAssessment(page: Page): Promise<void> {
  // Clear drafts before the app reads them on mount.
  await page.addInitScript(() => {
    localStorage.removeItem("homi:assessment-draft");
    localStorage.removeItem("homi:last-assessment");
  });

  await page.goto("/assessment");
  await dismissCookieConsent(page);

  // Both ClientProviders and the product layout render id="main"; the inner one
  // holds the assessment flow, so .last() targets the flow rather than the shell.
  const assessmentPane = page.locator("main#main").last();

  await expect(assessmentPane.getByText(STEP_COUNTER)).toBeVisible({ timeout: 30_000 });

  const resumeBanner = page.getByText("Resume where you left off");
  if (await resumeBanner.isVisible().catch(() => false)) {
    await assessmentPane.getByRole("button", { name: "Start over" }).click();
    await expect(resumeBanner).toBeHidden({ timeout: 10_000 });
    await expect(assessmentPane.getByText("Step 1 of")).toBeVisible({ timeout: 10_000 });
  }

  const counter = assessmentPane.getByText(STEP_COUNTER);
  const reviewHeading = assessmentPane.getByRole("heading", { name: "Review your answers" });

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (await reviewHeading.isVisible()) break;

    const before = (await counter.textContent()) ?? "";

    const slider = assessmentPane.locator('input[type="range"]').first();
    const number = assessmentPane.getByRole("spinbutton").first();
    const choiceCard = assessmentPane
      .locator('button[role="radio"][aria-checked="false"]:not([disabled])')
      .first();

    if (await slider.count()) {
      await slider.click();
      await slider.press("ArrowRight");
    } else if (await number.count()) {
      await setReactNumberInput(assessmentPane);
    } else if (await choiceCard.count()) {
      await choiceCard.click();
    }

    const action = assessmentPane.getByRole("button", { name: /^(Continue|Skip)$/ });
    await expect(action).toBeEnabled({ timeout: 15_000 });
    // Let step-enter CSS animation finish so onNext isn't dropped mid-transition.
    await page.waitForTimeout(STEP_ANIM_MS);

    // Retry Continue once if the step counter doesn't advance (motion flake).
    await expect(async () => {
      if (await reviewHeading.isVisible()) return;
      await action.click();
      if (!before) return;
      await expect(counter).not.toHaveText(before, { timeout: 5_000 });
    }).toPass({ timeout: 25_000 });
  }

  await expect(reviewHeading).toBeVisible();
  await assessmentPane.getByRole("button", { name: "See my HōMI-Score" }).click();
  await page.waitForURL("**/results");
}
