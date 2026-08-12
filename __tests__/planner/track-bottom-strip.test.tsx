// @vitest-environment jsdom
/**
 * Mobile Track bottom strip — dogfood → Production PR #3.
 * Metrics from planner store selectors; honest "—" when source slices empty.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useReducedMotion", () => ({
  useReducedMotion: () => true,
}));

const storeState = {
  clearWorkspace: vi.fn(),
  resetDemo: vi.fn(),
  transactions: [] as unknown[],
  accounts: [] as { id: string; type: string; balance: number }[],
  bills: [] as { id: string; amount: number; status: string }[],
  holdings: [] as { id: string; shares: number; price: number; costBasis: number }[],
  netWorthItems: [] as unknown[],
  path: null,
  checkins: [] as unknown[],
  dismissedSignals: [] as string[],
  dismissSignal: vi.fn(),
  lastImpact: null,
  readinessProfile: { partnerAlignment: 7 },
  clearLastImpact: vi.fn(),
  setReadinessProfile: vi.fn(),
};

vi.mock("@/lib/planner/store", () => {
  const usePlannerStore = (sel: (s: typeof storeState) => unknown) => sel(storeState);
  usePlannerStore.getState = () => storeState;
  return { usePlannerStore };
});

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

beforeEach(() => {
  storeState.accounts = [];
  storeState.holdings = [];
  storeState.bills = [];
  storeState.transactions = [];
  storeState.netWorthItems = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
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

describe("TrackBottomStrip", () => {
  it("shows honest placeholders when planner slices are empty", async () => {
    const { TrackBottomStrip } = await import("@/components/planner/TrackBottomStrip");
    const onSection = vi.fn();
    render(<TrackBottomStrip onSection={onSection} />);

    expect(screen.getByTestId("track-bottom-strip")).toBeTruthy();
    expect(screen.getByText("Linked cash")).toBeTruthy();
    expect(screen.getByText("Portfolio")).toBeTruthy();
    expect(screen.getByText("Open bills")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("href")).toBe("/money/plan");
  });

  it("wires real planner-derived amounts when sources exist", async () => {
    storeState.accounts = [
      { id: "a1", type: "checking", balance: 2400 },
      { id: "a2", type: "credit", balance: -300 },
    ];
    storeState.holdings = [{ id: "h1", shares: 10, price: 50, costBasis: 40 }];
    storeState.bills = [
      { id: "b1", amount: 120, status: "upcoming" },
      { id: "b2", amount: 80, status: "paid" },
    ];

    const { TrackBottomStrip } = await import("@/components/planner/TrackBottomStrip");
    render(<TrackBottomStrip onSection={vi.fn()} />);

    expect(screen.getByText("$2,400")).toBeTruthy();
    expect(screen.getByText("$500")).toBeTruthy();
    expect(screen.getByText("$120")).toBeTruthy();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("routes Wealth / Banks via onSection", async () => {
    const { TrackBottomStrip } = await import("@/components/planner/TrackBottomStrip");
    const onSection = vi.fn();
    render(<TrackBottomStrip onSection={onSection} />);

    fireEvent.click(screen.getByRole("button", { name: "Wealth" }));
    fireEvent.click(screen.getByRole("button", { name: "Banks" }));
    expect(onSection).toHaveBeenCalledWith("wealth");
    expect(onSection).toHaveBeenCalledWith("banking");
  });
});

describe("PlannerPage mounts strip only when embedded", () => {
  it("renders TrackBottomStrip when embedded and hides when not", async () => {
    const { PlannerPage } = await import("@/components/planner/PlannerPage");
    const { rerender } = render(
      <PlannerPage
        embedded
        overview={<div>Overview</div>}
        calendar={<div>Calendar</div>}
        transactionsPanel={<div>Tx</div>}
        goalsPanel={<div>Goals</div>}
        banking={<div>Banks</div>}
        wealth={<div>Wealth</div>}
      />,
    );
    expect(screen.getByTestId("track-bottom-strip")).toBeTruthy();

    rerender(
      <PlannerPage
        overview={<div>Overview</div>}
        calendar={<div>Calendar</div>}
        transactionsPanel={<div>Tx</div>}
        goalsPanel={<div>Goals</div>}
        banking={<div>Banks</div>}
        wealth={<div>Wealth</div>}
      />,
    );
    expect(screen.queryByTestId("track-bottom-strip")).toBeNull();
  });
});
