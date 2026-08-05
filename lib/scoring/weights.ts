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

// Display maxima are public output (rendered as "n / max" on every score
// surface) and live in ./public — the client-safe seam. Re-exported here so
// engine-side imports keep one source and zero duplicated literals.
export { PILLAR_MAX_POINTS } from "./public";
