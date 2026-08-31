import type { OutcomeTaxonomy } from "./taxonomy";
import type { DecisionState } from "./bands";

/** Analysis map only. Never rewrite stored legacy `outcome` values. */
export function decisionStateFromLegacyOutcome(outcome: OutcomeTaxonomy): DecisionState | null {
  switch (outcome) {
    case "moved":
      return "proceeded";
    case "waited":
      return "waited";
    case "lender_blocked":
      return "blocked_externally";
    case "not_okay":
      return "unknown";
    case "no_answer":
      return null;
    default:
      return null;
  }
}
