/**
 * Single source of truth for product-surface navigation.
 *
 * Both chrome surfaces derive from this catalog so they can never drift:
 * - AppHeader (lib/layout/app-nav.ts → APP_PRIMARY_NAV / APP_MORE_NAV)
 * - Command palette (lib/dashboard/palette-visibility.ts → PALETTE_CATALOG)
 *
 * Each surface keeps its own runtime filtering (role visibility for the
 * palette, feature flags for the header bar); this module only owns the
 * entry list, labels, ordering, and which surfaces each entry appears on.
 * A parity test (__tests__/layout/nav-catalog-parity.test.ts) asserts the
 * derived sets stay equal minus an explicit exceptions list.
 */

import { agentOs } from "@/lib/flags";

export type NavCatalogEntry = {
  href: string;
  /** Chrome (AppHeader) label — kept short so the bar fits one line. */
  label: string;
  /** Palette label when it reads better as an action; defaults to `label`. */
  paletteLabel?: string;
  /** Command-palette group tag. */
  group: "Navigate" | "Act" | "Roles";
  /** Extra palette search terms. */
  keywords?: string;
  /** Feature-flag gate. Gated entries are hidden while the flag is off. */
  flag?: "agentOs";
  /** Where the entry renders. Role/account entries are palette-only. */
  surfaces: { header?: "primary" | "more"; palette: boolean };
};

/**
 * Canonical ordered catalog. Header lists preserve this order; the palette
 * catalog does too. Order conventions: primary bar first, palette-only quick
 * actions, then the More journey (path → planning → journal/companion →
 * insight surfaces → money/life), then role dashboards + settings.
 */
export const NAV_CATALOG: readonly NavCatalogEntry[] = [
  // ── Header PRIMARY (ruthlessly short: 3 items + Agents when flagged) ──
  { href: "/dashboard", label: "Home", paletteLabel: "Dashboard", group: "Navigate", keywords: "home overview score", surfaces: { header: "primary", palette: true } },
  { href: "/agents", label: "Agents", paletteLabel: "AI Agents roster", group: "Act", keywords: "agent os ensemble homie scout", flag: "agentOs", surfaces: { header: "primary", palette: true } },
  { href: "/assessment", label: "Assess", paletteLabel: "Take the assessment", group: "Act", keywords: "readiness verdict full test measure", surfaces: { header: "primary", palette: true } },
  { href: "/tools", label: "Tools", group: "Navigate", keywords: "calculators mortgage affordability money", surfaces: { header: "primary", palette: true } },

  // ── Palette-only quick actions (documented parity exceptions) ──
  { href: "/shadow-score", label: "Get a Shadow Score", group: "Act", keywords: "quick score fast read", surfaces: { palette: true } },
  { href: "/agent-hub", label: "Agent Hub feed", group: "Act", keywords: "architecture json prompt export scrape", flag: "agentOs", surfaces: { palette: true } },

  // ── Header MORE: journey + planning ──
  { href: "/path", label: "Path to Ready", group: "Navigate", keywords: "next steps journey roadmap", surfaces: { header: "more", palette: true } },
  { href: "/results", label: "Results", group: "Navigate", keywords: "readiness verdict score outcome report", surfaces: { header: "more", palette: true } },
  { href: "/household", label: "Household", group: "Navigate", keywords: "home profile shared setup", surfaces: { header: "more", palette: true } },
  { href: "/tools/preflight", label: "Pre-Flight", group: "Navigate", keywords: "checklist readiness before offer", surfaces: { header: "more", palette: true } },
  { href: "/scenarios", label: "Scenarios", group: "Navigate", keywords: "compare what if paths", surfaces: { header: "more", palette: true } },
  { href: "/plan", label: "Plan", group: "Navigate", keywords: "next steps path", surfaces: { header: "more", palette: true } },
  { href: "/simulator", label: "Simulator", paletteLabel: "Simulate your score", group: "Act", keywords: "what if test move", surfaces: { header: "more", palette: true } },

  // ── Header MORE: journal + companion ──
  { href: "/journal", label: "Journal", group: "Navigate", keywords: "decisions log notes", surfaces: { header: "more", palette: true } },
  { href: "/advisor", label: "Companion", paletteLabel: "Talk to the Companion", group: "Act", keywords: "chat advisor ai talk", surfaces: { header: "more", palette: true } },

  // ── Header MORE: insight surfaces ──
  { href: "/decisions", label: "Decisions", group: "Navigate", keywords: "net position", surfaces: { header: "more", palette: true } },
  { href: "/signals", label: "Signals", group: "Navigate", keywords: "timing market watch", surfaces: { header: "more", palette: true } },
  { href: "/twin", label: "Future Twin", group: "Navigate", keywords: "letter future self", surfaces: { header: "more", palette: true } },
  { href: "/trinity", label: "Trinity", group: "Navigate", keywords: "pillars balance", surfaces: { header: "more", palette: true } },
  { href: "/genome", label: "Genome", group: "Navigate", keywords: "psychology profile", surfaces: { header: "more", palette: true } },

  // ── Header MORE: money + life ──
  { href: "/finance", label: "Finance", group: "Navigate", keywords: "budget money numbers", surfaces: { header: "more", palette: true } },
  { href: "/calendar", label: "Calendar", group: "Navigate", keywords: "milestones dates", surfaces: { header: "more", palette: true } },
  { href: "/daily", label: "Daily Check-in", paletteLabel: "Daily check-in", group: "Act", keywords: "mood stress pulse", surfaces: { header: "more", palette: true } },
  { href: "/family", label: "Family", group: "Navigate", keywords: "household members", surfaces: { header: "more", palette: true } },
  { href: "/couples", label: "Couples", group: "Navigate", keywords: "partner alignment", surfaces: { header: "more", palette: true } },
  { href: "/credit", label: "Credit", group: "Navigate", keywords: "score report", surfaces: { header: "more", palette: true } },
  { href: "/connections", label: "Connections", group: "Navigate", keywords: "bank plaid sync accounts", surfaces: { header: "more", palette: true } },

  // ── Role dashboards + account (palette/switcher only — parity exceptions) ──
  { href: "/partner/dashboard", label: "Partner dashboard", group: "Roles", keywords: "referral clients partner", surfaces: { palette: true } },
  { href: "/employee/dashboard", label: "Employee dashboard", group: "Roles", keywords: "benefits employer", surfaces: { palette: true } },
  { href: "/team", label: "Team dashboard", group: "Roles", keywords: "organization b2b aggregate", surfaces: { palette: true } },
  { href: "/admin", label: "Admin", group: "Roles", keywords: "platform users waitlist", surfaces: { palette: true } },
  { href: "/admin/analytics", label: "Admin analytics", group: "Roles", keywords: "posthog funnel growth", surfaces: { palette: true } },
  { href: "/settings", label: "Settings", group: "Navigate", keywords: "account profile billing subscription", surfaces: { palette: true } },
];

export type NavLink = { href: string; label: string };

/** Hrefs gated behind the Agent OS flag (used by palette runtime filtering). */
export const AGENT_OS_GATED_HREFS: ReadonlySet<string> = new Set(
  NAV_CATALOG.filter((e) => e.flag === "agentOs").map((e) => e.href),
);

/** Role-scoped hrefs that must clear switcher visibility rules. */
export const ROLE_SCOPED_HREFS: ReadonlySet<string> = new Set(
  NAV_CATALOG.filter((e) => e.group === "Roles").map((e) => e.href),
);

const flagOn = (e: NavCatalogEntry) => (e.flag === "agentOs" ? agentOs : true);

/** AppHeader primary bar — flag-gated entries removed at build time. */
export const HEADER_PRIMARY_NAV: NavLink[] = NAV_CATALOG.filter(
  (e) => e.surfaces.header === "primary" && flagOn(e),
).map((e) => ({ href: e.href, label: e.label }));

/** AppHeader More dropdown — flag-gated entries removed at build time. */
export const HEADER_MORE_NAV: NavLink[] = NAV_CATALOG.filter(
  (e) => e.surfaces.header === "more" && flagOn(e),
).map((e) => ({ href: e.href, label: e.label }));

/**
 * Full palette catalog including flag-gated entries — the palette filters
 * those at lookup time (visiblePaletteItems), matching prior behavior.
 */
export const PALETTE_SOURCE = NAV_CATALOG.filter((e) => e.surfaces.palette).map(
  (e) => ({
    href: e.href,
    label: e.paletteLabel ?? e.label,
    group: e.group as string,
    keywords: e.keywords,
  }),
);
