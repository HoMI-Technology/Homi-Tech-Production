/**
 * Verdict thresholds — single source of truth.
 *
 * Boundary-inclusive minimum score for each verdict tier. Consumed by
 * lib/scoring/engine.ts (server), lib/scoring/public.ts (the client-safe
 * seam, parity-tested against the engine), and the architecture feed
 * (lib/architecture/build.ts), so these numeric literals exist exactly
 * once in the codebase. This module is import-safe on the client because
 * public.ts already ships the same numbers; it adds zero new exposure.
 *
 * These boundaries are part of the trade-secret scoring model and must
 * never render on public marketing surfaces — the public model is
 * qualitative only (scripts/brand-check.mjs rules N21/N22 enforce this
 * for landing/marketing components).
 *
 * TODO(founder): reconcile docs and engine. The 2026-08 brand/compliance
 * audit cites internal reference ranges of 75/60/40 (READY / ALMOST_THERE /
 * BUILD_FIRST) while the engine and AGENTS.md use 80/65/50. No 75/60/40
 * source exists in this repo (only a historical note about "the old
 * 75/60/40 build"), so the reference presumably lives in founder docs.
 * Scoring behavior is intentionally unchanged here; changing these values
 * is a founder decision and needs a migration plan for stored assessments.
 */
export const VERDICT_CONFIG = Object.freeze({
  READY: { min: 80 },
  ALMOST_THERE: { min: 65 },
  BUILD_FIRST: { min: 50 },
  NOT_YET: { min: 0 },
} as const);
