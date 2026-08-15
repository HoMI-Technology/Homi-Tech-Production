/**
 * Client-side scoring entry (Plans.md 6.2).
 *
 * Assessment flows must NOT import computeScore / computeShadowScore —
 * engine curves stay off the client bundle. This helper POSTs validated
 * inputs to /api/scoring (auth-free, rate-limited) and returns the full
 * AssessmentResult plus insight strings for local storage / UI.
 */

import type {
  AssessmentInputs,
  AssessmentResult,
  EmotionalBreakdown,
  FinancialBreakdown,
  TimingBreakdown,
  HardStopReason,
  ScoringWarning,
} from "@/lib/scoring/public";

export interface ServerScorePayload {
  result: AssessmentResult;
  keyInsight: string;
  nextSteps: string[];
}

export class ScoringRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ScoringRequestError";
    this.status = status;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function parseFinancial(raw: unknown): FinancialBreakdown {
  const o = isRecord(raw) ? raw : {};
  return {
    debtToIncome: num(o.debtToIncome),
    downPayment: num(o.downPayment),
    emergencyFund: num(o.emergencyFund),
    creditHealth: num(o.creditHealth),
    total: num(o.total),
  };
}

function parseEmotional(raw: unknown): EmotionalBreakdown {
  const o = isRecord(raw) ? raw : {};
  return {
    lifeStability: num(o.lifeStability),
    confidenceLevel: num(o.confidenceLevel),
    partnerAlignment: num(o.partnerAlignment),
    fomoCheck: num(o.fomoCheck),
    total: num(o.total),
    singleRedistribution: Boolean(o.singleRedistribution),
  };
}

function parseTiming(raw: unknown): TimingBreakdown {
  const o = isRecord(raw) ? raw : {};
  return {
    timeHorizon: num(o.timeHorizon),
    savingsRate: num(o.savingsRate),
    downPaymentProgress: num(o.downPaymentProgress),
    total: num(o.total),
  };
}

function parseResult(data: Record<string, unknown>): AssessmentResult {
  const verdict = data.verdict;
  if (
    verdict !== "READY" &&
    verdict !== "ALMOST_THERE" &&
    verdict !== "BUILD_FIRST" &&
    verdict !== "NOT_YET"
  ) {
    throw new ScoringRequestError("Scoring response missing a valid verdict.", 502);
  }
  const warnings = Array.isArray(data.warnings) ? (data.warnings as ScoringWarning[]) : [];
  const hardStops = Array.isArray(data.hardStops) ? (data.hardStops as HardStopReason[]) : [];
  return {
    score: num(data.score),
    verdict,
    financial: parseFinancial(data.financial),
    emotional: parseEmotional(data.emotional),
    timing: parseTiming(data.timing),
    warnings,
    hardStops,
  };
}

/** POST /api/scoring — server recomputes; never trust a client-sent score. */
export async function fetchServerScore(inputs: AssessmentInputs): Promise<ServerScorePayload> {
  let res: Response;
  try {
    res = await fetch("/api/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    });
  } catch {
    throw new ScoringRequestError("Could not reach the scoring service. Check your connection.", 0);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ScoringRequestError("Scoring service returned an unreadable response.", res.status);
  }

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "Scoring failed. Try again in a moment.";
    throw new ScoringRequestError(msg, res.status);
  }

  if (!isRecord(json)) {
    throw new ScoringRequestError("Scoring service returned an unexpected payload.", 502);
  }

  const result = parseResult(json);
  const keyInsight = typeof json.keyInsight === "string" ? json.keyInsight : "";
  const nextSteps = Array.isArray(json.nextSteps)
    ? json.nextSteps.filter((s): s is string => typeof s === "string")
    : [];

  return { result, keyInsight, nextSteps };
}
