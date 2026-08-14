import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Nav parity — AppHeader (primary + More) and the command palette both derive
 * from lib/layout/nav-catalog.ts and must expose the SAME product-surface set.
 * If this test fails, add the route to the catalog with the right `surfaces`
 * value; never patch one surface by hand.
 */

/**
 * Explicit palette-only exceptions. This encodes current intent — do not grow
 * this list casually:
 * - Role-scoped dashboards (/partner/dashboard, /employee/dashboard, /team,
 *   /admin, /admin/analytics): reachable via palette + DashboardSwitcher only,
 *   gated by the visibleDashboards role rules.
 * - /settings and /settings/subscription: account surfaces; palette + user
 *   menu, not product chrome.
 * - /shadow-score: quick-score lead-gen action; intentionally not chrome nav.
 * - /agent-hub: deep Agent OS surface; /agents (roster) is the chrome entry.
 * - /advisor: Companion chat stays reachable via palette + widget, not More.
 */
const PALETTE_ONLY_HREFS = [
  "/partner/dashboard",
  "/employee/dashboard",
  "/team",
  "/admin",
  "/admin/analytics",
  "/settings",
  "/settings/subscription",
  "/shadow-score",
  "/agent-hub",
  "/advisor",
  // Money modes: primary Money + MoneyModeNav; not duplicated in More
  "/money/budget",
  "/money/decide",
  "/money/plan",
];

/** Import both surfaces with the Agent OS flag ON so gated entries count. */
async function loadSurfaces(flag: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_FF_AGENT_OS", flag);
  const nav = await import("@/lib/layout/app-nav");
  const palette = await import("@/lib/dashboard/palette-visibility");
  return { nav, palette };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("nav catalog parity", () => {
  it("palette product entries equal AppHeader primary+More minus documented exceptions", async () => {
    const { nav, palette } = await loadSurfaces("true");
    const headerHrefs = [...nav.APP_PRIMARY_NAV, ...nav.APP_MORE_NAV].map((i) => i.href).sort();
    const paletteProductHrefs = palette.PALETTE_CATALOG.map((i) => i.href)
      .filter((href) => !PALETTE_ONLY_HREFS.includes(href))
      .sort();
    expect(paletteProductHrefs).toEqual(headerHrefs);
  });

  it("every documented exception actually exists in the palette", async () => {
    const { palette } = await loadSurfaces("true");
    const hrefs = palette.PALETTE_CATALOG.map((i) => i.href);
    for (const href of PALETTE_ONLY_HREFS) {
      expect(hrefs).toContain(href);
    }
  });

  it("catalog has no duplicate hrefs", async () => {
    const { NAV_CATALOG } = await import("@/lib/layout/nav-catalog");
    const hrefs = NAV_CATALOG.map((e) => e.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("Results sits adjacent to Path to Ready and reaches both surfaces", async () => {
    const { nav, palette } = await loadSurfaces("true");
    const moreHrefs = nav.APP_MORE_NAV.map((i) => i.href);
    const pathIdx = moreHrefs.indexOf("/path");
    expect(pathIdx).toBeGreaterThanOrEqual(0);
    expect(moreHrefs[pathIdx + 1]).toBe("/results");
    expect(palette.PALETTE_CATALOG.map((i) => i.href)).toContain("/results");
  });

  it("agentOs keywords never include homie scout, even when the flag is off", async () => {
    await loadSurfaces("false");
    const { NAV_CATALOG } = await import("@/lib/layout/nav-catalog");
    for (const entry of NAV_CATALOG) {
      const hay = `${entry.keywords ?? ""} ${entry.label} ${entry.paletteLabel ?? ""}`.toLowerCase();
      expect(hay, entry.href).not.toMatch(/homie[\s-]?scout/);
    }
  });

  it("agent surfaces are gated by the agentOs flag on both surfaces", async () => {
    const off = await loadSurfaces("false");
    expect(off.nav.APP_PRIMARY_NAV.map((i) => i.href)).not.toContain("/agents");
    const offVisible = off.palette.visiblePaletteItems({ role: "user" }).map((i) => i.href);
    expect(offVisible).not.toContain("/agents");
    expect(offVisible).not.toContain("/agent-hub");

    const on = await loadSurfaces("true");
    expect(on.nav.APP_PRIMARY_NAV.map((i) => i.href)).toContain("/agents");
    const onVisible = on.palette.visiblePaletteItems({ role: "user" }).map((i) => i.href);
    expect(onVisible).toContain("/agents");
    expect(onVisible).toContain("/agent-hub");
  });
});
