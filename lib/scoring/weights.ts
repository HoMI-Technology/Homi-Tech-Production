/**
 * HōMI trade-secret boundary — single source of truth for pillar weights.
 * C2 RESTRICTED. Never expose these values through public APIs.
 * Do not duplicate these numeric literals anywhere else in the codebase.
 */

export const WEIGHTS = Object.freeze({
  financial: 0.35,
  emotional: 0.35,
  timing: 0.3,
});

export const PILLAR_MAX_POINTS = Object.freeze({
  financial: 35,
  emotional: 35,
  timing: 30,
});
