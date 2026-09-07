import { expect, type Locator, type Page } from "@playwright/test";
import { dismissCookieConsent } from "./consent";
import {
  DECISION_TYPE_LABELS,
  type DecisionType,
} from "../../lib/assessment/types";

/**
 * Drives the real full-assessment flow (/assessment → /dashboard) the way a
 * person would: answer whatever each step asks, then continue.
 *
 * Signed-in completion lands on Home Build (F8). Guests never finish scoring.
 *
 * The flow renders ~45 canonical questions of three shapes (see
 * components/assessment/BankQuestionField.tsx):
 *   - single_choice → clickable radio cards ([role=radio][aria-checked])
 *   - number        → input[type=number] (valid when > 0)
 *   - slider        → input[type=range] (answered once interacted with)
 * plus pillar intros, two optional conflict checks (Continue/Skip), and a
 * review step with the submit button.
 *
 * Decision-type picker (Plans.md F.14): when only one vertical is active the
 * picker is omitted (home auto-set). When a second vertical activates, the
 * picker appears — this helper pins the decision type by accessible name so
 * e2e never silently clicks an unchecked alternate vertical.
 *
 * 5.9 phase 2 is live: the picker offers home + car. This helper pins the
 * requested vertical by accessible name before any "first unchecked radio"
 * heuristic, so home e2e stays home and car e2e is `{ decisionType: "car" }`.
 *
 * The helper is intentionally black-box for question steps: it detects the
 * field shape per step instead of hardcoding question ids, so question-bank
 * edits don't break the smoke path. Answers are "valid but unremarkable" —
 * the spec asserts the verdict PIPELINE (flow → score → badge), not a
 * particular score.
 */

/** VerdictBadge labels (lib/brand VERDICT_META) as one matcher. */
export const VERDICT_BADGE = /READY|ALMOST THERE|BUILD FIRST|NOT YET/;

const STEP_COUNTER = /^Step \d+ of \d+$/;
const PATH_PROGRESS = / of ~\d+ this path$/;
const MAX_STEPS = 60; // adaptive home is ~20 steps; car cookie-cutter ~40; headroom
const STEP_ANIM_MS = 450; // StepShell step-enter-anim duration (420ms) + buffer

export type CompleteFullAssessmentOptions = {
  /** Decision vertical to pin when the picker is shown. Defaults to home. */
  decisionType?: DecisionType;
};

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

/**
 * If the decision-type picker is on screen, select the requested vertical by
 * its accessible name (DECISION_TYPE_LABELS). No-op when the picker is omitted
 * (single active vertical).
 */
async function selectDecisionTypeIfPresent(
  assessmentPane: Locator,
  decisionType: DecisionType,
): Promise<boolean> {
  const label = DECISION_TYPE_LABELS[decisionType];
  const decisionPrompt = assessmentPane.getByText("What decision are you working through?");
  if (!(await decisionPrompt.isVisible().catch(() => false))) {
    return false;
  }
  const option = assessmentPane.getByRole("radio", { name: label });
  await expect(option).toBeVisible({ timeout: 10_000 });
  // Already selected (e.g. home preselected) — still fine to click; ensure pinned.
  await option.click();
  await expect(option).toHaveAttribute("aria-checked", "true");
  return true;
}

export async function completeFullAssessment(
  page: Page,
  options: CompleteFullAssessmentOptions = {},
): Promise<void> {
  const decisionType = options.decisionType ?? "home_buying";

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

  await expect(
    assessmentPane
      .getByRole("button", { name: /^(Continue|Skip|Resume)$/ })
      .or(assessmentPane.getByText(PATH_PROGRESS))
      .or(assessmentPane.getByText(STEP_COUNTER)),
  ).toBeVisible({ timeout: 30_000 });

  const resumeBanner = page.getByText("Resume where you left off");
  if (await resumeBanner.isVisible().catch(() => false)) {
    await assessmentPane.getByRole("button", { name: "Start over" }).click();
    await expect(resumeBanner).toBeHidden({ timeout: 10_000 });
    await expect(
      assessmentPane.getByRole("button", { name: /^(Continue|Skip)$/ }),
    ).toBeVisible({ timeout: 10_000 });
  }

  const counter = assessmentPane.locator("[data-assessment-step]").first();
  const reviewHeading = assessmentPane.getByRole("heading", { name: "Review your answers" });

  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (await reviewHeading.isVisible()) break;

    const before = (await counter.getAttribute("data-assessment-step")) ?? "";

    // F.14: pin decision type by accessible name before any "first unchecked
    // radio" heuristic — otherwise an enabled alternate vertical would steal
    // the click the moment it activates.
    const pinnedDecision = await selectDecisionTypeIfPresent(assessmentPane, decisionType);

    if (!pinnedDecision) {
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
      await expect(counter).not.toHaveAttribute("data-assessment-step", before, { timeout: 5_000 });
    }).toPass({ timeout: 25_000 });
  }

  await expect(reviewHeading).toBeVisible();
  await assessmentPane.getByRole("button", { name: "See my Decision Readiness Score" }).click();
  // Signed-in completion lands on Home Build (F8). Guests never finish scoring.
  await page.waitForURL("**/dashboard");
}
