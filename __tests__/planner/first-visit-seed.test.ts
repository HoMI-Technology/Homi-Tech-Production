// @vitest-environment jsdom
/**
 * First-visit demo seed — PlannerPage seeds the demo workspace exactly
 * once per device (localStorage marker `homi-planner-visited-v1`) and
 * never reseeds after `Clear data`, because the clear keeps the marker.
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

describe("PlannerPage first-visit demo seed", () => {
  it("marker absent + empty workspace seeds the demo and sets the marker", () => {
    renderPage();
    expect(resetDemo).toHaveBeenCalledOnce();
    expect(setReadinessProfile).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(VISITED_KEY)).not.toBeNull();
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

  it("after clearWorkspace (marker kept) a cleared workspace stays empty", () => {
    // First visit seeds the demo and stamps the marker.
    renderPage();
    expect(resetDemo).toHaveBeenCalledOnce();

    // The user clears the workspace; the marker survives by design.
    clearWorkspace();
    resetDemo.mockReset();
    setReadinessProfile.mockReset();

    // Next mount — cleared workspace, marker present: never reseed.
    cleanup();
    renderPage();
    expect(resetDemo).not.toHaveBeenCalled();
    expect(setReadinessProfile).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(VISITED_KEY)).not.toBeNull();
  });
});
