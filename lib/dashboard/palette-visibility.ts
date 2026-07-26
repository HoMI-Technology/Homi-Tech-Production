/**
 * Capability-filtered command palette destinations.
 * Same authorization surface as the dashboard switcher + product nav —
 * never list Admin/Partner/Employee for users who will only hit AccessPanel.
 */

import {
  visibleDashboards,
  type SwitcherContext,
} from "@/lib/dashboard/switcher-visibility";

export type PaletteItem = {
  href: string;
  label: string;
  group: string;
  keywords?: string;
};

/** Base catalog — filtered at runtime by role context. */
export const PALETTE_CATALOG: PaletteItem[] = [
  { href: "/dashboard", label: "Dashboard", group: "Navigate", keywords: "home overview score" },
  { href: "/assessment", label: "Take the assessment", group: "Act", keywords: "readiness verdict full test measure" },
  { href: "/shadow-score", label: "Get a Shadow Score", group: "Act", keywords: "quick score fast read" },
  { href: "/daily", label: "Daily check-in", group: "Act", keywords: "mood stress pulse" },
  { href: "/simulator", label: "Simulate your score", group: "Act", keywords: "what if test move" },
  { href: "/advisor", label: "Talk to the Companion", group: "Act", keywords: "chat advisor ai talk" },
  { href: "/agents", label: "AI Agents roster", group: "Act", keywords: "agent os ensemble homie scout" },
  { href: "/agent-hub", label: "Agent Hub feed", group: "Act", keywords: "architecture json prompt export scrape" },
  { href: "/tools", label: "Tools", group: "Navigate", keywords: "calculators mortgage affordability money" },
  { href: "/journal", label: "Journal", group: "Navigate", keywords: "decisions log notes" },
  { href: "/plan", label: "Plan", group: "Navigate", keywords: "next steps path" },
  { href: "/decisions", label: "Decisions", group: "Navigate", keywords: "net position" },
  { href: "/signals", label: "Signals", group: "Navigate", keywords: "timing market watch" },
  { href: "/twin", label: "Future Twin", group: "Navigate", keywords: "letter future self" },
  { href: "/trinity", label: "Trinity", group: "Navigate", keywords: "pillars balance" },
  { href: "/finance", label: "Finance", group: "Navigate", keywords: "budget money numbers" },
  { href: "/calendar", label: "Calendar", group: "Navigate", keywords: "milestones dates" },
  { href: "/family", label: "Family", group: "Navigate", keywords: "household members" },
  { href: "/credit", label: "Credit", group: "Navigate", keywords: "score report" },
  { href: "/connections", label: "Connections", group: "Navigate", keywords: "bank plaid sync accounts" },
  { href: "/couples", label: "Couples", group: "Navigate", keywords: "partner alignment" },
  { href: "/genome", label: "Genome", group: "Navigate", keywords: "psychology profile" },
  { href: "/partner/dashboard", label: "Partner dashboard", group: "Roles", keywords: "referral clients partner" },
  { href: "/employee/dashboard", label: "Employee dashboard", group: "Roles", keywords: "benefits employer" },
  { href: "/team", label: "Team dashboard", group: "Roles", keywords: "organization b2b aggregate" },
  { href: "/admin", label: "Admin", group: "Roles", keywords: "platform users waitlist" },
  { href: "/admin/analytics", label: "Admin analytics", group: "Roles", keywords: "posthog funnel growth" },
  { href: "/settings", label: "Settings", group: "Navigate", keywords: "account profile billing subscription" },
];

const ROLE_HREFS = new Set([
  "/partner/dashboard",
  "/employee/dashboard",
  "/team",
  "/admin",
  "/admin/analytics",
]);

/**
 * Returns palette items the user is allowed to open from chrome.
 * Role destinations must appear in visibleDashboards for the same context.
 */
export function visiblePaletteItems(ctx: SwitcherContext): PaletteItem[] {
  const roleHomes = new Set(visibleDashboards(ctx).map((d) => d.href));
  const agentsOn = process.env.NEXT_PUBLIC_FF_AGENT_OS === "true";

  return PALETTE_CATALOG.filter((item) => {
    if (item.href === "/agents" || item.href === "/agent-hub") {
      return agentsOn;
    }
    if (ROLE_HREFS.has(item.href)) {
      return roleHomes.has(item.href);
    }
    return true;
  });
}
