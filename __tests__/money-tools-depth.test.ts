/**
 * MONEY-TOOLS-DEPTH.md lock — Money/Tools are one-click depth under Path.
 * Home keeps strip-only money CTAs (non-primary) and zero tools grid.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHomeMoneyStandingView } from "@/lib/dashboard/home-money-standing";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("money-tools depth doctrine", () => {
  it("publishes the locked depth doctrine", () => {
    expect(existsSync(resolve(process.cwd(), "docs/MONEY-TOOLS-DEPTH.md"))).toBe(true);
    const doc = read("docs/MONEY-TOOLS-DEPTH.md");
    expect(doc).toMatch(/Where does cash sit/);
    expect(doc).toMatch(/Answer one math question/);
    expect(doc).toMatch(/Path owns the Home fold/);
    expect(doc).toMatch(/Forbidden patterns/);
  });

  it("Home fold mounts money strip only — no tools grid or kitchen-sink widgets", () => {
    const page = read("app/(product)/dashboard/page.tsx");
    const fold = read("components/dashboard/HomeFold.tsx");
    expect(fold).toContain("HomeMoneyStanding");
    expect(page).not.toMatch(/QuickActionGrid|ToolGrid|hubLensesByRing/);
    expect(fold).not.toMatch(/QuickActionGrid|\/tools\/affordability|Open lens/);
    expect(fold).not.toContain("FinancialPositionSection");
  });

  it("Home money standing CTAs stay ghost/sm and deep-link into /money*", () => {
    const money = read("components/dashboard/HomeMoneyStanding.tsx");
    expect(money).toContain("btn-ghost btn-sm");
    expect(money).not.toMatch(/className="btn-primary/);
    expect(money).not.toMatch(/btn-primary btn-sm/);
    expect(money).toContain("view.primaryHref");
    expect(money).toContain("view.secondaryHref");

    const empty = buildHomeMoneyStandingView(null);
    expect(empty.primaryHref).toBe("/money/budget");
    expect(empty.secondaryHref).toBe("/connections");

    const ready = buildHomeMoneyStandingView({
      source: "ledger",
      asOf: "2026-08-18T12:00:00.000Z",
      surplus: {
        dollars: 420,
        incomeDollars: 5000,
        expenseDollars: 4200,
        debtPaymentDollars: 380,
        formula: "income - netExpense - debtPayments",
      },
      runway: {
        months: 4.2,
        liquidDollars: 8400,
        liquidSource: "emergency_goal",
        monthlyOutflowDollars: 2000,
      },
      dti: { pct: 22, incomeDollars: 5000, debtPaymentDollars: 1100 },
      savingsRatePct: 8,
      evidence: {
        completeness: "medium",
        sourceMode: "manual",
        monthsWithData: 2,
        uncategorizedCount: 0,
        pendingTransactionCount: 0,
        latestTransactionDate: "2026-08-17",
        hasIncome: true,
        hasExpenses: true,
        hasDebtSignal: true,
        liquidSource: "emergency_goal",
      },
      periodTotals: null,
    });
    expect(ready.primaryHref).toBe("/money");
    expect(ready.secondaryHref).toBe("/money/decide");
  });

  it("Money Stand and Tools hub declare educational-only posture", () => {
    const stand = read("components/money/MoneyStand.tsx");
    expect(stand).toMatch(/educational/i);
    expect(stand).toMatch(/not provide financial, tax, mortgage, or investment/i);
    expect(stand).not.toMatch(/you should buy|limited time|FOMO/i);

    const hub = read("app/(product)/tools/page.tsx");
    expect(hub).toMatch(/Educational estimates/);
    expect(hub).toMatch(/do not provide financial, tax, mortgage, or investment/);
    expect(hub).toMatch(/Answer one math question|Lenses for the math/);
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
    const fold = read("components/dashboard/HomeFold.tsx");
    expect(fold).toContain("data-companion-fold-line");
    // This change set must not rewrite presence or Path CTA files.
    expect(path).not.toMatch(/MoneyDecideHub|ToolShell|HomeMoneyStanding/);
  });
});
