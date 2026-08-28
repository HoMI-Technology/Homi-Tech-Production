import { describe, expect, it } from "vitest";
import { APP_MORE_NAV, APP_PRIMARY_NAV } from "@/lib/layout/app-nav";
import { MONEY_MODES, modeFromPath } from "@/components/money/MoneyModeNav";

/**
 * The five product modes are the primary product map.
 *
 * Founder doctrine (2026-08-27): "Readiness · Reality · Decide · Plan · Goals"
 * are the navigation, on desktop and on mobile. Money is not a place a user
 * opens before they can work — it IS the four non-Readiness modes.
 *
 * These cases encode the non-negotiable outcomes so the old shape cannot come
 * back quietly. The hard failure condition is explicit: any arrangement that
 * requires opening a "Money" parent first is wrong.
 */

const MODE_HREFS = MONEY_MODES.map((m) => m.href);
const CHROME_HREFS = [...APP_PRIMARY_NAV, ...APP_MORE_NAV].map((i) => i.href);

describe("the five product modes are primary navigation", () => {
  it("names exactly the five canonical labels, in order", () => {
    expect(MONEY_MODES.map((m) => m.label)).toEqual([
      "Readiness",
      "Reality",
      "Decide",
      "Plan",
      "Goals",
    ]);
  });

  it("routes each mode to its canonical destination", () => {
    expect(MODE_HREFS).toEqual([
      "/dashboard",
      "/money",
      "/money/decide",
      "/money/plan",
      "/money/goals",
    ]);
  });

  it("puts every mode in PRIMARY chrome — none nested behind a parent", () => {
    const primary = APP_PRIMARY_NAV.map((i) => i.href);
    for (const href of MODE_HREFS) {
      expect(primary).toContain(href);
    }
  });

  it("HARD FAILURE GUARD: no mode is reachable only via a Money parent", () => {
    // Every working mode must stand on its own in chrome. If any of these were
    // absent, the user would have to open /money first — which is the exact
    // failure condition the redesign exists to remove.
    const primary = APP_PRIMARY_NAV.map((i) => i.href);
    for (const href of ["/money/decide", "/money/plan", "/money/goals"]) {
      expect(
        primary.includes(href),
        `${href} must be primary chrome, not nested under a Money parent`,
      ).toBe(true);
    }
  });

  it("folds Track and Invest into Reality rather than adding peer tabs", () => {
    expect(MODE_HREFS).not.toContain("/money/budget");
    expect(MODE_HREFS).not.toContain("/money/investments");
    expect(modeFromPath("/money/budget")).toBe("reality");
    expect(modeFromPath("/money/investments")).toBe("reality");
  });

  it("keeps every deep link resolving to a mode", () => {
    expect(modeFromPath("/dashboard")).toBe("readiness");
    expect(modeFromPath("/money")).toBe("reality");
    expect(modeFromPath("/money/decide")).toBe("decide");
    expect(modeFromPath("/money/plan")).toBe("plan");
    expect(modeFromPath("/money/goals")).toBe("goals");
  });

  it("carries the founder's microcopy verbatim", () => {
    const blurb = (id: string) => MONEY_MODES.find((m) => m.id === id)?.blurb;
    expect(blurb("readiness")).toBe("Where you stand across the three pillars");
    expect(blurb("reality")).toBe("The picture of your cash, as it actually is");
    expect(blurb("decide")).toBe("Stress the decision before you stretch");
    expect(blurb("plan")).toBe("The path that turns readiness into action");
    expect(blurb("goals")).toBe("What you’re building toward, and how far");
  });

  it("keeps the modes inside the catalog-derived chrome set", () => {
    // Parity: the rail renders APP_PRIMARY_NAV + APP_MORE_NAV, so a mode that
    // is not in that union would render nowhere on desktop.
    for (const href of MODE_HREFS) {
      expect(CHROME_HREFS).toContain(href);
    }
  });
});
