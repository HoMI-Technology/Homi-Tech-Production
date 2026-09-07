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
 * - /agent-hub: deep Agent OS surface; /agents (roster) is the chrome entry.
 * - /plan: checklist deep-link; Path to Ready owns the living Build in chrome.
 * - /advisor is not a catalog row (widget + route; a Companion row reads as chrome).
 */
const PALETTE_ONLY_HREFS = [
  "/partner/dashboard",
  "/employee/dashboard",
  "/team",
  "/admin",
  "/admin/analytics",
  "/settings",
  "/settings/subscription",
  "/agent-hub",
  "/plan",
  // Money hub is More + palette; modes stay palette-only
  "/money/budget",
  "/money/decide",
  "/money/plan",
  // Demoted from More — still palette-reachable (JOBS_CRAFT v3)
  "/tools/preflight",
  "/scenarios",
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

  it("Results is off chrome and palette; Path owns Measure", async () => {
    const { nav, palette } = await loadSurfaces("true");
    const moreHrefs = nav.APP_MORE_NAV.map((i) => i.href);
    expect(moreHrefs).toContain("/path");
    expect(moreHrefs).not.toContain("/results");
    expect(palette.PALETTE_CATALOG.map((i) => i.href)).not.toContain("/results");
    expect(palette.PALETTE_CATALOG.map((i) => i.href)).not.toContain("/shadow-score");
    expect(palette.PALETTE_CATALOG.map((i) => i.href)).not.toContain("/advisor");
  });

  it("Companion /advisor stays off More and Jump-to — catalog as shipped; do not invent nav", async () => {
    const { nav, palette } = await loadSurfaces("true");
    expect(nav.APP_MORE_NAV.map((i) => i.href)).not.toContain("/advisor");
    expect(nav.APP_MORE_NAV.map((i) => i.label)).not.toContain("Companion");
    expect(palette.PALETTE_CATALOG.map((i) => i.href)).not.toContain("/advisor");
    expect(palette.PALETTE_CATALOG.map((i) => i.label)).not.toContain("Companion");
    expect(palette.visiblePaletteItems({ role: "user" }).map((i) => i.href)).not.toContain(
      "/advisor",
    );
    expect(palette.visiblePaletteItems({ role: "admin" }).map((i) => i.href)).not.toContain(
      "/advisor",
    );
    const { NAV_CATALOG } = await import("@/lib/layout/nav-catalog");
    expect(NAV_CATALOG.some((e) => e.href === "/advisor")).toBe(false);
    expect(NAV_CATALOG.some((e) => e.label === "Companion")).toBe(false);
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
