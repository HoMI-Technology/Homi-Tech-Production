/**
 * MONEY-TOOLS-DEPTH.md lock — Money/Tools are one-click depth under Path.
 * Home keeps strip-only money CTAs (non-primary) and zero tools grid.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHomeMoneyStandingView } from "@/lib/dashboard/home-money-standing";
import { HOME_DENSITY_LENSES } from "@/lib/dashboard/fold-truth";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("money-tools depth doctrine", () => {
  it("publishes the locked depth doctrine", () => {
    expect(existsSync(resolve(process.cwd(), "docs/MONEY-TOOLS-DEPTH.md"))).toBe(true);
    const doc = read("docs/MONEY-TOOLS-DEPTH.md");
    expect(doc).toMatch(/Where does cash sit/);
    expect(doc).toMatch(/Answer one math question/);
    expect(doc).toMatch(/Path owns the HōMI fold/);
    expect(doc).toMatch(/Money is folded into `\/dashboard`/);
    expect(doc).toMatch(/HōMI \+ Assess/);
    expect(doc).toMatch(/Forbidden patterns/);
  });

  it("Home fold mounts money wait + quiet density below — no kitchen-sink fold widgets", () => {
    const page = read("app/(product)/dashboard/page.tsx");
    const fold = read("components/dashboard/ThresholdFold.tsx");
    const density = read("components/dashboard/HomeDensity.tsx");
    const truth = read("lib/dashboard/fold-truth.ts");
    expect(fold).not.toContain("HomeMoneyStanding");
    expect(fold).toContain("data-home-money-below-fold");
    expect(fold).toContain("HomeDensity");
    expect(page).not.toMatch(/QuickActionGrid|ToolGrid|hubLensesByRing/);
    expect(fold).not.toMatch(/QuickActionGrid|Open lens/);
    expect(fold).not.toContain("FinancialPositionSection");
    expect(density).toContain("HOME_DENSITY_LENSES");
    expect(truth).toContain("/tools/affordability");
    expect(truth).toContain("/tools/debt-payoff");
    expect(truth).toContain("/tools/blind-budget");
    expect(truth).toContain("/tools/monte-carlo");
    expect(truth).not.toContain("/tools/rent-vs-buy");
    expect(density).not.toContain("10,000");
    expect(HOME_DENSITY_LENSES.every((lens) => !lens.line.includes("10,000"))).toBe(true);
    expect(density).not.toMatch(/btn-primary/);
    expect(density).not.toContain("font-display");
  });

  it("Home money standing CTAs stay ghost/sm and deep-link into /money*", () => {
    const money = read("components/dashboard/HomeMoneyStanding.tsx");
    expect(money).toContain("btn-ghost btn-sm");
    expect(money).not.toMatch(/className="btn-primary/);
    expect(money).not.toMatch(/btn-primary btn-sm/);
    expect(money).toContain("view.primaryHref");
    expect(money).toContain("view.secondaryHref");

    const empty = buildHomeMoneyStandingView({
      lastMoney: null,
      hardStopFlags: [],
      bankLinked: false,
    });
    expect(empty.primaryHref).toBe("/money/budget");
    expect(empty.secondaryHref).toBe("/connections");

    const ready = buildHomeMoneyStandingView({
      lastMoney: {
        debtToIncomeRatio: 0.22,
        emergencyFundMonths: 4.2,
        savingsRate: 0.08,
        liquidDollars: 8400,
      },
      hardStopFlags: [],
      bankLinked: true,
    });
    expect(ready.primaryHref).toBe("/money");
    expect(ready.secondaryHref).toBe("/money/decide");
  });

  it("Money v4 and Tools hub declare educational-only posture", () => {
    const moneyPage = read("app/(product)/money/page.tsx");
    const workspace = read("lib/v4/money-workspace.ts");
    expect(moneyPage).toMatch(/Educational/);
    expect(workspace).toMatch(/never invent balances/);
    expect(moneyPage).not.toMatch(/you should buy|limited time|FOMO/i);

    const hub = read("app/(product)/tools/page.tsx");
    expect(hub).toMatch(/Educational estimates/);
    expect(hub).toMatch(/do not provide financial, tax, mortgage, or investment/);
    expect(hub).toMatch(/Answer one math question|Educational estimates/);
  });

  it("ToolShell frames one lens job with educational posture", () => {
    const shell = read("components/tools/ToolShell.tsx");
    expect(shell).toContain("data-tool-lens");
    expect(shell).toContain("data-tool-educational");
    expect(shell).toMatch(/Educational estimates only/);
    expect(shell).toMatch(/Money · lens/);
  });

  it("Decide hub states one-job depth language", () => {
    const decide = read("components/money/MoneyDecideHub.tsx");
    expect(decide).toContain('data-money-job="decide"');
    expect(decide).toMatch(/Answer one math question/);
    expect(decide).toMatch(/Educational estimates/);
  });

  it("does not reopen Path hierarchy or Companion fold line SSOT", () => {
    const path = read("components/dashboard/PathNextMove.tsx");
    expect(path).toContain('data-path-fold-primary=""');
    const truth = read("lib/dashboard/fold-truth.ts");
    expect(truth).toContain("function companionFoldLine");
    expect(truth).toContain(
      "Your next honest move is the binding step on Path to Ready.",
    );
    const fold = read("components/dashboard/ThresholdFold.tsx");
    expect(fold).not.toContain("data-companion-fold-line");
    expect(path).not.toMatch(/MoneyDecideHub|ToolShell|HomeMoneyStanding/);
  });
});
