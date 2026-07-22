/**
 * Poisoned / legacy calculator slugs → canonical product routes.
 * Kept in sync with next.config redirects and architecture.json.
 */
export const TOOL_ALIASES = {
  "/tools/mortgage-payment": "/tools/mortgage",
  "/tools/home-equity": "/tools/heloc",
  "/tools/apr-comparison": "/tools/apr-compare",
} as const;

export type PoisonedToolPath = keyof typeof TOOL_ALIASES;
export type CanonicalToolPath = (typeof TOOL_ALIASES)[PoisonedToolPath];

/** Canonical calculator routes that exist under app/[locale]/(product)/tools. */
export const CANONICAL_TOOL_ROUTES = [
  "/tools/affordability",
  "/tools/apr-compare",
  "/tools/blind-budget",
  "/tools/debt-payoff",
  "/tools/down-payment",
  "/tools/fire",
  "/tools/heloc",
  "/tools/loan-programs",
  "/tools/monte-carlo",
  "/tools/mortgage",
  "/tools/refinance",
  "/tools/rent-vs-buy",
  "/tools/roth-conversion",
  "/tools/runway",
] as const;

export type CanonicalToolRoute = (typeof CANONICAL_TOOL_ROUTES)[number];

/**
 * Paths the Companion / Agent OS may mention in a single reply.
 * Must stay a subset of real filesystem routes.
 */
export const ADVISOR_TOOL_HANDOFF_PATHS: readonly string[] = [
  ...CANONICAL_TOOL_ROUTES,
  "/finance",
  "/credit",
  "/assessment",
  "/shadow-score",
  "/tools",
];

/** One-line allowlist for system prompts. */
export function advisorToolHandoffLine(): string {
  const tools = CANONICAL_TOOL_ROUTES.join(", ");
  return (
    `Tool hand-offs: HōMI has real calculators you can point people to by path when they'd genuinely help — ` +
    `${tools} — plus /finance (money dashboard), /credit (credit overview), /assessment (full assessment), ` +
    `and /shadow-score (quick score). Mention a path only when it moves their actual question forward; ` +
    `never more than one per reply, and never as a brush-off.`
  );
}
