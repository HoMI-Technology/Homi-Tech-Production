/**
 * Scenario → Path generation: fund the wait-12 (or wait-24) plan.
 * Builds a Path to Ready from simulation inputs + readiness context.
 */

import type { AssessmentResult, Verdict } from "@/lib/scoring";
import type { ScenarioKey, SimulationInputs } from "@/lib/decisions/simulate";
import { PATH_DISCLAIMER, type PathStep, type ReadinessPath } from "./path";
import { runScenarioStudio } from "./scenario";

function id(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function step(partial: Omit<PathStep, "id" | "status" | "completedAt">): PathStep {
  return {
    ...partial,
    id: id(),
    status: "pending",
    completedAt: null,
  };
}

/**
 * Generate a path that funds the chosen wait scenario (default wait-12).
 */
export function generatePathFromScenario(opts: {
  inputs: SimulationInputs;
  scenarioKey?: ScenarioKey;
  assessmentResult?: AssessmentResult | null;
  assessmentCompletedAt?: string | null;
}): ReadinessPath {
  const scenarioKey = opts.scenarioKey ?? "wait-12";
  const studio = runScenarioStudio({
    ...opts.inputs,
    readinessVerdict: opts.assessmentResult?.verdict ?? null,
    readinessScore: opts.assessmentResult?.score ?? null,
  });
  const chosen = studio.scenarios.find((s) => s.key === scenarioKey) ?? studio.scenarios[1];
  const months = scenarioKey === "wait-24" ? 24 : scenarioKey === "wait-12" ? 12 : 0;
  const gap = Math.max(0, opts.inputs.homePrice * 0.2 - opts.inputs.downPaymentSaved);
  const monthlyNeeded =
    months > 0 ? Math.ceil(gap / months) : Math.max(opts.inputs.monthlySavings, 0);

  const verdict: Verdict = opts.assessmentResult?.verdict ?? "BUILD_FIRST";
  const score = opts.assessmentResult?.score ?? 55;
  const hardStops = opts.assessmentResult?.hardStops ?? [];

  const steps: PathStep[] = [];

  if (hardStops.some((h) => h.code === "RUNWAY_UNDER_1_MONTH")) {
    steps.push(
      step({
        title: "Clear runway hard-stop before funding a wait plan",
        kind: "deadline",
        daysFromNow: 3,
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        href: "/tools/runway",
        notes:
          "Protective gate blocks purchase timing. Stabilize cash buffer first. " + PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
      }),
    );
  }

  if (months > 0) {
    steps.push(
      step({
        title: `Fund the ${months}-month wait: save ~$${monthlyNeeded.toLocaleString("en-US")}/mo toward down payment`,
        kind: "milestone",
        daysFromNow: 7,
        reasonCode: "PILLAR_TIMING",
        href: "/tools/down-payment",
        notes:
          `Scenario ${chosen.label}: gap to 20% down is ~$${Math.round(gap).toLocaleString("en-US")}. ` +
          `At ${months} months that is ~$${monthlyNeeded.toLocaleString("en-US")}/mo (illustrative). ` +
          PATH_DISCLAIMER,
        fundingTarget: Math.round(gap),
        fundingLabel: "Down-payment gap to fund during wait",
      }),
    );
    steps.push(
      step({
        title: `Lock monthly auto-transfer of ~$${monthlyNeeded.toLocaleString("en-US")}`,
        kind: "deadline",
        daysFromNow: 14,
        reasonCode: "PILLAR_FINANCIAL",
        href: "/money",
        notes:
          "Path funding is intentional — record the transfer in Finance Command. " +
          PATH_DISCLAIMER,
        fundingTarget: monthlyNeeded,
        fundingLabel: "Monthly wait-plan transfer",
      }),
    );
  } else {
    steps.push(
      step({
        title: "Buy-now scenario: re-check Pre-Flight and affordability",
        kind: "deadline",
        daysFromNow: 3,
        reasonCode: "PILLAR_FINANCIAL",
        href: "/tools/preflight",
        notes:
          "Buy-now wins on net position in the model — still run protective gates. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
      }),
    );
  }

  steps.push(
    step({
      title: "Re-run scenario studio after 30 days of funded savings",
      kind: "review",
      daysFromNow: 30,
      reasonCode: "REASSESS",
      href: "/scenarios",
      notes: "Models drift when rates and savings change. " + PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
    }),
  );

  steps.push(
    step({
      title: "Re-take assessment before acting on the scenario",
      kind: "review",
      daysFromNow: Math.min(90, months > 0 ? months * 30 : 45),
      reasonCode: "REASSESS",
      href: "/assessment",
      notes: PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
    }),
  );

  return {
    id: id(),
    version: 1,
    createdAt: new Date().toISOString(),
    assessmentCompletedAt: opts.assessmentCompletedAt ?? null,
    verdict,
    score,
    bindingConstraint: months > 0 ? "PILLAR_TIMING" : "PILLAR_FINANCIAL",
    confidence: "assessment_only",
    disclaimer: PATH_DISCLAIMER,
    mode: "build",
    calendarCommittedAt: null,
    steps: steps.slice(0, 7),
  };
}
