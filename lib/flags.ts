/**
 * Feature flags — simple compile-time constants for now. No remote
 * config; flip and redeploy.
 */

/**
 * Agent OS surface: the /agents roster, /agent-hub feed, the /api/agents
 * orchestration route, and their nav/palette entries. Build-time, env-backed:
 * only the exact lowercase string "true" enables it — undefined, "", "false",
 * "1", "TRUE", and malformed values all stay off. No localStorage/cookie/query
 * overrides, no remote config.
 */
export const agentOs = process.env.NEXT_PUBLIC_FF_AGENT_OS === "true";

/**
 * Closed-loop Path impact toast + completePathStepWithImpact publication.
 * Build-time, env-backed (same strict pattern as agentOs above): only the
 * exact lowercase string "true" enables it — undefined, "", "false", "1",
 * "TRUE", and malformed values all stay off. Default false everywhere;
 * enabled per-branch on the PR Preview only until staging acceptance.
 * No localStorage/cookie/query overrides, no remote config.
 */
export const impactBus = process.env.NEXT_PUBLIC_FF_IMPACT_BUS === "true";

/**
 * Budget & Runway ledger surface: the Budget tab on /finance (manual local
 * ledger, PR 2 of the plan ladder). Build-time, env-backed (same strict
 * pattern as agentOs above): only the exact lowercase string "true" enables
 * it. Default false everywhere; enabled per-branch on the PR Preview until
 * the ladder's sync + readiness PRs land. No localStorage/cookie/query
 * overrides, no remote config.
 */
export const budgetLedger = process.env.NEXT_PUBLIC_FF_BUDGET_LEDGER === "true";

/**
 * Per-record Budget ledger sync (PR 4): pull/push against
 * `/api/finance/transactions` + categories. Strict `"true"` only.
 * Defaults off; enable on Preview once PR 3 schema is applied. Requires a
 * signed-in session — anonymous users stay local-only.
 */
export const financeLedgerSync =
  process.env.NEXT_PUBLIC_FF_FINANCE_LEDGER_SYNC === "true";
