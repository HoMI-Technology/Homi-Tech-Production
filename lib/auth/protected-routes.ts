/**
 * Central route-protection classification (AUDIT/BUILD-BRIEF T3: "all
 * `(product)` protected except an explicit public list").
 *
 * Every route directory under `app/(product)` MUST be classified here as
 * public, protected, or partially-protected. `middleware.ts` reads
 * `PROTECTED_PREFIXES` to gate requests, and
 * `__tests__/route-protection.test.ts` asserts this classification stays
 * exhaustive — so a newly-added product route cannot silently ship
 * unprotected (the previous denylist missed nine of them).
 *
 * When adding a route under `app/(product)`, add its directory name to one of
 * the lists below or the guard test fails.
 */

/**
 * Product routes anonymous visitors may view — the acquisition funnel and
 * marketing surfaces (assessment → results → plan), the public tools, the
 * shadow-score teaser, the demo, and the onboarding intro. These read only
 * local/derived state or degrade to an empty state without a session.
 */
export const PUBLIC_PRODUCT_ROUTES = [
  "assessment",
  "calibration",
  "demo",
  "onboarding",
  "path",
  "plan",
  "results",
  "scenarios",
  "shadow-score",
  "tools",
] as const;

/**
 * Product routes that require an authenticated session. Each renders
 * user-specific data and has no anonymous/marketing purpose.
 */
export const PROTECTED_PRODUCT_ROUTES = [
  "admin",
  "advisor",
  "agent-hub",
  "agents",
  "calendar",
  "connections",
  "credit",
  "daily",
  "dashboard",
  "decisions",
  "genome",
  "household",
  "journal",
  "money",
  "outcomes",
  "report",
  "settings",
  "signals",
  "simulator",
  "team",
  "timeline",
  "trinity",
  "trust",
  "twin",
] as const;

/**
 * Product routes whose landing page is public but which expose a protected
 * `/dashboard` sub-path. The root stays reachable (partner/employer
 * marketing); only the nested product surfaces gate. The legacy `/portal`
 * stubs were removed — next.config.ts 308s them to `/dashboard` before the
 * middleware runs, so only the destination needs gating here.
 */
export const PARTIALLY_PROTECTED_PRODUCT_ROUTES = ["partner", "employee"] as const;

/** URL prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES: string[] = [
  ...PROTECTED_PRODUCT_ROUTES.map((r) => `/${r}`),
  "/partner/dashboard",
  "/employee/dashboard",
];

/** True when `path` requires an authenticated session. */
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
