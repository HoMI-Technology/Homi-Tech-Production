// @vitest-environment jsdom
/**
 * Production Budget is empty until live numbers (typed or Plaid).
 * First visit must never call resetDemo / buildDemoSeed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { PlannerPage } from "@/components/planner/PlannerPage";

const VISITED_KEY = "homi-planner-visited-v1";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/components/planner/ReadinessHero", () => ({
  ReadinessHero: () => null,
}));
vi.mock("@/components/planner/SignalsStrip", () => ({
  SignalsStrip: () => null,
}));
vi.mock("@/components/planner/NudgeRail", () => ({
  NudgeRail: () => null,
}));
vi.mock("@/components/planner/ImpactToast", () => ({
  ImpactToast: () => null,
}));
vi.mock("@/components/planner/TrackBottomStrip", () => ({
  TrackBottomStrip: () => null,
}));
vi.mock("@/lib/planner/score-bridge", () => ({
  getLastScoreResult: () => null,
}));

const clearWorkspace = vi.fn();
const resetDemo = vi.fn();
const setReadinessProfile = vi.fn();

type MockState = {
  _hasHydrated: boolean;
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
    _hasHydrated: true,
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

function renderPage() {
  return render(
    createElement(PlannerPage, {
      overview: createElement("div"),
      calendar: createElement("div"),
      transactionsPanel: createElement("div"),
      goalsPanel: createElement("div"),
      banking: createElement("div"),
      wealth: createElement("div"),
      embedded: true,
    }),
  );
}

beforeEach(() => {
  clearWorkspace.mockReset();
  resetDemo.mockReset();
  setReadinessProfile.mockReset();
  mockState = makeState();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("PlannerPage first visit stays empty", () => {
  it("marker absent + empty workspace never seeds demo", () => {
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    expect(setReadinessProfile).not.toHaveBeenCalled();
  });

  it("marker present means no seeding, even with an empty workspace", () => {
    window.localStorage.setItem(VISITED_KEY, new Date().toISOString());
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    expect(setReadinessProfile).not.toHaveBeenCalled();
  });

  it("marker absent with an existing workspace sets the marker without seeding", () => {
    mockState = makeState({ transactions: [{ id: "tx-1" }] });
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    expect(setReadinessProfile).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(VISITED_KEY)).not.toBeNull();
  });

  it("after clearWorkspace a cleared workspace stays empty", () => {
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    clearWorkspace();
    resetDemo.mockReset();
    cleanup();
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    expect(setReadinessProfile).not.toHaveBeenCalled();
  });
});
