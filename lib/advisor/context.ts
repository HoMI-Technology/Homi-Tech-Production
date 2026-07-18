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
  netCashFlow,
  savingsRate,
  runwayMonths,
  debtToIncome,
  totalNetWorth,
} from "@/lib/finance/store";
import type { AdvisorAssessmentContext, AdvisorFinanceContext } from "@/lib/advisor/fallback";

/** Whole days between an ISO timestamp and now; null when unparseable. */
function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
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
  if (!hasSavedFinanceState()) return undefined;
  const state = loadFinanceState();
  const runway = runwayMonths(state);
  return {
    monthlyIncome: Math.round(state.monthlyIncome),
    netCashFlow: Math.round(netCashFlow(state)),
    savingsRate: Math.round(savingsRate(state) * 10) / 10,
    runwayMonths: Number.isFinite(runway) ? Math.round(runway * 10) / 10 : null,
    dti: Math.round(debtToIncome(state) * 10) / 10,
    liquidSavings: Math.round(state.liquidSavings),
    totalDebt: Math.round(state.totalDebt),
    netWorth: Math.round(totalNetWorth(state)),
    ageDays: daysSince(financeSavedAt()),
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
  ["/plan", "their readiness plan"],
  ["/simulator", "the scenario simulator"],
  ["/twin", "the future-self letter"],
  ["/trinity", "the Trinity Engine"],
  ["/decisions", "their decision log"],
  ["/journal", "their decision journal"],
  ["/daily", "their daily check-in"],
  ["/signals", "their signals feed"],
  ["/calendar", "their decision calendar"],
  ["/couples", "couples mode"],
  ["/family", "family mode"],
  ["/goals", "their goals"],
];

export function buildSurfaceContext(pathname: string | null | undefined): string | undefined {
  if (!pathname) return undefined;
  return SURFACE_LABELS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
}

export interface CompanionContext {
  assessment: AdvisorAssessmentContext | undefined;
  finance: AdvisorFinanceContext | undefined;
  surface: string | undefined;
}

/** Everything the Companion knows about this user and this moment. */
export function buildCompanionContext(pathname?: string | null): CompanionContext {
  return {
    assessment: buildAssessmentContext(),
    finance: buildFinanceContext(),
    surface: buildSurfaceContext(pathname),
  };
}
