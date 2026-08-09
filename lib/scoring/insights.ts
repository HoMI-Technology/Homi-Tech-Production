import "server-only";

/**
 * Personalized insight + next-step generation.
 * Server-only (Plans.md 6.5). Clients receive insights from /api/scoring.
 * Canonical behavior: name the strongest and weakest pillars with real
 * scores, and generate context-aware steps keyed off pillar weakness.
 * Voice: precision empathy, calm authority. Never shaming.
 */

import type { AssessmentResult } from "./engine";
import { PILLAR_MAX_POINTS } from "./weights";

interface PillarScore {
  key: "financial" | "emotional" | "timing";
  name: string;
  /** Normalized 0-100 for display. */
  pct: number;
}

function normalizedPillars(result: AssessmentResult): PillarScore[] {
  return [
    {
      key: "financial",
      name: "Financial Reality",
      pct: Math.round((result.financial.total / PILLAR_MAX_POINTS.financial) * 100),
    },
    {
      key: "emotional",
      name: "Emotional Truth",
      pct: Math.round((result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100),
    },
    {
      key: "timing",
      name: "Perfect Timing",
      pct: Math.round((result.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
  ];
}

/** One personalized paragraph naming strongest + weakest pillar. */
export function generateKeyInsight(result: AssessmentResult): string {
  const pillars = normalizedPillars(result).sort((a, b) => b.pct - a.pct);
  const strongest = pillars[0];
  const weakest = pillars[2];

  if (result.hardStops.length > 0) {
    return (
      `Your strongest signal is ${strongest.name} (${strongest.pct}/100), ` +
      `but a red-line condition is active. This is a protection signal — ` +
      `not a judgment. Clear it first, and the rest of your readiness is waiting for you.`
    );
  }

  if (pillars.every((p) => p.pct >= 80)) {
    return (
      `Your strongest signal is ${strongest.name} (${strongest.pct}/100). ` +
      `All three pillars show favorable readiness. When all three align — truly align — ` +
      `your compass becomes a key.`
    );
  }

  // A 15+ point spread is a real gap; calling it "balanced" would be
  // dishonest. Below 15, the pillars genuinely move together.
  if (strongest.pct - weakest.pct >= 15) {
    return (
      `Your strongest signal is ${strongest.name} (${strongest.pct}/100). ` +
      `The gap is ${weakest.name} (${weakest.pct}/100) — and that gap is the map. ` +
      `This is the part we build first.`
    );
  }

  return (
    `Your readiness is balanced: ${strongest.name} at ${strongest.pct}/100 and ` +
    `${weakest.name} at ${weakest.pct}/100 are moving together. No single pillar is ` +
    `holding you back — steady building across all three moves you fastest.`
  );
}

/** Up to 5 context-aware next steps keyed off which pillars are below 60 / 80. */
export function generateNextSteps(result: AssessmentResult): string[] {
  const steps: string[] = [];
  const f = result.financial;
  const e = result.emotional;
  const t = result.timing;
  const fPct = (f.total / PILLAR_MAX_POINTS.financial) * 100;
  const ePct = (e.total / PILLAR_MAX_POINTS.emotional) * 100;
  const tPct = (t.total / PILLAR_MAX_POINTS.timing) * 100;

  for (const stop of result.hardStops) {
    switch (stop.code) {
      case "DTI_OVER_50":
        steps.push(
          "Bring your debt-to-income ratio below 43% before anything else — pay down the highest-rate balance first.",
        );
        break;
      case "HOUSING_RATIO_OVER_45":
        steps.push(
          "Re-scope the target home so the monthly payment stays under 36% of your gross income.",
        );
        break;
      case "RUNWAY_UNDER_1_MONTH":
        steps.push(
          "Build at least one month of expenses in cash before any other move. Runway comes first.",
        );
        break;
      case "CREDIT_UNDER_620":
        steps.push(
          "Rebuild credit above 660: on-time payments and lower utilization move this fastest.",
        );
        break;
    }
  }

  if (fPct < 60) {
    if (f.emergencyFund < 5) steps.push("Build your emergency fund to 3–6 months of expenses.");
    if (f.debtToIncome < 7)
      steps.push("Reduce monthly debt payments until your DTI sits at or below 36%.");
    if (f.downPayment < 7)
      steps.push("Grow the down payment toward 10–20% — every point cuts your monthly cost.");
    if (f.creditHealth < 5)
      steps.push("Push your credit score above 700 to unlock materially better pricing.");
  } else if (fPct < 80) {
    if (f.emergencyFund < 8)
      steps.push("Top the emergency fund up to a full 6 months — that's where READY lives.");
    if (f.creditHealth < 7)
      steps.push("A credit score above 740 earns the best tier. You're close.");
  }

  if (ePct < 60) {
    steps.push(
      "Sit with the emotional side honestly: write down why now, and who is applying the pressure.",
    );
    if (e.fomoCheck < 4)
      steps.push(
        "The urgency you feel is external, not internal. Give the decision 30 quiet days.",
      );
    if (!e.singleRedistribution && e.partnerAlignment < 5)
      steps.push(
        "Get truly aligned with your partner before moving — misalignment compounds after closing.",
      );
  } else if (ePct < 80 && e.fomoCheck < 6) {
    steps.push("Notice the pressure sources around you — cooling them buys back clarity.");
  }

  if (tPct < 60) {
    if (t.savingsRate < 7)
      steps.push("Raise your savings rate toward 20% of income — timing follows momentum.");
    if (t.downPaymentProgress < 7)
      steps.push("Set a monthly auto-transfer toward the down-payment goal and track progress.");
    if (t.timeHorizon < 7)
      steps.push("Extend your timeline past 6 months. Rushed timing is the most expensive kind.");
  } else if (tPct < 80 && t.downPaymentProgress < 10) {
    steps.push("You're past the halfway mark on the down payment — hold the pace.");
  }

  if (steps.length === 0) {
    steps.push(
      "Re-take the assessment in 30 days to confirm your readiness holds steady.",
      "Lock your rate research now so you can move deliberately when it matters.",
    );
  }

  return steps.slice(0, 5);
}
