// @vitest-environment jsdom
/**
 * Plan Lab smoke — finance PlanTab was deleted; PlanCommand is the surface.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

vi.mock("@/components/planner/plan/PlanPath", () => ({
  default: () => <div data-testid="plan-path">Path lab</div>,
}));
vi.mock("@/components/planner/plan/PlanHousing", () => ({
  default: () => <div>Housing</div>,
}));
vi.mock("@/components/planner/plan/PlanDebt", () => ({
  default: () => <div>Debt</div>,
}));
vi.mock("@/components/planner/plan/PlanConsolidate", () => ({
  default: () => <div>Consolidate</div>,
}));
vi.mock("@/components/planner/plan/PlanHousehold", () => ({
  default: () => <div>Household</div>,
}));
vi.mock("@/components/planner/plan/PlanModels", () => ({
  default: () => <div>Models</div>,
}));
vi.mock("@/components/planner/plan/PlanShare", () => ({
  default: () => <div>Share</div>,
}));

describe("PlanCommand", () => {
  it("renders Plan Lab chrome", async () => {
    const { default: PlanCommand } = await import(
      "@/components/planner/plan/PlanCommand"
    );
    render(<PlanCommand />);
    expect(screen.getByTestId("plan-path")).toBeTruthy();
  });
});
