/**
 * Feature flags — simple compile-time constants for now. No remote
 * config; flip and redeploy.
 */

export const heroVariant = "interview" as const;

/**
 * Closed-loop Path impact toast + completePathStepWithImpact wrappers.
 * Default false until staging acceptance on real Path data.
 * Flip to true and redeploy — no remote config.
 */
export const impactBus = false;
