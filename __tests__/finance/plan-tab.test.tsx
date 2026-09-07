// @vitest-environment jsdom
/**
 * Plan Lab chrome — heading, Plan sections nav, and tab switch Path → Housing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/planner/store", () => {
  const state = {
    path: null,
    regeneratePath: vi.fn(),
    clearPath: vi.fn(),
    transactions: [],
    accounts: [],
    bills: [],
    holdings: [],
    netWorthItems: [],
    savingsGoal: { name: "EF", target: 0, current: 0 },
    readinessProfile: { profileComplete: false },
    debts: [],
    householdPartner: { enabled: false, label: "Partner" },
    toolsOverlay: { extraDebtPayment: 0 },
  };
  const usePlannerStore = (sel: (s: typeof state) => unknown) => sel(state);
  usePlannerStore.getState = () => state;
  return { usePlannerStore };
});

vi.mock("@/components/planner/plan/PlanCashFlow", () => ({
  default: () => <div>Cash flow</div>,
}));
vi.mock("@/components/planner/plan/PlanPath", () => ({
  default: () => <div>Path lab</div>,
}));
vi.mock("@/components/planner/plan/PlanHousing", () => ({
  default: () => <div>Housing lab</div>,
}));
vi.mock("@/components/planner/plan/PlanDebt", () => ({
  default: () => <div>Debt lab</div>,
}));
vi.mock("@/components/planner/plan/PlanConsolidate", () => ({
  default: () => <div>Consolidate lab</div>,
}));
vi.mock("@/components/planner/plan/PlanHousehold", () => ({
  default: () => <div>Household lab</div>,
}));
vi.mock("@/components/planner/plan/PlanModels", () => ({
  default: () => <div>Models lab</div>,
}));
vi.mock("@/components/planner/plan/PlanShare", () => ({
  default: () => <div>Share lab</div>,
}));

afterEach(() => {
  cleanup();
});

describe("PlanCommand", () => {
  it("renders Plan Lab chrome and opens Housing from the sections nav", async () => {
    const user = userEvent.setup();
    const { default: PlanCommand } = await import("@/components/planner/plan/PlanCommand");
    render(<PlanCommand />);

    expect(screen.getByText("Money plan · depth")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Money plan" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Plan sections" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /path/i }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Path lab")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /housing/i }));
    expect(screen.getByRole("button", { name: /housing/i }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(await screen.findByText("Housing lab")).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("Path lab")).toBeNull();
    });
  });
});
