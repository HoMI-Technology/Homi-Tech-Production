/**
 * Shared helpers for building the context payload sent to /api/advisor.
 * Used by the full-page Chat and the CompanionWidget so every Companion
 * surface stays in sync about what the Companion knows: the user's
 * assessment (score/verdict/pillars/hard stops), their live money picture
 * from the Finance Command dashboard, and which part of HōMI they're
 * standing in right now.
 */

import { loadLocalResult } from "@/lib/assessment/storage";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import {
  loadFinanceState,
  hasSavedFinanceState,
  financeSavedAt,
} from "@/lib/finance/store";
import {
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import {
  buildFinanceContextFromLedger,
  buildFinanceContextFromLegacy,
} from "@/lib/advisor/finance-context";
import { loadCreditState, hasSavedCreditState, creditSavedAt } from "@/lib/credit/store";
import { buildScoreExplanation } from "@/lib/advisor/explain";
import {
  loadReadinessPath,
  getFinanceSavedAtForPath,
  buildPathCoachPack,
} from "@/lib/readiness";
import type {
  AdvisorAssessmentContext,
  AdvisorCreditContext,
  AdvisorFinanceContext,
} from "@/lib/advisor/fallback";

/**
 * Whole days between an ISO timestamp and now; null when the age is not
 * trustworthy. Null covers three cases: missing, unparseable, and
 * *implausible* — a legacy/epoch-adjacent stamp (e.g. 1970) would otherwise
 * yield ~20,000 days, which the Companion faithfully reports as "your data is
 * almost 57 years old." Future stamps (negative age) are equally nonsensical.
 * In every untrusted case we return null so the context note says freshness is
 * unknown rather than surfacing a garbage number on a trust-critical surface.
 */
const MAX_PLAUSIBLE_AGE_DAYS = 3650; // ~10y; older than any real user data here
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 0 || days > MAX_PLAUSIBLE_AGE_DAYS) return null;
  return days;
}

export function buildAssessmentContext(): AdvisorAssessmentContext | undefined {
  const stored = loadLocalResult();
  if (!stored) return undefined;
  const { result } = stored;
  return {
    score: result.score,
    verdict: result.verdict,
    pillars: {
      financial: Math.round((result.financial.total / PILLAR_MAX_POINTS.financial) * 100),
      emotional: Math.round((result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100),
      timing: Math.round((result.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
    hardStops: result.hardStops.map((h) => h.message),
    ageDays: daysSince(stored.completedAt),
    previousScore: stored.previous?.score ?? null,
  };
}

/**
 * The user's money picture, derived from the Finance Command dashboard.
 * Returns undefined until the user has actually saved finance data — the
 * store's placeholder defaults must never be quoted back as "your numbers".
 */
export function buildFinanceContext(): AdvisorFinanceContext | undefined {
  if (hasSavedBudgetLedger()) {
    const ledger = loadBudgetLedger(new Date().toISOString());
    const ctx = buildFinanceContextFromLedger(ledger, new Date().toISOString());
    if (ctx) return ctx;
  }
  if (!hasSavedFinanceState()) return undefined;
  return buildFinanceContextFromLegacy(loadFinanceState(), financeSavedAt());
}

/**
 * The user's credit picture from the /credit page. Same defaults-leak gate
 * as finance: undefined until the user has actually saved credit data.
 */
export function buildCreditContext(): AdvisorCreditContext | undefined {
  if (!hasSavedCreditState()) return undefined;
  const state = loadCreditState();
  return {
    score: Math.round(state.score),
    utilization: Math.round(state.utilization),
    onTimeStreakMonths: Math.round(state.onTimeStreakMonths),
    ageDays: daysSince(creditSavedAt()),
  };
}

/**
 * Human-readable label for the surface the user is currently on, so the
 * Companion can meet them where they are ("you're in the mortgage
 * calculator") instead of talking from nowhere. Most-specific prefix wins;
 * unknown routes return undefined and the Companion simply doesn't mention
 * location.
 */
const SURFACE_LABELS: Array<[prefix: string, label: string]> = [
  ["/tools/mortgage", "the mortgage calculator"],
  ["/tools/affordability", "the affordability calculator"],
  ["/tools/down-payment", "the down payment planner"],
  ["/tools/debt-payoff", "the debt payoff planner"],
  ["/tools/rent-vs-buy", "the rent vs. buy comparison"],
  ["/tools/fire", "the FIRE calculator"],
  ["/tools/monte-carlo", "the Monte Carlo simulator"],
  ["/tools/roth-conversion", "the Roth conversion explorer"],
  ["/tools/runway", "the runway calculator"],
  ["/tools/blind-budget", "the blind budget exercise"],
  ["/tools", "the financial tools hub"],
  ["/finance", "the Finance Command dashboard"],
  ["/credit", "the credit overview"],
  ["/connections", "the bank connections page"],
  ["/genome", "their behavioral genome"],
  ["/dashboard", "their dashboard"],
  ["/assessment", "the readiness assessment"],
  ["/shadow-score", "the Shadow Score"],
  ["/results", "their assessment results"],
  ["/report", "their readiness report"],
  ["/path", "their Path to Ready"],
  ["/tools/preflight", "Decision Pre-Flight"],
  ["/scenarios", "the scenario studio"],
  ["/plan", "their readiness plan"],
  ["/simulator", "the scenario simulator"],
  ["/twin", "the future-self letter"],
  ["/trinity", "the Trinity Engine"],
  ["/decisions", "their decision log"],
  ["/journal", "their decision journal"],
  ["/daily", "their daily check-in"],
  ["/signals", "their signals feed"],
  ["/calendar", "their decision calendar"],
  ["/household", "the household hub (joint readiness, couples alignment, family mode)"],
  ["/goals", "their goals"],
];

export function buildSurfaceContext(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  return SURFACE_LABELS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

/**
 * The score-movement one-liner from the explainability engine — the same
 * source the /results "why did this change" card renders, so the Companion
 * and the view can never tell different stories. Undefined when there's no
 * previous assessment to compare against.
 */
export function buildWhatChanged(): string | undefined {
  const stored = loadLocalResult();
  if (!stored) return undefined;
  return buildScoreExplanation(stored)?.companionLine;
}

/**
 * Active Path to Ready from localStorage — educational next-step only.
 * Undefined when the user has not generated/committed a path.
 */
export interface AdvisorPathContext {
  verdict: string;
  bindingConstraint: string | null;
  nextStepTitle: string | null;
  nextStepHref: string | null;
  stepCount: number;
  mode: string;
  confidence: string;
  pendingCount: number;
  completedCount: number;
  completionPct: number;
  boardMeetingLine: string;
  isStale: boolean;
}

/**
 * Compact path block for the Companion — includes coach board-meeting line.
 * Next step prefers first pending non-REASSESS step.
 */
export function buildPathContext(): AdvisorPathContext | undefined {
  const path = loadReadinessPath();
  if (!path) return undefined;

  const coach = buildPathCoachPack(path, {
    financeSavedAt: getFinanceSavedAtForPath(),
  });

  return {
    verdict: path.verdict,
    bindingConstraint: coach.bindingLabel,
    nextStepTitle: coach.nextStepTitle,
    nextStepHref: coach.nextStepHref,
    stepCount: path.steps.length,
    mode: path.mode,
    confidence: path.confidence,
    pendingCount: coach.pendingCount,
    completedCount: coach.completedCount,
    completionPct: coach.completionPct,
    boardMeetingLine: coach.boardMeetingLine,
    isStale: coach.isStale,
  };
}

export interface CompanionContext {
  assessment: AdvisorAssessmentContext | undefined;
  finance: AdvisorFinanceContext | undefined;
  credit: AdvisorCreditContext | undefined;
  surface: string | undefined;
  whatChanged: string | undefined;
  path: AdvisorPathContext | undefined;
}

/** Everything the Companion knows about this user and this moment. */
export function buildCompanionContext(pathname?: string | null): CompanionContext {
  return {
    assessment: buildAssessmentContext(),
    finance: buildFinanceContext(),
    credit: buildCreditContext(),
    surface: buildSurfaceContext(pathname),
    whatChanged: buildWhatChanged(),
    path: buildPathContext(),
  };
}
