import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MONEY_MODES, modeFromPath } from "@/components/money/MoneyModeNav";

/**
 * Five-mode navigation lock — Home + Money Reality redesign, Phase 1
 * (navigation foundation). The old six-mode catalog (Stand / Track / Decide /
 * Plan / Goals / Invest) is replaced by exactly five labels; Track and Invest
 * keep their routes as deep links but fold under Reality as the active mode.
 */

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("five-mode navigation", () => {
  it("MONEY_MODES is exactly the five canonical tabs, in order", () => {
    expect(MONEY_MODES.map((m) => m.label)).toEqual([
      "Readiness",
      "Reality",
      "Decide",
      "Plan",
      "Goals",
    ]);
    expect(MONEY_MODES.map((m) => [m.id, m.href])).toEqual([
      ["readiness", "/dashboard"],
      ["reality", "/money"],
      ["decide", "/money/decide"],
      ["plan", "/money/plan"],
      ["goals", "/money/goals"],
    ]);
  });

  it("retired peer tabs fold into Reality without killing deep links", () => {
    // /money/budget (Track) and /money/investments (Invest) stay live routes;
    // they light Reality as the active mode instead of their own peer tab.
    expect(modeFromPath("/money/budget")).toBe("reality");
    expect(modeFromPath("/money/investments")).toBe("reality");
    expect(modeFromPath("/money")).toBe("reality");
    expect(modeFromPath("/money/decide")).toBe("decide");
    expect(modeFromPath("/money/plan")).toBe("plan");
    expect(modeFromPath("/money/goals")).toBe("goals");
    // Phase-1 doctrine stance: Readiness lands on the Path-owned Home fold.
    expect(modeFromPath("/dashboard")).toBe("readiness");
    // Routes outside the five surfaces light no tab.
    expect(modeFromPath("/settings")).toBeNull();
    expect(modeFromPath("/journal")).toBeNull();
  });

  it("carries the locked spec microcopy as tooltips", () => {
    const blurbs = Object.fromEntries(MONEY_MODES.map((m) => [m.id, m.blurb]));
    expect(blurbs.readiness).toBe("Where you stand across the three pillars");
    expect(blurbs.reality).toBe("The picture of your cash, as it actually is");
    expect(blurbs.decide).toBe("Stress the decision before you stretch");
    expect(blurbs.plan).toBe("The path that turns readiness into action");
    expect(blurbs.goals).toBe("What you’re building toward, and how far");
  });

  it("ProductBottomNav is mobile-only and is not the Money cockpit", () => {
    const nav = read("components/layout/ProductBottomNav.tsx");
    expect(nav).toContain("lg:hidden");
    expect(nav).toContain("env(safe-area-inset-bottom");
    expect(nav).toContain('aria-current={isActive ? "page" : undefined}');
    expect(nav).not.toContain("MONEY_MODES");
    expect(nav).not.toContain("MoneyModeNav");
    expect(nav).toContain('label: "HōMI"');
    expect(nav).toContain('label: "Assess"');
  });

  it("bottom nav mounts on signed-in product chrome only", () => {
    const router = read("components/layout/ProductLayoutRouter.tsx");
    expect(router).toContain("ProductBottomNav");
    // Signed-out guests keep the marketing shell; the bar stays off it.
    const layout = read("app/(product)/layout.tsx");
    expect(layout).not.toContain("ProductBottomNav");
  });

  it("Companion FAB clears the bottom bar on mobile", () => {
    const host = read("components/companion/CompanionHost.tsx");
    const widget = read("components/companion/CompanionWidget.tsx");
    expect(host).toContain("max-lg:bottom-");
    expect(widget).toContain("max-lg:bottom-");
  });
});
