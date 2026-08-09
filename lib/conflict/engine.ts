/**
 * HōMI Conflict / Bias Layer
 * ===========================
 *
 * Pure, deterministic detector for outside pressure and conflict-of-interest
 * signals that sit alongside — and never influence — the HōMI-Score itself.
 * The scoring engine (lib/scoring) never imports this module and these
 * signals never change score, verdict, or hard-stops. They exist purely to
 * surface honest context back to the user: who benefits, whose deadline it
 * is, and whether the pressure they feel is actually theirs.
 */

export type ConflictSeverity = "info" | "warn" | "protect";

export interface ConflictSignal {
  code: string;
  severity: ConflictSeverity;
  title: string;
  message: string;
}

export type ReferralSource = "me" | "family" | "agent" | "lender";
export type DeadlineOrigin = "mine" | "external" | "none";

export interface ConflictInputs {
  /** Self-reported outside pressure / FOMO, 1-10. */
  fomoLevel: number;
  /** Planned months until purchase. */
  timeHorizonMonths: number;
  /** Who brought this decision to the user, if disclosed. */
  referralSource?: ReferralSource | string;
  /** Whose deadline this is, if disclosed. */
  deadlineOrigin?: DeadlineOrigin | string;
}

/**
 * Derives conflict/bias signals from optional, skippable context collected
 * during the assessment. Never reads or affects AssessmentInputs used by
 * computeScore() — this is a parallel, informational-only layer.
 */
export function deriveConflictSignals(x: ConflictInputs): ConflictSignal[] {
  const signals: ConflictSignal[] = [];

  if (x.fomoLevel >= 8) {
    signals.push({
      code: "HERD_PRESSURE",
      severity: "warn",
      title: "Herd pressure",
      message: "The urgency around you is loud. Yours doesn't have to match it.",
    });
  }

  if (x.timeHorizonMonths < 3 && x.fomoLevel >= 6) {
    signals.push({
      code: "MANUFACTURED_URGENCY",
      severity: "protect",
      title: "Manufactured urgency",
      message:
        "Short timeline plus outside pressure is how rushed decisions happen. Slow the clock.",
    });
  }

  if (x.referralSource === "agent" || x.referralSource === "lender") {
    signals.push({
      code: "COMMISSION_EXPOSURE",
      severity: "warn",
      title: "Commission exposure",
      message: "Someone in this decision earns money when you say yes. Keep that math visible.",
    });
  }

  if (x.deadlineOrigin === "external") {
    signals.push({
      code: "EXTERNAL_DEADLINE",
      severity: "info",
      title: "External deadline",
      message: "The deadline isn't yours. Deadlines that belong to other people are negotiable.",
    });
  }

  return signals;
}
