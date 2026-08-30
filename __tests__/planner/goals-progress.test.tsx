// @vitest-environment jsdom
/**
 * Phase 4 — Goals visual upgrade (spec §4.5).
 *
 * Pins the progress ring/bar rendering and the premium empty state against
 * seeded ledgers. Every percentage asserted here flows from the seeded
 * ledger's real current/target cents through goals-derive.goalRow — only
 * storage is mocked, never the derivation layer. Reduced motion is forced on
 * so the final visual state is what the assertions see.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COLORS } from "@/lib/brand";
import {
  emptyBudgetLedger,
  upsertGoal,
  type BudgetLedgerState,
  type GoalInput,
} from "@/lib/finance/local-ledger";

let ledgerState: BudgetLedgerState;

vi.mock("@/lib/finance/local-ledger", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/finance/local-ledger")>();
  return {
    ...actual,
    loadBudgetLedger: () => ledgerState,
    saveBudgetLedger: vi.fn(() => true),
  };
});

/** Final state immediately — the reduced-motion contract under test. */
vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const NOW = "2026-08-22T12:00:00.000Z";

function ledgerWith(goals: GoalInput[]): BudgetLedgerState {
  let state = emptyBudgetLedger(NOW);
  for (const goal of goals) state = upsertGoal(state, goal, NOW);
  return state;
}

/** A date-only string N months from the real today (GoalsCommand reads the live clock). */
function dateMonthsAhead(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const ON_TRACK: GoalInput = {
  name: "House deposit",
  goalType: "home",
  targetAmountCents: 20_000_00,
  currentAmountCents: 5_000_00,
  plannedMonthlyContributionCents: 500_00,
  targetDate: null,
};

const FUNDED: GoalInput = {
  name: "Reserve",
  goalType: "emergency_reserve",
  targetAmountCents: 1_000_00,
  currentAmountCents: 1_000_00,
  plannedMonthlyContributionCents: 0,
  targetDate: null,
};

/** Planned pace ($100/mo) cannot reach $10k in ~2 months → goals-derive rules behind. */
const BEHIND: GoalInput = {
  name: "Wedding",
  goalType: "family",
  targetAmountCents: 10_000_00,
  currentAmountCents: 1_000_00,
  plannedMonthlyContributionCents: 100_00,
  targetDate: dateMonthsAhead(2),
};

function cardFor(name: string): HTMLElement {
  const card = screen.getByText(name).closest("li");
  if (!card) throw new Error(`no card rendered for ${name}`);
  return card;
}

function ringStroke(name: string): string | null {
  const ring = within(cardFor(name)).getByTestId("goal-progress-ring");
  const circles = ring.querySelectorAll("circle");
  return circles[1]?.getAttribute("stroke") ?? null;
}

beforeEach(() => {
  ledgerState = ledgerWith([]);
});

afterEach(() => {
  cleanup();
});

describe("GoalsCommand progress visuals", () => {
  it("renders a progress ring per goal with the real funded percentage", async () => {
    ledgerState = ledgerWith([ON_TRACK, FUNDED]);
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    await screen.findByText("House deposit");
    expect(screen.getAllByTestId("goal-progress-ring")).toHaveLength(2);

    const house = cardFor("House deposit");
    // 5,000 of 20,000 → 25%, from the seeded ledger, not a fixture constant.
    expect(within(house).getByText("25% funded")).toBeTruthy();
    expect(within(house).getByText("25%")).toBeTruthy();
    const bar = within(house).getByRole("progressbar", { name: "House deposit funded" });
    expect(bar.getAttribute("aria-valuenow")).toBe("25");

    const reserve = cardFor("Reserve");
    expect(within(reserve).getByText("100% funded")).toBeTruthy();
    expect(within(reserve).getByText("Funded")).toBeTruthy();
  });

  it("fills emerald on pace or funded, amber only when goals-derive rules behind", async () => {
    ledgerState = ledgerWith([ON_TRACK, BEHIND, FUNDED]);
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    await screen.findByText("Wedding");
    expect(ringStroke("House deposit")).toBe(COLORS.emerald);
    expect(ringStroke("Reserve")).toBe(COLORS.emerald);
    expect(ringStroke("Wedding")).toBe(COLORS.amber);
    // The behind ruling keeps its existing honest copy, not a new status.
    expect(within(cardFor("Wedding")).getByText(/Needs /)).toBeTruthy();
  });

  it("renders the final state immediately when reduced motion is preferred", async () => {
    ledgerState = ledgerWith([ON_TRACK]);
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    await screen.findByText("House deposit");
    const ring = within(cardFor("House deposit")).getByTestId("goal-progress-ring");
    expect(ring.getAttribute("data-reduced-motion")).toBe("true");
    // Final percentage is present on first paint — nothing waits on an animation.
    expect(within(cardFor("House deposit")).getByText("25%")).toBeTruthy();
    expect(ring.getAttribute("aria-label")).toBe("House deposit: 25% funded");
  });

  it("keeps the portfolio totals honest alongside the rings", async () => {
    ledgerState = ledgerWith([ON_TRACK, FUNDED]);
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    await screen.findByText("House deposit");
    // (5,000 + 1,000) of (20,000 + 1,000) = 28.6% across 2 goals.
    expect(screen.getByText("28.6%")).toBeTruthy();
    expect(screen.getByText("across 2 goals")).toBeTruthy();
  });
});

describe("GoalsCommand empty state", () => {
  it("shows the §G posture line with a zero-shame caption and a CTA", async () => {
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    expect(await screen.findByText("What you're building toward, and how far.")).toBeTruthy();
    expect(screen.getByText(/blank page, not a failure/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add your first goal" })).toBeTruthy();
    expect(screen.queryByTestId("goal-progress-ring")).toBeNull();
  });

  it("opens the goal form from the empty-state CTA", async () => {
    const { GoalsCommand } = await import("@/components/planner/goals/GoalsCommand");
    render(<GoalsCommand />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Add your first goal" }));
    expect(await screen.findByRole("button", { name: "Add goal" })).toBeTruthy();
    expect(screen.getByText("Monthly contribution")).toBeTruthy();
  });
});
