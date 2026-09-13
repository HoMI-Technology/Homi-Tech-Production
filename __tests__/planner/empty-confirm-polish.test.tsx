// @vitest-environment jsdom
/**
 * Dogfood UX PR #4 — ConfirmDialog for Clear/Load sample + EmptyState polish.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog";
import EmptyState from "@/components/planner/ui/EmptyState";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/planner/ReadinessHero", () => ({
  ReadinessHero: () => <div data-testid="readiness-hero" />,
}));
vi.mock("@/components/planner/SignalsStrip", () => ({
  SignalsStrip: () => <div data-testid="signals-strip" />,
}));
vi.mock("@/components/planner/NudgeRail", () => ({
  NudgeRail: () => <div data-testid="nudge-rail" />,
}));
vi.mock("@/components/planner/ImpactToast", () => ({
  ImpactToast: () => null,
}));
vi.mock("@/lib/planner/score-bridge", () => ({
  getLastScoreResult: () => null,
}));

const clearWorkspace = vi.fn();
const resetDemo = vi.fn();
const setReadinessProfile = vi.fn();

type MockState = {
  transactions: unknown[];
  accounts: unknown[];
  bills: unknown[];
  holdings: unknown[];
  netWorthItems: unknown[];
  path: null;
  checkins: unknown[];
  dismissedSignals: unknown[];
  dismissSignal: () => void;
  lastImpact: null;
  readinessProfile: { partnerAlignment: number };
  clearLastImpact: () => void;
  clearWorkspace: typeof clearWorkspace;
  resetDemo: typeof resetDemo;
  setReadinessProfile: typeof setReadinessProfile;
};

function makeState(overrides: Partial<MockState> = {}): MockState {
  return {
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
    clearWorkspace,
    resetDemo,
    setReadinessProfile,
    ...overrides,
  };
}

let mockState = makeState();

vi.mock("@/lib/planner/store", () => {
  const usePlannerStore = (sel: (s: MockState) => unknown) => sel(mockState);
  usePlannerStore.getState = () => mockState;
  return { usePlannerStore };
});

beforeEach(() => {
  clearWorkspace.mockReset();
  resetDemo.mockReset();
  setReadinessProfile.mockReset();
  mockState = makeState();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConfirmDialog", () => {
  it("confirms destructive clear with honest copy", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Clear your planner data?"
        body="This clears the on-device planner workspace."
        confirmLabel="Clear data"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Clear your planner data?")).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Clear data" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("supports accent tone for load-sample confirms", () => {
    render(
      <ConfirmDialog
        open
        title="Load sample numbers?"
        body="Education only — not your real money."
        confirmLabel="Load sample"
        tone="accent"
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Load sample" })).toBeTruthy();
  });
});

describe("EmptyState", () => {
  it("renders protective empty-ledger copy with dashed illustration", () => {
    const { container } = render(
      <EmptyState
        illustration
        line="Your ledger is empty — start with cash you trust."
        caption="No invented money."
      />,
    );
    expect(screen.getByText(/Your ledger is empty/i)).toBeTruthy();
    expect(screen.getByText(/No invented money/i)).toBeTruthy();
    expect(container.querySelector("[aria-hidden]")).toBeTruthy();
  });
});

describe("PlannerPage Clear / no sample load", () => {
  it("empty workspace has no Load sample control", async () => {
    const { PlannerPage } = await import("@/components/planner/PlannerPage");
    render(
      <PlannerPage
        overview={<div />}
        calendar={<div />}
        transactionsPanel={<div />}
        goalsPanel={<div />}
        banking={<div />}
        wealth={<div />}
        embedded
      />,
    );

    expect(screen.queryByRole("button", { name: /Load sample/i })).toBeNull();
    expect(resetDemo).not.toHaveBeenCalled();
  });

  it("opens ConfirmDialog for Clear data when workspace has entries", async () => {
    mockState = makeState({
      accounts: [
        {
          id: "a1",
          name: "Checking",
          type: "checking",
          balance: 1200,
          available: 1200,
          currency: "USD",
          institution: "other",
          mask: "1234",
          lastSyncedAt: null,
          status: "linked",
        },
      ],
    });
    const confirmSpy = vi.spyOn(window, "confirm");
    const { PlannerPage } = await import("@/components/planner/PlannerPage");
    render(
      <PlannerPage
        overview={<div />}
        calendar={<div />}
        transactionsPanel={<div />}
        goalsPanel={<div />}
        banking={<div />}
        wealth={<div />}
        embedded
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Clear data/i }));
    expect(confirmSpy).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Clear your planner data?")).toBeTruthy();

    await user.click(within(dialog).getByRole("button", { name: "Clear data" }));
    expect(clearWorkspace).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });
});
