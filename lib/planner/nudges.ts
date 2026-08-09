/* ------------------------------------------------------------------ */
/* Behavior nudge techniques for the HōMI planner.                     */
/*                                                                     */
/* Port of the reference planner's nudges.ts — grounded in protective */
/* honesty (not gamified guilt):                                       */
/* - Implementation intentions ("when X, do Y")                        */
/* - Micro-commitments (tiny next step)                                */
/* - Fresh-start effect (after payday / week boundary)                 */
/* - Identity language (you as protector of the decision)              */
/* - Loss aversion only for true hard-stops (protection, not FOMO)     */
/* - Progress framing when score/path moved (closed loop)              */
/*                                                                     */
/* Nudges are suggestions — never dark patterns, never fake urgency.   */
/*                                                                     */
/* Canon adaptations:                                                  */
/*   - assessment is the canon ScoreResult from @/lib/score;          */
/*     hard-stop copy comes from canon HARD_STOP_MESSAGES.             */
/*   - the reference read raw partner alignment off its own scorer;   */
/*     canon ScoreResult carries pillar points, not the raw slider,   */
/*     so rule 8 takes an explicit `partnerAlignment` input (1–10,     */
/*     from the readiness profile / household partner).                */
/*   - bill math threads the `today` input through daysUntil for      */
/*     deterministic tests.                                            */
/* Pure module: no store imports.                                      */
/* ------------------------------------------------------------------ */

import { daysUntil, todayISO } from "./derived";
import type { StressAnalysis } from "./stress";
import type { ScoreResult } from "./score-result";
import type { Bill, PathSnapshot } from "./types";

export type NudgeKind =
  | "implementation_intention"
  | "micro_commitment"
  | "fresh_start"
  | "identity"
  | "protect_decision"
  | "progress"
  | "social_sync";

export type NudgeTab = "overview" | "calendar" | "banking" | "wealth" | "plan";

export interface BehaviorNudge {
  id: string;
  kind: NudgeKind;
  priority: number; // lower = more urgent
  title: string;
  body: string;
  actionLabel: string;
  actionTab: NudgeTab;
  /** Optional one-liner for toast / hero */
  chip?: string;
}

export interface NudgeEngineInput {
  /** Canon scorer output; null when no assessment has run yet. */
  assessment: ScoreResult | null;
  bills: Bill[];
  path: PathSnapshot | null;
  stress: StressAnalysis;
  cashFlow: number;
  runwayMonths: number;
  savingsRate: number;
  /** ISO date for "today" — defaults to real today */
  today?: string;
  /** Last closed-loop delta if any */
  lastScoreDelta?: number | null;
  /** Raw partner-alignment slider (1–10); null/0 = no partner signal. */
  partnerAlignment?: number | null;
}

function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

/**
 * Ranked behavioral nudges from live state.
 * Cap callers to 1–3; never spam.
 */
export function deriveBehaviorNudges(input: NudgeEngineInput): BehaviorNudge[] {
  const nudges: BehaviorNudge[] = [];
  const today = (input.today ?? todayISO()).slice(0, 10);
  const openBills = input.bills.filter((b) => b.status !== "paid");
  const overdue = openBills.filter(
    (b) => b.status === "overdue" || daysUntil(b.dueDate, today) < 0,
  );
  const dueSoon = openBills
    .filter((b) => {
      const d = daysUntil(b.dueDate, today);
      return d >= 0 && d <= 2;
    })
    .sort((a, b) => daysUntil(a.dueDate, today) - daysUntil(b.dueDate, today));

  // 1. Protect the decision — hard-stops / runway
  if (input.assessment && input.assessment.hardStops.length > 0) {
    const hs = input.assessment.hardStops[0]!.message;
    nudges.push({
      id: "nudge-protect-hardstop",
      kind: "protect_decision",
      priority: 1,
      title: "Protect the decision first",
      body: `${hs} One protective move beats three optimistic ones.`,
      actionLabel: "See hard-stops",
      actionTab: "plan",
      chip: "Protection mode",
    });
  } else if (input.runwayMonths < 3) {
    nudges.push({
      id: "nudge-protect-runway",
      kind: "protect_decision",
      priority: 2,
      title: "Guard the cash cushion",
      body: `Runway is ~${input.runwayMonths.toFixed(1)} months. Pause stretch spending until you cross 3.`,
      actionLabel: "Review cash",
      actionTab: "banking",
      chip: "Runway guard",
    });
  }

  // 2. Implementation intention — overdue / due-soon bills
  if (overdue.length > 0) {
    const b = overdue[0];
    nudges.push({
      id: "nudge-ii-overdue",
      kind: "implementation_intention",
      priority: 1,
      title: `When you open Banking, pay ${b.name}`,
      body: `If–then: open bill pay → select ${b.name} → Pay now. Clear the past-due loop in one sitting.`,
      actionLabel: "Pay now",
      actionTab: "banking",
      chip: "If–then",
    });
  } else if (dueSoon.length > 0) {
    const b = dueSoon[0];
    const d = daysUntil(b.dueDate, today);
    nudges.push({
      id: "nudge-ii-due",
      kind: "implementation_intention",
      priority: 3,
      title:
        d === 0
          ? `When you finish this screen, pay ${b.name}`
          : `When tomorrow starts, pay ${b.name}`,
      body: `If–then plan: open Banks & bills → pay ${b.name} before the due line. Removes ambient load.`,
      actionLabel: "Schedule / pay",
      actionTab: "banking",
      chip: "If–then",
    });
  }

  // 3. Micro-commitment — path next step
  if (input.path) {
    const pending = input.path.steps.filter((s) => s.status === "pending");
    if (pending.length > 0) {
      const next = pending[0];
      const short = next.title.length > 48 ? `${next.title.slice(0, 46)}…` : next.title;
      nudges.push({
        id: "nudge-micro-path",
        kind: "micro_commitment",
        priority: 4,
        title: "Two-minute Path move",
        body: `Micro-commitment: mark progress on “${short}” or skip it honestly. Open loops tax readiness.`,
        actionLabel: "Open Path",
        actionTab: "plan",
        chip: "2-min step",
      });
    }
  } else {
    nudges.push({
      id: "nudge-micro-generate-path",
      kind: "micro_commitment",
      priority: 5,
      title: "Generate one binding path",
      body: "Micro-commitment: create Path to Ready once. One sequence beats a wall of goals.",
      actionLabel: "Build path",
      actionTab: "plan",
      chip: "Start path",
    });
  }

  // 4. Stress-aligned nudge
  if (input.stress.shouldSignal) {
    nudges.push({
      id: "nudge-stress",
      kind: input.stress.reasonCode === "spike" ? "identity" : "protect_decision",
      priority: input.stress.severity === "crimson" ? 2 : 5,
      title: input.stress.label,
      body: `${input.stress.narrative} → ${input.stress.nudge}`,
      actionLabel: "Check in",
      actionTab: "overview",
      chip: "Stress pattern",
    });
  } else if (input.stress.sampleSize > 0 && input.stress.sampleSize < 3) {
    nudges.push({
      id: "nudge-stress-baseline",
      kind: "micro_commitment",
      priority: 8,
      title: "Finish the stress baseline",
      body: "Three check-ins unlock slope and volatility detection. Today’s score is enough.",
      actionLabel: "Log stress",
      actionTab: "overview",
      chip: "Baseline",
    });
  }

  // 5. Fresh-start effect (1st / 15th-ish of month — payday-ish)
  const dom = dayOfMonth(today);
  if (dom === 1 || dom === 15 || dom === 16) {
    nudges.push({
      id: "nudge-fresh-start",
      kind: "fresh_start",
      priority: 6,
      title: "Fresh-start window",
      body: "Calendar edge detected. People re-commit more on day 1 and mid-month — good day to regenerate Path from live numbers.",
      actionLabel: "Regenerate path",
      actionTab: "plan",
      chip: "Fresh start",
    });
  }

  // 6. Progress / closed-loop reinforcement
  if (input.lastScoreDelta != null && Math.abs(input.lastScoreDelta) >= 0.5) {
    const up = input.lastScoreDelta > 0;
    nudges.push({
      id: "nudge-progress",
      kind: "progress",
      priority: 3,
      title: up ? "You moved the number" : "The number told the truth",
      body: up
        ? `Closed loop: readiness +${input.lastScoreDelta.toFixed(1)}. Reinforce the action that caused it — not a new habit stack.`
        : `Closed loop: readiness ${input.lastScoreDelta.toFixed(1)}. Honesty is progress. Pick the smallest reverse move.`,
      actionLabel: "See overview",
      actionTab: "overview",
      chip: "Closed loop",
    });
  }

  // 7. Identity — savings / cash flow when calm enough to hear it
  if (
    input.cashFlow > 0 &&
    input.savingsRate < 15 &&
    input.assessment &&
    input.assessment.hardStops.length === 0
  ) {
    nudges.push({
      id: "nudge-identity-saver",
      kind: "identity",
      priority: 9,
      title: "You protect future-you with margin",
      body: `Cash flow is positive; savings rate is ${input.savingsRate.toFixed(0)}%. Identity nudge: auto-move a fixed slice to savings before lifestyle expands.`,
      actionLabel: "Adjust ledger",
      actionTab: "overview",
      chip: "Identity",
    });
  }

  // 8. Household / social sync when partner alignment is weak
  const partnerAlignment = input.partnerAlignment ?? null;
  if (partnerAlignment != null && partnerAlignment > 0 && partnerAlignment < 4.5) {
    nudges.push({
      id: "nudge-social-sync",
      kind: "social_sync",
      priority: 7,
      title: "Align with your partner on one number",
      body: "Partner alignment is the soft gap. One shared number (max housing payment or runway target) beats a full budget debate.",
      actionLabel: "Household",
      actionTab: "plan",
      chip: "Sync",
    });
  }

  nudges.sort((a, b) => a.priority - b.priority);

  // Deduplicate by id, keep top 4
  const seen = new Set<string>();
  const out: BehaviorNudge[] = [];
  for (const n of nudges) {
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
    if (out.length >= 4) break;
  }
  return out;
}

export const NUDGE_KIND_LABEL: Record<NudgeKind, string> = {
  implementation_intention: "If–then",
  micro_commitment: "Micro-step",
  fresh_start: "Fresh start",
  identity: "Identity",
  protect_decision: "Protect",
  progress: "Progress",
  social_sync: "Sync",
};
