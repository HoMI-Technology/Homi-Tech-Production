/**
 * Tier accent colours for the inline lens panels.
 *
 * The local planner build hardcoded these hexes. Here they derive from the
 * brand palette instead, so brand-check stays satisfied and there is one source
 * of truth if a token ever moves. The values are identical today.
 */

import { COLORS } from "@/lib/brand";

export const TIER_HEX = {
  /** Affordability comfort tiers. */
  protected: COLORS.emerald,
  stretch: COLORS.yellow,
  redLine: COLORS.crimson,
  /** Debt payoff strategies. */
  avalanche: COLORS.cyan,
  snowball: COLORS.amber,
  /** Monte Carlo percentiles — worst, median, best. */
  p10: COLORS.crimson,
  p50: COLORS.cyan,
  p90: COLORS.emerald,
} as const;
