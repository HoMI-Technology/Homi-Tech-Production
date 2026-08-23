// @vitest-environment jsdom
/**
 * Plan cash-flow chart (spec §4.4 / Phase 3) — recharts visualization on the
 * Plan tab fed by real planner-store selectors (summarize / financialReality
 * over the transactions slice the ledger-bridge keeps in sync). Covers:
 * chart mounts with seeded data, honest empty state without data, §7
 * thin-evidence draft labeling, and prefers-reduced-motion wiring.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Transaction } from "@/lib/planner/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const motion = vi.hoisted(() => ({ reduced: false }));
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => motion.reduced,
}));

const storeState = {
  transactions: [] as Transaction[],
  accounts: [] as { id: string; type: string; balance: number }[],
  bills: [] as { id: string; amount: number; status: string; category: string }[],
};

vi.mock("@/lib/planner/store", () => {
  const usePlannerStore = (sel: (s: typeof storeState) => unknown) => sel(storeState);
  usePlannerStore.getState = () => storeState;
  return { usePlannerStore };
});

const tx = (
  id: string,
  type: Transaction["type"],
  amount: number,
  category: Transaction["category"],
  date: string,
): Transaction => ({ id, type, amount, category, date, source: "manual" });

function seedLedger() {
  storeState.transactions = [
    tx("t1", "income", 6200, "salary", "2026-08-10"),
    tx("t2", "expense", 1850, "housing", "2026-08-11"),
    tx("t3", "expense", 312, "food", "2026-08-11"),
    tx("t4", "income", 450, "freelance", "2026-08-12"),
    tx("t5", "expense", 86, "transport", "2026-08-12"),
  ];
  storeState.accounts = [{ id: "a1", type: "checking", balance: 5000 }];
  storeState.bills = [];
}

beforeEach(() => {
  storeState.transactions = [];
  storeState.accounts = [];
  storeState.bills = [];
  motion.reduced = false;
});

afterEach(cleanup);

describe("PlanCashFlow", () => {
  it("mounts the chart with real seeded ledger data", async () => {
    seedLedger();
    const { default: PlanCashFlow } = await import("@/components/planner/plan/PlanCashFlow");
    render(<PlanCashFlow />);

    expect(screen.getByTestId("plan-cashflow-chart")).toBeTruthy();
    // Tiles render the seeded totals — income 6200 + 450, expenses 1850 + 312 + 86.
    expect(screen.getByText("$6,650")).toBeTruthy();
    expect(screen.getByText("$2,248")).toBeTruthy();
    expect(screen.getByText("$4,402")).toBeTruthy();
    expect(screen.getByText("66%")).toBeTruthy();
    // Full picture → no thin-evidence banner.
    expect(screen.queryByTestId("plan-cashflow-thin")).toBeNull();
  });

  it("renders the honest empty state when the ledger is empty", async () => {
    const { default: PlanCashFlow } = await import("@/components/planner/plan/PlanCashFlow");
    render(<PlanCashFlow />);

    expect(
      screen.getByText("No picture yet. Open Ledger or connect a bank to begin."),
    ).toBeTruthy();
    expect(screen.queryByTestId("plan-cashflow-chart")).toBeNull();
  });

  it("labels numbers as drafts on a thin, one-sided ledger (§7)", async () => {
    storeState.transactions = [tx("t1", "expense", 42, "food", "2026-08-12")];
    const { default: PlanCashFlow } = await import("@/components/planner/plan/PlanCashFlow");
    render(<PlanCashFlow />);

    const banner = screen.getByTestId("plan-cashflow-thin");
    expect(banner.textContent).toContain(
      "Partial picture — more evidence makes the reading honest.",
    );
    expect(screen.getAllByText("Draft — thin evidence").length).toBeGreaterThan(0);
  });

  it("disables chart animation under prefers-reduced-motion", async () => {
    motion.reduced = true;
    seedLedger();
    const { default: PlanCashFlow } = await import("@/components/planner/plan/PlanCashFlow");
    render(<PlanCashFlow />);

    expect(screen.getByTestId("plan-cashflow-chart").dataset.reducedMotion).toBe("true");
  });
});

describe("buildCashFlowSeries", () => {
  it("groups transactions by recorded day, sorted, with net per day", async () => {
    const { buildCashFlowSeries } = await import("@/components/planner/plan/PlanCashFlow");
    const rows = buildCashFlowSeries([
      { type: "expense", amount: 312, date: "2026-08-11" },
      { type: "income", amount: 6200, date: "2026-08-10" },
      { type: "expense", amount: 1850, date: "2026-08-11" },
      { type: "income", amount: 450, date: "2026-08-12" },
    ]);

    expect(rows.map((r) => r.date)).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
    expect(rows[0]).toMatchObject({ in: 6200, out: 0, net: 6200, day: "8/10" });
    expect(rows[1]).toMatchObject({ in: 0, out: 2162, net: -2162 });
    expect(rows[2]).toMatchObject({ in: 450, out: 0, net: 450 });
  });
});
