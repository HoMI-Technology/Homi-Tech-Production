// @vitest-environment jsdom
/**
 * Track Overview owns Suggested move (OverviewCommand). NudgeRail must hide
 * on overview and show on other Track sections — dogfood → Production PR #2.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BehaviorNudge } from "@/lib/planner/nudges";

const nudge: BehaviorNudge = {
  id: "n1",
  kind: "protect_decision",
  priority: 1,
  title: "Protect the decision first",
  body: "Clear hard-stops before stretch.",
  actionLabel: "Open Plan",
  actionTab: "plan",
  chip: "Protection",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/planner/store", () => {
  const state = {
    clearWorkspace: vi.fn(),
    resetDemo: vi.fn(),
    transactions: [],
    accounts: [],
    bills: [],
    holdings: [],
    netWorthItems: [],
    path: null,
    checkins: [],
    dismissedSignals: [],
    dismissSignal: vi.fn(),
    lastImpact: null,
    readinessProfile: { partnerAlignment: 7 },
    clearLastImpact: vi.fn(),
    setReadinessProfile: vi.fn(),
  };
  const usePlannerStore = (sel: (s: typeof state) => unknown) => sel(state);
  usePlannerStore.getState = () => state;
  return { usePlannerStore };
});

vi.mock("@/lib/planner/nudges", async () => {
  const actual = await vi.importActual<typeof import("@/lib/planner/nudges")>(
    "@/lib/planner/nudges",
  );
  return {
    ...actual,
    deriveBehaviorNudges: () => [nudge],
  };
});

vi.mock("@/components/planner/ReadinessHero", () => ({
  ReadinessHero: () => <div data-testid="readiness-hero" />,
}));

vi.mock("@/components/planner/SignalsStrip", () => ({
  SignalsStrip: () => <div data-testid="signals-strip" />,
}));

vi.mock("@/components/planner/ImpactToast", () => ({
  ImpactToast: () => null,
}));

afterEach(() => {
  cleanup();
});

describe("PlannerPage NudgeRail vs Track Overview", () => {
  it("hides NudgeRail on overview and shows it on other sections", async () => {
    const { PlannerPage } = await import("@/components/planner/PlannerPage");
    render(
      <PlannerPage
        overview={<div>Overview panel</div>}
        calendar={<div>Calendar panel</div>}
        transactionsPanel={<div>Tx panel</div>}
        goalsPanel={<div>Goals panel</div>}
        banking={<div>Banking panel</div>}
        wealth={<div>Wealth panel</div>}
      />,
    );

    expect(screen.getByText("Overview panel")).toBeTruthy();
    expect(screen.queryByText("Protect the decision first")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Calendar/i }));
    expect(screen.getByText("Calendar panel")).toBeTruthy();
    expect(screen.getByText("Protect the decision first")).toBeTruthy();
    expect(screen.getByText("Suggested move")).toBeTruthy();
  });
});
