/**
 * Capability-filtered command palette destinations.
 * Same authorization surface as the dashboard switcher + product nav —
 * never list Admin/Partner/Employee for users who will only hit AccessPanel.
 *
 * The catalog itself is derived from the single nav catalog
 * (lib/layout/nav-catalog.ts) shared with the AppHeader, so the two surfaces
 * can never drift; this module keeps the runtime role/flag filtering.
 */

import { visibleDashboards, type SwitcherContext } from "@/lib/dashboard/switcher-visibility";
import { agentOs } from "@/lib/flags";
import { AGENT_OS_GATED_HREFS, PALETTE_SOURCE, ROLE_SCOPED_HREFS } from "@/lib/layout/nav-catalog";

export type PaletteItem = {
  href: string;
  label: string;
  group: string;
  keywords?: string;
};

/** Base catalog — filtered at runtime by role context. */
export const PALETTE_CATALOG: PaletteItem[] = PALETTE_SOURCE.map((e) => ({
  href: e.href,
  label: e.label,
  group: e.group,
  ...(e.keywords ? { keywords: e.keywords } : {}),
}));

/**
 * Returns palette items the user is allowed to open from chrome.
 * Role destinations must appear in visibleDashboards for the same context.
 */
export function visiblePaletteItems(ctx: SwitcherContext): PaletteItem[] {
  const roleHomes = new Set(visibleDashboards(ctx).map((d) => d.href));

  return PALETTE_CATALOG.filter((item) => {
    if (AGENT_OS_GATED_HREFS.has(item.href)) {
      return agentOs;
    }
    if (ROLE_SCOPED_HREFS.has(item.href)) {
      return roleHomes.has(item.href);
    }
    return true;
  });
}
