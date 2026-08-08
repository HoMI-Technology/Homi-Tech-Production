/**
 * Client helper for POST /api/simulator (Plans.md 6.4).
 * One batch call returns baseline score + simulated score + lever ranks
 * (and optional housing impact / preflight) so slider ticks do not blow
 * the scoring rate limit.
 */

import type {
  AnchorAssessment,
  LeverImpact,
  SimulationOutcome,
  SimulatorAnchors,
  SimulatorBaseline,
  SimulatorLevers,
} from "@/lib/simulator/public";
import type { HousingImpactOptions, ReadinessImpact } from "@/lib/tools/readiness-impact";

/** Structural preflight payload — avoids value-importing preflight (engine). */
export interface SimulatorPreflightPayload {
  assessmentResult?: unknown;
  assessmentInputs?: unknown;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  monthlyDebtPayments?: number | null;
  liquidSavings?: number | null;
  externalPressure?: number | null;
  partnerAlignment?: number | null;
  decisionLabel?: string | null;
}

export interface SimulatorBatchRequest {
  baseline?: SimulatorBaseline;
  anchorAssessment?: AnchorAssessment | null;
  levers?: SimulatorLevers;
  include?: {
    /** Score at baseline levers (default true when levers/rank/housing requested). */
    current?: boolean;
    /** Score at provided levers. */
    simulated?: boolean;
    /** Marginal lever ranking. */
    rank?: boolean;
    /** Honesty anchors for the UI (neutral flag, held pillars). */
    anchors?: boolean;
    /** Housing readiness band (magnitude only). */
    housing?: HousingImpactOptions | null;
  };
  preflight?: SimulatorPreflightPayload | null;
}

export interface SimulatorBatchResponse {
  current?: SimulationOutcome;
  simulated?: SimulationOutcome;
  impacts?: LeverImpact[];
  anchors?: Pick<SimulatorAnchors, "emotionalScore" | "timingScore" | "neutral">;
  housing?: ReadinessImpact | null;
  preflight?: {
    verdict: "PROCEED_WITH_CARE" | "WAIT" | "DO_NOT_PROCEED";
    badge: string;
    findings: Array<{
      signal: string;
      severity: "block" | "warn" | "ok";
      title: string;
      detail: string;
    }>;
    score: number | null;
    assessmentVerdict: string | null;
    hardStopCodes: string[];
    disclaimer: string;
  };
}

export class SimulatorRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SimulatorRequestError";
    this.status = status;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** POST /api/simulator — server recomputes; never trust a client-sent score. */
export async function fetchSimulatorBatch(
  body: SimulatorBatchRequest,
): Promise<SimulatorBatchResponse> {
  let res: Response;
  try {
    res = await fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SimulatorRequestError(
      "Could not reach the simulator service. Check your connection.",
      0,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new SimulatorRequestError(
      "Simulator service returned an unreadable response.",
      res.status,
    );
  }

  if (!res.ok) {
    const msg =
      isRecord(json) && typeof json.error === "string"
        ? json.error
        : "Simulator failed. Try again in a moment.";
    throw new SimulatorRequestError(msg, res.status);
  }

  if (!isRecord(json)) {
    throw new SimulatorRequestError("Simulator service returned an unexpected payload.", 502);
  }

  return json as SimulatorBatchResponse;
}
