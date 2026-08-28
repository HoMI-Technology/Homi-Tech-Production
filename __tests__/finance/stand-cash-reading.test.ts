/**
 * T0.3 — same user-visible cash label cannot silently split stores.
 * Home + Money Stand share loadStandMetrics + standCashReading.
 * Track / Pre-Flight must not reuse PERIOD_SURPLUS_LABEL.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PERIOD_SURPLUS_LABEL, TRACK_CASH_FLOW_LABEL, TRACK_NET_CASH_LABEL } from "@/lib/finance/cash-labels";
import { loadStandMetrics } from "@/lib/finance/load-stand-metrics";
import {
  addManualTransaction,
  BUDGET_LEDGER_STORAGE_KEY,
  emptyBudgetLedger,
  saveBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("cash labels do not collide across stores", () => {
  it("Track calendar and ReadinessHero labels are not PERIOD_SURPLUS_LABEL", () => {
    expect(TRACK_NET_CASH_LABEL).not.toBe(PERIOD_SURPLUS_LABEL);
    expect(TRACK_CASH_FLOW_LABEL).not.toBe(PERIOD_SURPLUS_LABEL);
    expect(TRACK_NET_CASH_LABEL).toMatch(/Track/i);
    expect(TRACK_CASH_FLOW_LABEL).toMatch(/Track/i);
  });

  it("Home and Money Stand load the same Stand pipeline", () => {
    const home = read("components/dashboard/HomeMoneyStanding.tsx");
    const stand = read("components/money/MoneyStand.tsx");
    expect(home).toContain("loadStandMetrics");
    expect(home).toContain("buildHomeMoneyStandingView");
    expect(home).toContain("data-home-money-source");
    expect(stand).toContain("loadStandMetrics");
    expect(stand).toContain("standCashReading");
    expect(stand).toContain("data-stand-money-source");
    expect(home).not.toContain("metricsFromLedger");
    expect(stand).not.toContain("metricsFromLedger");
  });

  it("Track calendar does not print unlabeled Net cash flow", () => {
    const tiles = read("components/planner/calendar/StatTiles.tsx");
    expect(tiles).toContain("TRACK_NET_CASH_LABEL");
    expect(tiles).not.toMatch(/label:\s*"Net cash flow"/);
  });

  it("ReadinessHero names Track on the cash-flow tile", () => {
    const hero = read("components/planner/ReadinessHero.tsx");
    expect(hero).toContain("TRACK_CASH_FLOW_LABEL");
    expect(hero).not.toMatch(/label:\s*"Cash flow"/);
  });

  it("Pre-Flight monthly fields name this form, not PERIOD_SURPLUS_LABEL", () => {
    const preflight = read("app/(product)/tools/preflight/page.tsx");
    expect(preflight).not.toContain("PERIOD_SURPLUS_LABEL");
    expect(preflight).not.toContain("Net cash this period");
    expect(preflight).toContain("data-preflight-money-source");
    expect(preflight).toMatch(/not Stand ledger/);
  });
});

describe("loadStandMetrics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage(): Map<string, string> {
    const backing = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => backing.get(k) ?? null,
        setItem: (k: string, v: string) => void backing.set(k, v),
        removeItem: (k: string) => void backing.delete(k),
      },
    });
    return backing;
  }

  it("returns null when nothing is saved", () => {
    expect(loadStandMetrics("2026-08-08T12:00:00.000Z")).toBeNull();
  });

  it("returns the same surplus Home and Money Stand would both read", () => {
    stubStorage();
    const nowIso = "2026-08-08T12:00:00.000Z";
    let ledger = emptyBudgetLedger(nowIso);
    ledger = addManualTransaction(
      ledger,
      {
        type: "income",
        amountCents: 500_000,
        description: "Pay",
        categoryId: "cat-payroll",
        transactionDate: "2026-08-01",
      },
      nowIso,
    );
    ledger = addManualTransaction(
      ledger,
      {
        type: "expense",
        amountCents: 537_500,
        description: "Rent",
        categoryId: "cat-housing",
        transactionDate: "2026-08-02",
      },
      nowIso,
    );
    saveBudgetLedger(ledger);

    expect(window.localStorage.getItem(BUDGET_LEDGER_STORAGE_KEY)).not.toBeNull();
    const loaded = loadStandMetrics(nowIso);
    const direct = metricsFromLedger(ledger, nowIso, nowIso);
    expect(loaded).not.toBeNull();
    expect(loaded!.surplus.dollars).toBe(direct.surplus.dollars);
    expect(loaded!.surplus.dollars).toBe(-375);
  });
});
