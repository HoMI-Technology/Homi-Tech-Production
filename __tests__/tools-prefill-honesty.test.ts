import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ledgerSeedsAreOwn, type LedgerSeeds } from "@/components/tools/seeds";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const EMPTY: LedgerSeeds = {
  annualIncome: 0,
  monthlyIncome: 0,
  monthlyDebts: 0,
  totalDebt: 0,
  monthlyOutflow: 0,
  liquidSavings: 0,
  downPaymentSaved: undefined,
  monthlyCashFlow: 0,
  invested: 0,
};

describe("lens chips do not claim a ledger that is not there", () => {
  it("empty seeds are not own numbers", () => {
    expect(ledgerSeedsAreOwn(EMPTY)).toBe(false);
  });

  it("a live income picture is own numbers", () => {
    expect(ledgerSeedsAreOwn({ ...EMPTY, monthlyIncome: 7150, annualIncome: 85800 })).toBe(true);
  });

  it("panels do not hardcode SeededChip on", () => {
    for (const rel of [
      "components/tools/HousingPanels.tsx",
      "components/tools/TimingPanels.tsx",
      "components/tools/StabilityPanels.tsx",
      "components/tools/Pass1Panels.tsx",
    ]) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/<ToolPanel[^>]*\sseeded(?!=)/);
      expect(src, rel).not.toMatch(/<ToolPanel[^>]*\sseeded>/);
    }
  });

  it("tools hub does not claim every signed-in visitor is pre-filled from the ledger", () => {
    expect(read("app/(product)/tools/page.tsx")).not.toMatch(/pre-filled from your ledger/i);
  });
});

describe("Track planner does not auto-seed fake linked accounts", () => {
  it("first visit no longer writes demo Chase/Ally accounts", () => {
    const page = read("components/planner/PlannerPage.tsx");
    expect(page).not.toContain("useFirstVisitDemoSeed");
    expect(page).not.toContain("homi-planner-visited-v1");
    expect(page).toContain("Load sample numbers");
  });
});
