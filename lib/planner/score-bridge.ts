/* ------------------------------------------------------------------ */
/* Score bridge — live planner numbers → AssessmentInputs → server.    */
/*                                                                     */
/* Production rule (AGENTS.md): never ship computeScore / WEIGHTS to   */
/* the client. Pure mapper here; scoring via fetchServerScore.         */
/* ------------------------------------------------------------------ */

import { estimateHousingPayment } from "@/lib/planner/cfm";
import {
  fetchServerScore,
  ScoringRequestError,
  type ServerScorePayload,
} from "@/lib/scoring/client-score";
import type { AssessmentInputs, AssessmentResult } from "@/lib/scoring/public";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { toScoreResult, type ScoreResult } from "@/lib/planner/score-result";
import type {
  BankAccount,
  Bill,
  DebtItem,
  Holding,
  HouseholdPartner,
  NetWorthItem,
  ReadinessProfile,
  SavingsGoal,
  Transaction,
  VerdictKey,
} from "@/lib/planner/types";
import {
  DEFAULT_GOAL,
  DEFAULT_READINESS_PROFILE,
  financialReality,
  summarizePortfolio,
  totalNetWorth,
} from "@/lib/planner/derived";

export interface ScoreBridgeInput {
  transactions: Transaction[];
  accounts: BankAccount[];
  bills: Bill[];
  holdings: Holding[];
  netWorthItems: NetWorthItem[];
  savingsGoal: SavingsGoal;
  readinessProfile: ReadinessProfile;
  debts?: DebtItem[];
}

export interface PlannerScore {
  score: number;
  verdict: VerdictKey;
  pillarPct: Record<"financial" | "emotional" | "timing", number>;
  hardStops: ScoreResult["hardStops"];
  warnings: ScoreResult["warnings"];
  keyInsight: string;
  nextSteps: string[];
  result: ScoreResult;
  /** Raw engine payload (for path generation). */
  assessment: AssessmentResult;
  /** Completeness flags for honest UI. */
  completeness: {
    profileComplete: boolean;
    hasMoneySignal: boolean;
    canShowLiveScore: boolean;
  };
}

function safeProfile(p?: Partial<ReadinessProfile> | null): ReadinessProfile {
  return {
    ...DEFAULT_READINESS_PROFILE,
    ...(p && typeof p === "object" ? p : {}),
  };
}

/**
 * Pure mapper: planner world → AssessmentInputs.
 * Infinite runway is coerced to 12 for the engine only — UI must still
 * render ∞ / "No outflow yet" from financialReality.
 */
export function buildAssessmentInputs(
  input: ScoreBridgeInput,
  overrides?: Partial<AssessmentInputs> & {
    incomeMultiplier?: number;
  },
): AssessmentInputs {
  const reality = financialReality(
    input.transactions ?? [],
    input.accounts ?? [],
    input.bills ?? [],
  );
  const p = safeProfile(input.readinessProfile);
  const income = reality.income * (overrides?.incomeMultiplier ?? 1);
  const dtiRatio = income > 0 ? reality.debtPayments / income : reality.dti / 100;

  const downNeeded = p.targetHomePrice * 0.2;
  const dpProgress =
    downNeeded > 0 ? Math.min(1, p.downPaymentSaved / downNeeded) : p.downPaymentSaved > 0 ? 1 : 0;
  const downPaymentPercent = p.targetHomePrice > 0 ? p.downPaymentSaved / p.targetHomePrice : 0;

  const housingPayment = estimateHousingPayment({
    targetPrice: p.targetHomePrice,
    downPaymentSaved: p.downPaymentSaved,
    ratePct: p.assumedRatePct,
    termYears: p.termYears,
    taxInsuranceRatePct: p.taxInsuranceRatePct,
    hoaMonthly: p.hoaMonthly,
  });
  const monthlyHousingRatio = income > 0 ? housingPayment / income : undefined;

  const runway = Number.isFinite(reality.runwayMonths)
    ? reality.runwayMonths
    : /* scoring-only coercion — display stays infinite */
      12;

  return {
    debtToIncomeRatio: overrides?.debtToIncomeRatio ?? dtiRatio,
    downPaymentPercent: overrides?.downPaymentPercent ?? downPaymentPercent,
    emergencyFundMonths: overrides?.emergencyFundMonths ?? runway,
    creditScore: overrides?.creditScore ?? p.creditScore,
    lifeStability: overrides?.lifeStability ?? p.lifeStability,
    confidenceLevel: overrides?.confidenceLevel ?? p.confidenceLevel,
    partnerAlignment:
      overrides?.partnerAlignment !== undefined ? overrides.partnerAlignment : p.partnerAlignment,
    fomoLevel: overrides?.fomoLevel ?? p.fomoLevel,
    timeHorizonMonths: overrides?.timeHorizonMonths ?? p.timeHorizonMonths,
    savingsRate: overrides?.savingsRate ?? reality.savingsRate / 100,
    downPaymentProgress: overrides?.downPaymentProgress ?? dpProgress,
    monthlyHousingRatio: overrides?.monthlyHousingRatio ?? monthlyHousingRatio,
  };
}

export function bridgeCompleteness(input: ScoreBridgeInput): {
  profileComplete: boolean;
  hasMoneySignal: boolean;
  canShowLiveScore: boolean;
} {
  const p = safeProfile(input.readinessProfile);
  const profileComplete = Boolean(p.profileComplete);
  const reality = financialReality(
    input.transactions ?? [],
    input.accounts ?? [],
    input.bills ?? [],
  );
  const hasMoneySignal =
    (input.transactions?.length ?? 0) > 0 ||
    (input.accounts?.length ?? 0) > 0 ||
    reality.income > 0 ||
    reality.expenses > 0;
  // Live score only when the user has set a profile (credit + emotional)
  // so we never invent a hard-stop from demo credit defaults.
  return {
    profileComplete,
    hasMoneySignal,
    canShowLiveScore: profileComplete,
  };
}

/* ------------------------------------------------------------------ */
/* Score cache — rate-limit friendly (API: 30/min/IP)                  */
/* ------------------------------------------------------------------ */

const CACHE_TTL_MS = 45_000;
const cache = new Map<string, { at: number; payload: ServerScorePayload }>();
const inflight = new Map<string, Promise<ServerScorePayload>>();

let lastAssessment: AssessmentResult | null = null;
let lastScoreResult: ScoreResult | null = null;
let scoreSeq = 0;

function inputsKey(inputs: AssessmentInputs): string {
  // Stable JSON of scored fields only.
  return JSON.stringify({
    d: inputs.debtToIncomeRatio,
    dp: inputs.downPaymentPercent,
    ef: inputs.emergencyFundMonths,
    c: inputs.creditScore,
    ls: inputs.lifeStability,
    cl: inputs.confidenceLevel,
    pa: inputs.partnerAlignment,
    f: inputs.fomoLevel,
    th: inputs.timeHorizonMonths,
    sr: inputs.savingsRate,
    dpp: inputs.downPaymentProgress,
    mhr: inputs.monthlyHousingRatio ?? null,
  });
}

export async function fetchServerScoreCached(
  inputs: AssessmentInputs,
): Promise<ServerScorePayload> {
  const key = inputsKey(inputs);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < CACHE_TTL_MS) {
    return hit.payload;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const p = fetchServerScore(inputs)
    .then((payload) => {
      cache.set(key, { at: Date.now(), payload });
      lastAssessment = payload.result;
      lastScoreResult = toScoreResult(payload.result);
      return payload;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export function getLastAssessmentResult(): AssessmentResult | null {
  return lastAssessment;
}

export function getLastScoreResult(): ScoreResult | null {
  return lastScoreResult;
}

export function toPlannerScore(
  payload: ServerScorePayload,
  completeness: PlannerScore["completeness"],
): PlannerScore {
  const result = toScoreResult(payload.result);
  return {
    score: result.score,
    verdict: result.verdict,
    pillarPct: {
      financial: Math.round((result.pillars.financial.total / PILLAR_MAX_POINTS.financial) * 100),
      emotional: Math.round((result.pillars.emotional.total / PILLAR_MAX_POINTS.emotional) * 100),
      timing: Math.round((result.pillars.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
    hardStops: result.hardStops,
    warnings: result.warnings,
    keyInsight: payload.keyInsight,
    nextSteps: payload.nextSteps,
    result,
    assessment: payload.result,
    completeness,
  };
}

/**
 * Async server-authoritative score. Money mutations should still commit
 * if this rejects (429 / network) — callers must not invent scores.
 */
export async function scoreFromBudgetAsync(input: ScoreBridgeInput): Promise<PlannerScore> {
  const completeness = bridgeCompleteness(input);
  if (!completeness.canShowLiveScore) {
    throw new ScoringRequestError("Set your decision profile before a live HōMI-Score.", 400);
  }
  const inputs = buildAssessmentInputs(input);
  const payload = await fetchServerScoreCached(inputs);
  return toPlannerScore(payload, completeness);
}

/** For closed-loop deltas — returns ScoreResult shape only. */
export async function scoreResultFromBudget(input: ScoreBridgeInput): Promise<ScoreResult> {
  const planner = await scoreFromBudgetAsync(input);
  return planner.result;
}

export async function scoreHouseholdMemberAsync(
  input: ScoreBridgeInput,
  partner: HouseholdPartner,
  role: "primary" | "partner",
): Promise<ScoreResult> {
  if (role === "primary") {
    const inputs = buildAssessmentInputs(input, {
      partnerAlignment: partner.enabled
        ? partner.partnerAlignment
        : safeProfile(input.readinessProfile).partnerAlignment,
    });
    const payload = await fetchServerScoreCached(inputs);
    return toScoreResult(payload.result);
  }

  const share = Math.min(0.9, Math.max(0.1, partner.incomeShare || 0.4));
  const primaryShare = 1 - share;
  const inputs = buildAssessmentInputs(input, {
    incomeMultiplier: share / Math.max(primaryShare, 0.15),
    creditScore: partner.creditScore,
    lifeStability: partner.lifeStability,
    confidenceLevel: partner.confidenceLevel,
    fomoLevel: partner.fomoLevel,
    timeHorizonMonths: partner.timeHorizonMonths,
    partnerAlignment: partner.partnerAlignment,
  });
  const payload = await fetchServerScoreCached(inputs);
  return toScoreResult(payload.result);
}

export function wealthSnapshot(input: ScoreBridgeInput) {
  const portfolio = summarizePortfolio(input.holdings ?? []);
  const nw = totalNetWorth(input.accounts ?? [], input.holdings ?? [], input.netWorthItems ?? []);
  return { portfolio, nw };
}

/** Monotonic id for ignoring stale closed-loop responses. */
export function nextScoreSeq(): number {
  scoreSeq += 1;
  return scoreSeq;
}

export { ScoringRequestError };
