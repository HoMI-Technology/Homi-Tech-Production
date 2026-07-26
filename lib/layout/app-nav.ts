/**
 * Signed-in AppHeader nav destinations. Kept outside the client component so
 * unit/e2e helpers can import without pulling React client boundaries.
 * Recovered from PR #81 (i18n / shell work).
 */

const AGENTS_ENABLED = process.env.NEXT_PUBLIC_FF_AGENT_OS === "true";

const PRIMARY_BASE = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assessment", label: "Assessment" },
  { href: "/tools", label: "Tools" },
  { href: "/journal", label: "Journal" },
] as const;

/** Agents only when the public feature flag is on. */
export const APP_PRIMARY_NAV = AGENTS_ENABLED
  ? [
      PRIMARY_BASE[0],
      { href: "/agents", label: "Agents" },
      ...PRIMARY_BASE.slice(1),
    ]
  : [...PRIMARY_BASE];

/** Orphaned product routes under More — includes Companion (/advisor). */
export const APP_MORE_NAV = [
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
