import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** Nightly audit 2026-09-11 area Q — caution UI with unique copy but zero live mounts. */
const UNMOUNTED_CAUTION_UI = [
  "components/results/SaveStatusBanner.tsx",
  "components/results/SaveStatusBanner.test.tsx",
  "components/dashboard/OutcomeSurveyPrompt.tsx",
  "components/finance/ObservedPrefillCard.tsx",
  "components/layout/NotificationBell.tsx",
  "components/tools/SavedScenariosPanel.tsx",
] as const;

const KEPT_BACKEND = [
  "lib/assessment/save-status.ts",
  "lib/finance/observed-prefill.ts",
  "lib/finance/prefill-confirm.ts",
  "lib/outcomes/taxonomy.ts",
  "lib/notifications/rules.ts",
  "lib/tools/scenarios.ts",
  "app/api/cron/outcome-surveys/route.ts",
  "app/api/outcomes/surveys/route.ts",
  "app/api/finance/observed-prefill/route.ts",
  "components/tools/SaveScenarioButton.tsx",
  "components/assessment/FullAssessmentFlow.tsx",
] as const;

describe("nightly audit 2026-09-11 area Q", () => {
  it("deletes unmounted caution UI", () => {
    for (const rel of UNMOUNTED_CAUTION_UI) {
      expect(existsSync(resolve(ROOT, rel)), rel).toBe(false);
    }
  });

  it("keeps save-status, prefill, survey cron/API, and SaveScenarioButton", () => {
    for (const rel of KEPT_BACKEND) {
      expect(existsSync(resolve(ROOT, rel)), rel).toBe(true);
    }
  });
});
