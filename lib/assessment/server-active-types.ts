import { ACTIVE_DECISION_TYPES, type DecisionType } from "./types";

/**
 * Server-side decision-type allowlist (Plans.md 5.9, phase 1 of 2).
 *
 * WHY THIS IS SEPARATE FROM `ACTIVE_DECISION_TYPES`
 * -------------------------------------------------
 * Vertical activation is a Fowler ParallelChange (expand → contract) because a
 * rolling deploy runs new clients against old servers for a window. If the
 * picker and the server allowlist widen in the same deploy, a new client can
 * POST `decisionType: "car"` to a pod still running the old bundle and take a
 * 400 — which F.12 shows the user as a generic failed save.
 *
 * So the two lists move in separate deploys:
 *
 *   expand   (phase 1, this commit) — SERVER_ACTIVE_DECISION_TYPES gains "car".
 *                                     Old and new clients both still send only
 *                                     "home_buying"; nothing user-visible moves.
 *   contract (phase 2, next deploy) — ACTIVE_DECISION_TYPES gains "car", which
 *                                     reveals the picker. Every pod already
 *                                     accepts "car", so there is no skew window.
 *
 * `ACTIVE_DECISION_TYPES` stays the CLIENT list: what the picker offers and
 * what a resumed draft may claim. This is the SERVER list: what POST
 * /api/assessments will persist. The invariant is a subset relation — client ⊆
 * server, never the reverse — asserted in __tests__/decision-type-canon.test.ts.
 * Phase 2 is a one-line change to types.ts and needs nothing here.
 */
export const SERVER_ACTIVE_DECISION_TYPES: DecisionType[] = ["home_buying", "car"];

/** Guard for the ParallelChange invariant: the picker can never out-run the server. */
export function clientTypesAreServerAccepted(
  clientTypes: readonly string[] = ACTIVE_DECISION_TYPES,
  serverTypes: readonly string[] = SERVER_ACTIVE_DECISION_TYPES,
): boolean {
  return clientTypes.every((t) => serverTypes.includes(t));
}
