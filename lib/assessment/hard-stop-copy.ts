/**
 * Per-vertical hard-stop display copy (ADR-002).
 *
 * Engine codes and thresholds stay frozen. This module remaps the user-facing
 * strings. Client-safe — do not import lib/scoring engine modules.
 */

import type { DecisionType } from "@/lib/assessment/types";
import type { HardStopCode, HardStopReason } from "@/lib/scoring/public";

const HOME_MESSAGES: Record<HardStopCode, string> = {
  DTI_OVER_50:
    "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises.",
  HOUSING_RATIO_OVER_45:
    "The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis.",
  RUNWAY_UNDER_1_MONTH:
    "You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first.",
  CREDIT_UNDER_620:
    "Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo the purchase. Build credit first; you protect yourself by waiting.",
};

const HOME_NEXT: Record<HardStopCode, string> = {
  DTI_OVER_50:
    "Bring your debt-to-income ratio below 43% before anything else — pay down the highest-rate balance first.",
  HOUSING_RATIO_OVER_45:
    "Re-scope the target home so the monthly payment stays under 36% of your gross income.",
  RUNWAY_UNDER_1_MONTH:
    "Build at least one month of expenses in cash before any other move. Runway comes first.",
  CREDIT_UNDER_620:
    "Rebuild credit above 660: on-time payments and lower utilization move this fastest.",
};

const CAR_MESSAGES: Record<HardStopCode, string> = {
  DTI_OVER_50:
    "Your debt-to-income ratio is above 50%. Taking this on right now would leave almost no margin for surprises.",
  HOUSING_RATIO_OVER_45:
    "The all-in monthly cost you are considering is above 20% of take-home. That is the line where one bad month becomes a crisis.",
  RUNWAY_UNDER_1_MONTH:
    "You have less than one month of expenses set aside. A car payment does not wait for surprises — you need runway first.",
  CREDIT_UNDER_620:
    "Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo this decision. Build credit first; you protect yourself by waiting.",
};

const CAR_NEXT: Record<HardStopCode, string> = {
  DTI_OVER_50:
    "Bring your debt-to-income ratio below 43% before anything else — pay down the highest-rate balance first.",
  HOUSING_RATIO_OVER_45:
    "Re-scope the car so the all-in monthly cost stays at or under 20% of take-home.",
  RUNWAY_UNDER_1_MONTH:
    "Build at least one month of expenses in cash before any other move. Runway comes first.",
  CREDIT_UNDER_620:
    "Rebuild credit above 660: on-time payments and lower utilization move this fastest.",
};

export function isHardStopCode(value: unknown): value is HardStopCode {
  return (
    value === "DTI_OVER_50" ||
    value === "HOUSING_RATIO_OVER_45" ||
    value === "RUNWAY_UNDER_1_MONTH" ||
    value === "CREDIT_UNDER_620"
  );
}

function tableFor(decisionType: string): {
  messages: Record<HardStopCode, string>;
  next: Record<HardStopCode, string>;
} {
  if (decisionType === "car") return { messages: CAR_MESSAGES, next: CAR_NEXT };
  return { messages: HOME_MESSAGES, next: HOME_NEXT };
}

export function hardStopMessage(code: HardStopCode, decisionType: DecisionType | string): string {
  return tableFor(decisionType).messages[code];
}

export function hardStopNextStep(code: HardStopCode, decisionType: DecisionType | string): string {
  return tableFor(decisionType).next[code];
}

export function applyHardStopCopy(
  stops: readonly HardStopReason[],
  decisionType: DecisionType | string,
): HardStopReason[] {
  return stops.map((stop) =>
    isHardStopCode(stop.code)
      ? { ...stop, message: hardStopMessage(stop.code, decisionType) }
      : stop,
  );
}

export type FoldHardStopDisplay = {
  eyebrow: string;
  hold: string;
  override: (scorePct: number) => string;
};

export function foldHardStopDisplay(
  code: HardStopCode,
  decisionType: DecisionType | string = "home_buying",
): FoldHardStopDisplay {
  if (decisionType === "car" && code === "HOUSING_RATIO_OVER_45") {
    return {
      eyebrow: "Hard stop · payment.",
      hold: "Payment is the hold. Re-scope the all-in monthly cost before anything else.",
      override: (scorePct) => `${scorePct} — payment is a hard stop.`,
    };
  }
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH":
      return {
        eyebrow: "Hard stop · runway.",
        hold: "Runway is the hold. Build the fund before anything else.",
        override: (scorePct) => `${scorePct} — runway is a hard stop.`,
      };
    case "DTI_OVER_50":
      return {
        eyebrow: "Hard stop · DTI.",
        hold: "DTI is the hold. Bring the debt load down before anything else.",
        override: (scorePct) => `${scorePct} — DTI is a hard stop.`,
      };
    case "HOUSING_RATIO_OVER_45":
      return {
        eyebrow: "Hard stop · housing.",
        hold: "Housing is the hold. Re-scope the payment before anything else.",
        override: (scorePct) => `${scorePct} — housing is a hard stop.`,
      };
    case "CREDIT_UNDER_620":
      return {
        eyebrow: "Hard stop · credit.",
        hold: "Credit is the hold. Rebuild before anything else.",
        override: (scorePct) => `${scorePct} — credit is a hard stop.`,
      };
  }
}

export function hardStopPathTitle(
  code: HardStopCode,
  decisionType: DecisionType | string = "home_buying",
): string {
  if (decisionType === "car" && code === "HOUSING_RATIO_OVER_45") {
    return "Re-scope the car so all-in monthly cost stays at or under 20% of take-home";
  }
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH":
      return "Stabilize emergency runway to at least 1 month";
    case "DTI_OVER_50":
      return "Bring debt-to-income below the protective line";
    case "HOUSING_RATIO_OVER_45":
      return "Re-scope housing so payment stays under 45% of income";
    case "CREDIT_UNDER_620":
      return "Rebuild credit above the 620 protective floor";
  }
}

export function hardStopPathNotes(
  code: HardStopCode,
  disclaimer: string,
  decisionType: DecisionType | string = "home_buying",
): string {
  if (decisionType === "car" && code === "HOUSING_RATIO_OVER_45") {
    return (
      "Protective gate: all-in monthly cost above 20% of take-home. " +
      "Lower the payment or raise income before proceeding. " +
      disclaimer
    );
  }
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH":
      return (
        "Protective gate: under 1 month of runway forces DO NOT PROCEED. " +
        "Build cash covering one full month of expenses before any major purchase. " +
        disclaimer
      );
    case "DTI_OVER_50":
      return (
        "Protective gate: DTI above 50% blocks readiness regardless of score. " +
        "Prioritize high-rate balances and free monthly cash flow. " +
        disclaimer
      );
    case "HOUSING_RATIO_OVER_45":
      return (
        "Protective gate: housing cost above 45% of gross income. " +
        "Lower the target payment or raise income before proceeding. " +
        disclaimer
      );
    case "CREDIT_UNDER_620":
      return (
        "Protective gate: credit under 620 forces DO NOT PROCEED. " +
        "On-time payments and lower utilization move this gate first. " +
        disclaimer
      );
  }
}
