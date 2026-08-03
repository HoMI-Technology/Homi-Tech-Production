/**
 * Feature flags — simple compile-time constants for now. No remote
 * config; flip and redeploy.
 */

export const heroVariant = "interview" as const;

/**
 * Closed-loop Path impact toast + completePathStepWithImpact publication.
 * Build-time, env-backed (same pattern as NEXT_PUBLIC_FF_AGENT_OS): only the
 * exact lowercase string "true" enables it — undefined, "", "false", "1",
 * "TRUE", and malformed values all stay off. Default false everywhere;
 * enabled per-branch on the PR Preview only until staging acceptance.
 * No localStorage/cookie/query overrides, no remote config.
 */
export const impactBus = process.env.NEXT_PUBLIC_FF_IMPACT_BUS === "true";
