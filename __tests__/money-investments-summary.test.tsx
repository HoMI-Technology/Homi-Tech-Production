/**
 * Investments stay off the quiet Money Reality picture.
 *
 * Pins:
 *  - MoneyStand does not mount a compact investments summary.
 *  - The /money/investments deep link stays live with its full surface intact.
 *  - No nav chrome re-presents Investments as a 6th peer tab.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MONEY_MODES, modeFromPath } from "@/components/money/MoneyModeNav";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("Investments fold under Reality (static locks)", () => {
  const stand = read("components/money/MoneyStand.tsx");

  it("MoneyStand keeps investments off the quiet picture — depth lives on /money/investments", () => {
    expect(stand).not.toContain("InvestmentsSummary");
    expect(stand).not.toContain("ScoreRail");
    expect(stand).not.toContain("OperateInstrument");
  });

  it("does not remount a ScoreRail or surplus instrument on /money", () => {
    expect(stand).not.toContain("ScoreRail");
    expect(stand).not.toContain("OperateInstrument");
  });

  it("the /money/investments deep link stays live with its full surface intact", () => {
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/investments/page.tsx"))).toBe(
      true,
    );
    const surface = read("app/(product)/money/investments/InvestmentsSurface.tsx");
    expect(surface).toContain("PlaidHoldingsPanel");
    expect(surface).toContain("PortfolioPanel");
    // Reality lights for the folded route — deep links keep working.
    expect(modeFromPath("/money/investments")).toBe("reality");
  });

  it("no nav chrome re-presents Investments as a 6th peer tab", () => {
    expect(MONEY_MODES).toHaveLength(5);
    expect(MONEY_MODES.some((m) => m.href === "/money/investments")).toBe(false);
    expect(MONEY_MODES.map((m) => m.label)).toEqual([
      "Readiness",
      "Reality",
      "Decide",
      "Plan",
      "Goals",
    ]);
    // Desktop sidebar + mobile drawer derive from the same catalog — no Invest entry.
    const sidebar = read("components/layout/AppSidebar.tsx");
    expect(sidebar).not.toContain("/money/investments");
    const bottomNav = read("components/layout/ProductBottomNav.tsx");
    expect(bottomNav).not.toContain("/money/investments");
  });
});
