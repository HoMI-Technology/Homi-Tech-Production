/**
 * Signed-in AppHeader nav destinations. Kept outside the client component so
 * unit/e2e helpers can import without pulling React client boundaries.
 *
 * PRIMARY stays ruthlessly short so the product bar fits one line with
 * workspace + search + account. Deep routes live under More.
 */

const AGENTS_ENABLED = process.env.NEXT_PUBLIC_FF_AGENT_OS === "true";

/** Core operate destinations only — 3 items max (+ Agents when flagged). */
const PRIMARY_BASE = [
  { href: "/dashboard", label: "Home" },
  { href: "/assessment", label: "Assess" },
  { href: "/tools", label: "Tools" },
] as const;

/** Agents only when the public feature flag is on. */
export const APP_PRIMARY_NAV = AGENTS_ENABLED
  ? [
      PRIMARY_BASE[0],
      { href: "/agents", label: "Agents" },
      ...PRIMARY_BASE.slice(1),
    ]
  : [...PRIMARY_BASE];

/**
 * Everything else under More. Journal, Companion, finance, and the deeper
 * product surface stay one click away without crowding the bar.
 */
export const APP_MORE_NAV = [
  { href: "/path", label: "Path to Ready" },
  { href: "/household", label: "Household" },
  { href: "/tools/preflight", label: "Pre-Flight" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/journal", label: "Journal" },
  { href: "/advisor", label: "Companion" },
  { href: "/decisions", label: "Decisions" },
  { href: "/signals", label: "Signals" },
  { href: "/twin", label: "Future Twin" },
  { href: "/trinity", label: "Trinity" },
  { href: "/finance", label: "Finance" },
  { href: "/calendar", label: "Calendar" },
  { href: "/daily", label: "Daily Check-in" },
  { href: "/family", label: "Family" },
  { href: "/credit", label: "Credit" },
  { href: "/connections", label: "Connections" },
] as const;
