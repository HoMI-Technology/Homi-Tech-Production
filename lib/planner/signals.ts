/* ------------------------------------------------------------------ */
/* Proactive signals from live planner state — cash flow, bills,       */
/* runway, path, score pillars, and stress algorithms.                 */
/*                                                                     */
/* Port of the reference planner's signals.ts, adapted to canon:      */
/*   - assessment is the canon ScoreResult from @/lib/score;          */
/*     hard-stops arrive as HardStopKey[] and are voiced through       */
/*     canon HARD_STOP_MESSAGES (never the reference's copy).          */
/*   - pillar scores read from result.pillars.{key}.total with maxes   */
/*     from canon PILLAR_MAX_POINTS.                                   */
/*   - verdict comparisons use the canon four-tier VerdictKey only.    */
/*   - bill due/overdue math threads an explicit `today` ISO through   */
/*     daysUntil so tests are deterministic (defaults to real today).  */
/* Pure module: no store imports.                                      */
/* ------------------------------------------------------------------ */

import { daysUntil, todayISO } from "./derived";
import { analyzeStress } from "./stress";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import type { ScoreResult } from "./score-result";
import type { Bill, DailyCheckin, PathSnapshot } from "./types";

export type SignalSeverity = "crimson" | "amber" | "yellow" | "cyan" | "emerald";

export type SignalTab = "overview" | "calendar" | "banking" | "wealth" | "plan";

export type SignalKind =
  | "hard_stop"
  | "cash"
  | "debt"
  | "bill"
  | "path"
  | "pillar"
  | "stress"
  | "nudge"
  | "celebration";

export interface PlannerSignal {
  id: string;
  severity: SignalSeverity;
  kind: SignalKind;
  title: string;
  body: string;
  actionLabel: string;
  actionTab: SignalTab;
  /** Optional chip label under title */
  meta?: string;
}

export interface SignalEngineInput {
  income: number;
  cashFlow: number;
  savingsRate: number;
  runwayMonths: number;
  dti: number;
  bills: Bill[];
  path: PathSnapshot | null;
  /** Canon scorer output; null when no assessment has run yet. */
  assessment: ScoreResult | null;
  portfolioValue: number;
  netWorth: number;
  dismissedIds?: string[];
  checkins?: DailyCheckin[];
  /** ISO date for "today" — defaults to real today (pass for determinism). */
  today?: string;
}

const SEVERITY_PRIORITY: Record<SignalSeverity, number> = {
  crimson: 0,
  amber: 1,
  yellow: 2,
  cyan: 3,
  emerald: 4,
};

export function derivePlannerSignals(input: SignalEngineInput): PlannerSignal[] {
  const signals: PlannerSignal[] = [];
  const dismissed = new Set(input.dismissedIds ?? []);
  const today = (input.today ?? todayISO()).slice(0, 10);

  if (input.assessment && input.assessment.hardStops.length > 0) {
    const first = input.assessment.hardStops[0]!.message;
    const n = input.assessment.hardStops.length;
    signals.push({
      id: "hard-stop-active",
      severity: "crimson",
      kind: "hard_stop",
      title: n === 1 ? "One hard-stop is active" : `${n} hard-stops are active`,
      body: `${first} Not yet is not no — it is protection.`,
      actionLabel: "Open Plan",
      actionTab: "plan",
      meta: "Protection",
    });
  }

  if (input.runwayMonths < 1) {
    signals.push({
      id: "runway-critical",
      severity: "crimson",
      kind: "cash",
      title: "Runway under 1 month",
      body: "Liquid cash covers less than one month of outflow. Build cash before stretching.",
      actionLabel: "See gauges",
      actionTab: "overview",
      meta: "Critical",
    });
  } else if (input.runwayMonths < 3) {
    signals.push({
      id: "runway-thin",
      severity: "amber",
      kind: "cash",
      title: "Runway under 3 months",
      body: `About ${input.runwayMonths.toFixed(1)} months of cushion. Aim for 3–6 before a big move.`,
      actionLabel: "Review cash",
      actionTab: "banking",
      meta: "Cash guard",
    });
  }

  if (input.dti > 50) {
    signals.push({
      id: "dti-critical",
      severity: "crimson",
      kind: "debt",
      title: "DTI is in the danger zone",
      body: `Debt payments are ${input.dti.toFixed(0)}% of income. Clear high-rate balances first.`,
      actionLabel: "Debt tools",
      actionTab: "plan",
      meta: "DTI",
    });
  } else if (input.dti > 36) {
    signals.push({
      id: "dti-warming",
      severity: "amber",
      kind: "debt",
      title: "DTI is warming",
      body: `Debt-to-income sits at ${input.dti.toFixed(0)}% — past the 36% comfort line.`,
      actionLabel: "Debt payoff",
      actionTab: "plan",
      meta: "DTI",
    });
  }

  if (input.cashFlow < 0) {
    signals.push({
      id: "negative-cashflow",
      severity: "crimson",
      kind: "cash",
      title: "Cash flow is negative this period",
      body: "Spending outpaces income. Cut or reschedule before new commitments.",
      actionLabel: "Open calendar",
      actionTab: "calendar",
      meta: "Cash flow",
    });
  }

  // ── Stress algorithms (slope / level / volatility / streak) ──
  const stress = analyzeStress(input.checkins ?? []);
  if (stress.shouldSignal) {
    signals.push({
      id: `stress-${stress.reasonCode}`,
      severity: stress.severity,
      kind: "stress",
      title: stress.label,
      body: `${stress.narrative} ${stress.nudge}`,
      actionLabel: "Open check-in",
      actionTab: "overview",
      meta: `Index ${stress.index}`,
    });
  } else if (stress.trend === "falling" && stress.latest != null && stress.latest <= 4) {
    signals.push({
      id: "stress-recovery",
      severity: "emerald",
      kind: "celebration",
      title: stress.label,
      body: stress.narrative,
      actionLabel: "Keep going",
      actionTab: "overview",
      meta: "Recovery",
    });
  }

  const openBills = input.bills.filter((b) => b.status !== "paid");
  const overdue = openBills.filter(
    (b) => b.status === "overdue" || daysUntil(b.dueDate, today) < 0,
  );
  if (overdue.length > 0) {
    const total = overdue.reduce((s, b) => s + b.amount, 0);
    signals.push({
      id: "bills-overdue",
      severity: "crimson",
      kind: "bill",
      title: `${overdue.length} overdue bill${overdue.length > 1 ? "s" : ""}`,
      body: `${overdue[0].name}${overdue.length > 1 ? ` + ${overdue.length - 1} more` : ""} — ${formatRough(total)} past due. If–then: open Banking → Pay now.`,
      actionLabel: "Pay bills",
      actionTab: "banking",
      meta: "If–then",
    });
  } else {
    const dueSoon = openBills
      .filter((b) => {
        const d = daysUntil(b.dueDate, today);
        return d >= 0 && d <= 3;
      })
      .sort((a, b) => daysUntil(a.dueDate, today) - daysUntil(b.dueDate, today));
    if (dueSoon.length > 0) {
      const d = daysUntil(dueSoon[0].dueDate, today);
      signals.push({
        id: "bills-due-soon",
        severity: d === 0 ? "amber" : "yellow",
        kind: "bill",
        title:
          d === 0 ? `${dueSoon[0].name} is due today` : `Bill due in ${d} day${d === 1 ? "" : "s"}`,
        body: `${dueSoon[0].name} · ${formatRough(dueSoon[0].amount)}${
          dueSoon.length > 1 ? ` · +${dueSoon.length - 1} more this week` : ""
        }.`,
        actionLabel: "Open calendar",
        actionTab: "calendar",
        meta: d === 0 ? "Due today" : "Due soon",
      });
    }
  }

  if (input.path) {
    const pending = input.path.steps.filter((s) => s.status === "pending");
    const stalled = pending.find((s) => s.daysFromNow <= 0);
    if (stalled) {
      signals.push({
        id: "path-stalled",
        severity: "amber",
        kind: "path",
        title: "Path step is overdue",
        body: `"${stalled.title}" is still open. Mark done or re-sequence — open loops tax readiness.`,
        actionLabel: "Path to Ready",
        actionTab: "plan",
        meta: "Stalled",
      });
    } else if (pending.length > 0 && input.path.mode === "build") {
      const next = pending[0];
      signals.push({
        id: "path-next",
        severity: "cyan",
        kind: "path",
        title: "Next Path step",
        body: `"${next.title}" — two-minute move: open Plan and clear or skip honestly.`,
        actionLabel: "View path",
        actionTab: "plan",
        meta: "Micro-step",
      });
    }
  } else {
    signals.push({
      id: "path-missing",
      severity: "cyan",
      kind: "path",
      title: "No Path to Ready yet",
      body: "Generate one binding-constraint sequence from live numbers. One path beats a wall of goals.",
      actionLabel: "Build path",
      actionTab: "plan",
      meta: "Start",
    });
  }

  if (input.assessment) {
    const { pillars } = input.assessment;
    const pillarRows = [
      {
        key: "financial",
        label: "Financial Reality",
        score: pillars.financial.total,
        max: PILLAR_MAX_POINTS.financial,
      },
      {
        key: "emotional",
        label: "Emotional Truth",
        score: pillars.emotional.total,
        max: PILLAR_MAX_POINTS.emotional,
      },
      {
        key: "timing",
        label: "Perfect Timing",
        score: pillars.timing.total,
        max: PILLAR_MAX_POINTS.timing,
      },
    ];
    // Only surface the weakest pillar under 60%
    const weak = pillarRows
      .map((p) => ({ ...p, pct: p.score / p.max }))
      .filter((p) => p.pct < 0.6)
      .sort((a, b) => a.pct - b.pct)[0];
    if (weak) {
      signals.push({
        id: `weak-pillar-${weak.key}`,
        severity: "amber",
        kind: "pillar",
        title: `${weak.label} is the gap`,
        body: `${weak.label} sits at ${Math.round(weak.pct * 100)}% of its max — the clearest place to focus next.`,
        actionLabel: "See score",
        actionTab: "overview",
        meta: "Pillar",
      });
    }
    if (input.assessment.verdict === "READY" && input.assessment.hardStops.length === 0) {
      signals.push({
        id: "ready-celebration",
        severity: "emerald",
        kind: "celebration",
        title: "Your compass is ready",
        body: "All three pillars align with no hard-stops. Move deliberately — not rushed.",
        actionLabel: "Plan tools",
        actionTab: "plan",
        meta: "Ready",
      });
    }
  }

  if (input.savingsRate < 5 && input.income > 0) {
    signals.push({
      id: "low-savings",
      severity: "yellow",
      kind: "cash",
      title: "Savings rate is thin",
      body: `Saving ${input.savingsRate.toFixed(0)}% of income. Path momentum wants closer to 15–20%.`,
      actionLabel: "Adjust ledger",
      actionTab: "overview",
      meta: "Margin",
    });
  }

  if (input.netWorth < 0) {
    signals.push({
      id: "negative-nw",
      severity: "amber",
      kind: "debt",
      title: "Net worth is negative",
      body: "Liabilities outweigh assets. Debt payoff and cash build move this first.",
      actionLabel: "Wealth",
      actionTab: "wealth",
      meta: "Balance sheet",
    });
  }

  const filtered = signals.filter((s) => !dismissed.has(s.id));
  filtered.sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity]);

  if (filtered.length === 0) {
    return [
      {
        id: "all-clear",
        severity: "emerald",
        kind: "celebration",
        title: "Nothing urgent right now",
        body: "No hard-stops, no overdue bills, runway holding. Steady readiness — check in when something changes.",
        actionLabel: "Overview",
        actionTab: "overview",
        meta: "Clear",
      },
    ];
  }

  const seen = new Set<string>();
  const unique: PlannerSignal[] = [];
  for (const s of filtered) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    unique.push(s);
    if (unique.length >= 6) break;
  }
  return unique;
}

function formatRough(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export const SIGNAL_SEVERITY_CLASS: Record<
  SignalSeverity,
  { border: string; bg: string; text: string; dot: string }
> = {
  crimson: {
    border: "border-crimson/35",
    bg: "bg-crimson/10",
    text: "text-crimson",
    dot: "bg-crimson",
  },
  amber: {
    border: "border-amber/35",
    bg: "bg-amber/10",
    text: "text-amber",
    dot: "bg-amber",
  },
  yellow: {
    border: "border-yellow/35",
    bg: "bg-yellow/10",
    text: "text-yellow",
    dot: "bg-yellow",
  },
  cyan: {
    border: "border-cyan/35",
    bg: "bg-cyan/10",
    text: "text-cyan",
    dot: "bg-cyan",
  },
  emerald: {
    border: "border-emerald/35",
    bg: "bg-emerald/10",
    text: "text-emerald",
    dot: "bg-emerald",
  },
};
