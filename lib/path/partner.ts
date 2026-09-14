/**
 * Path to Ready v1 — partner disagreement as first-class state.
 *
 * A partner's alignment with a plan is recorded, never smoothed over:
 * "diverged" is a durable state with its own snapshot, not an error.
 * Pure transition rules; persistence + RLS live in the route/migration.
 */

export type PathPartnerState = "aligned" | "diverged" | "pending";

/**
 * Allowed transitions. Every state can move to every other — alignment is
 * a conversation, and forcing an order on it would hide disagreement.
 * The rule that matters: a transition must be explicit (no silent resets).
 */
export function canTransitionPartnerState(
  _from: PathPartnerState,
  to: PathPartnerState,
): boolean {
  return to === "aligned" || to === "diverged" || to === "pending";
}

/** Neutral labels — disagreement is information, not failure. */
export function partnerStateLabel(state: PathPartnerState): string {
  switch (state) {
    case "aligned":
      return "Both partners see this path the same way";
    case "diverged":
      return "Partners recorded different views of this path";
    case "pending":
      return "Partner view not recorded yet";
  }
}
