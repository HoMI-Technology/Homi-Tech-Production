/**
 * The authority flip — server-side context assembly (blueprint Phase 2's
 * final item). For signed-in users the Companion's knowledge is assembled
 * HERE, from the database the user's account actually owns (RLS-scoped
 * session client), and the client-sent context becomes a fallback for
 * anonymous users and rows that don't exist server-side yet.
 *
 * This is also the canonical readiness-state contract from the strategy
 * corpus, adapted: one object carrying every block with its provenance,
 * that the route folds into the prompt. Best-effort throughout — each block
 * degrades to null independently, and a total failure returns null so the
 * route falls back to client context rather than breaking the chat.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import {
  DEFAULT_FINANCE_STATE,
  netCashFlow,
  savingsRate,
  runwayMonths,
  debtToIncome,
  totalNetWorth,
  type FinanceState,
} from "@/lib/finance/store";
import type {
  AdvisorAssessmentContext,
  AdvisorCreditContext,
  AdvisorFinanceContext,
} from "@/lib/advisor/fallback";
import { buildFinanceContextFromLedgerTables } from "@/lib/advisor/finance-context";
import type { VerdictKey } from "@/lib/brand";

/** Same plausibility rules as the client spine (lib/advisor/context.ts). */
const MAX_PLAUSIBLE_AGE_DAYS = 3650;
function daysSince(epochMs: number | null): number | null {
  if (epochMs === null || !Number.isFinite(epochMs)) return null;
  const days = Math.floor((Date.now() - epochMs) / 86_400_000);
  if (days < 0 || days > MAX_PLAUSIBLE_AGE_DAYS) return null;
  return days;
}
function parseIso(iso: unknown): number | null {
  if (typeof iso !== "string") return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

/** The canonical server-assembled readiness state. */
export interface ServerCompanionState {
  assessment: AdvisorAssessmentContext | null;
  finance: AdvisorFinanceContext | null;
  credit: AdvisorCreditContext | null;
  generatedAt: string;
}

const VERDICTS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

async function assembleAssessment(supabase: SupabaseClient): Promise<AdvisorAssessmentContext | null> {
  try {
    const { data, error } = await supabase
      .from("assessments")
      .select("overall_score, verdict, financial_score, emotional_score, timing_score, hard_stops, completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(2);
    if (error || !data || data.length === 0) return null;

    const latest = data[0];
    const score = Number(latest.overall_score);
    const verdict = latest.verdict as VerdictKey;
    if (!Number.isFinite(score) || !VERDICTS.includes(verdict)) return null;

    const pillarPct = (raw: unknown, max: number) => {
      const n = Number(raw);
      return Number.isFinite(n) ? Math.round((n / max) * 100) : 0;
    };
    const hardStops = Array.isArray(latest.hard_stops)
      ? (latest.hard_stops as Array<{ message?: unknown }>)
          .map((h) => (typeof h?.message === "string" ? h.message : null))
          .filter((m): m is string => m !== null)
      : [];

    const previousRaw = data[1] ? Number(data[1].overall_score) : NaN;

    return {
      score: Math.round(score),
      verdict,
      pillars: {
        financial: pillarPct(latest.financial_score, PILLAR_MAX_POINTS.financial),
        emotional: pillarPct(latest.emotional_score, PILLAR_MAX_POINTS.emotional),
        timing: pillarPct(latest.timing_score, PILLAR_MAX_POINTS.timing),
      },
      hardStops,
      ageDays: daysSince(parseIso(latest.completed_at)),
      previousScore: Number.isFinite(previousRaw) ? Math.round(previousRaw) : null,
    };
  } catch {
    return null;
  }
}

async function assembleFinance(supabase: SupabaseClient): Promise<AdvisorFinanceContext | null> {
  try {
    const ledgerCtx = await buildFinanceContextFromLedgerTables(supabase);
    if (ledgerCtx) return ledgerCtx;
  } catch {
    // Degrade to legacy user_finance_state on any ledger failure.
  }

  try {
    const { data, error } = await supabase
      .from("user_finance_state")
      .select("state, client_updated_at")
      .maybeSingle();
    if (error || !data?.state) return null;

    const state: FinanceState = { ...DEFAULT_FINANCE_STATE, ...(data.state as Partial<FinanceState>) };
    const runway = runwayMonths(state);
    const stamp = Number(data.client_updated_at);
    return {
      monthlyIncome: Math.round(state.monthlyIncome),
      netCashFlow: Math.round(netCashFlow(state)),
      savingsRate: Math.round(savingsRate(state) * 10) / 10,
      runwayMonths: Number.isFinite(runway) ? Math.round(runway * 10) / 10 : null,
      dti: Math.round(debtToIncome(state) * 10) / 10,
      liquidSavings: Math.round(state.liquidSavings),
      totalDebt: Math.round(state.totalDebt),
      netWorth: Math.round(totalNetWorth(state)),
      ageDays: daysSince(stamp > 0 ? stamp : null),
    };
  } catch {
    return null;
  }
}

async function assembleCredit(supabase: SupabaseClient): Promise<AdvisorCreditContext | null> {
  try {
    const { data, error } = await supabase
      .from("credit_snapshots")
      .select("score, utilization, on_time_streak_months, completed_at")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const score = Number(data.score);
    if (!Number.isFinite(score)) return null;
    return {
      score: Math.round(score),
      utilization: Math.round(Number(data.utilization) || 0),
      onTimeStreakMonths: Math.round(Number(data.on_time_streak_months) || 0),
      ageDays: daysSince(parseIso(data.completed_at)),
    };
  } catch {
    return null;
  }
}

/**
 * Assembles the signed-in user's server-side readiness state. The three
 * blocks load concurrently and degrade independently; returns null only
 * when nothing at all is available server-side.
 */
export async function assembleServerContext(supabase: SupabaseClient): Promise<ServerCompanionState | null> {
  try {
    const [assessment, finance, credit] = await Promise.all([
      assembleAssessment(supabase),
      assembleFinance(supabase),
      assembleCredit(supabase),
    ]);
    if (!assessment && !finance && !credit) return null;
    return { assessment, finance, credit, generatedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
