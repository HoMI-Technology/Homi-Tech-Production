/**
 * Conservative v1 bands for research storage. Product decision: store
 * coarse bands, never raw dollars. Unknown stays unknown.
 */

export const RESERVE_BANDS = ["unknown", "under_1", "1_to_3", "3_to_6", "6_plus"] as const;
export type ReserveBand = (typeof RESERVE_BANDS)[number];

export const DIFFICULTY_BANDS = ["unknown", "none", "manageable", "strained", "severe"] as const;
export type DifficultyBand = (typeof DIFFICULTY_BANDS)[number];

export const YES_NO_UNKNOWN = ["unknown", "yes", "no"] as const;
export type YesNoUnknown = (typeof YES_NO_UNKNOWN)[number];

export const DECISION_STATES = [
  "unknown",
  "proceeded",
  "waited",
  "abandoned",
  "blocked_externally",
  "changed_decision",
  "overrode_verdict",
  "reassessed",
] as const;
export type DecisionState = (typeof DECISION_STATES)[number];

export const CONTACT_STATES = [
  "eligible",
  "contact_attempted",
  "delivered",
  "started",
  "completed",
  "declined",
  "unsubscribed",
  "unreachable",
] as const;
export type ContactState = (typeof CONTACT_STATES)[number];

export const DECISION_INTENTS = ["unknown", "proceed", "wait", "unsure"] as const;
export type DecisionIntent = (typeof DECISION_INTENTS)[number];

export function reserveBandFromMonths(months: number | null | undefined): ReserveBand {
  if (months == null || !Number.isFinite(months)) return "unknown";
  if (months < 1) return "under_1";
  if (months < 3) return "1_to_3";
  if (months < 6) return "3_to_6";
  return "6_plus";
}

export function isReserveBand(value: string): value is ReserveBand {
  return (RESERVE_BANDS as readonly string[]).includes(value);
}

export function isDecisionState(value: string): value is DecisionState {
  return (DECISION_STATES as readonly string[]).includes(value);
}

export function isContactState(value: string): value is ContactState {
  return (CONTACT_STATES as readonly string[]).includes(value);
}
