// @vitest-environment jsdom
/**
 * Investments fold under Reality — Home + Money Reality redesign, Phase 5.
 *
 * Pins:
 *  - The compact InvestmentsSummary renders real seeded holdings (marked
 *    portfolio aggregate + linked brokerage aggregate), never invented ones.
 *  - Honest empty state ("No holdings connected yet.") with the /connections
 *    close when neither source has positions.
 *  - The summary links through to the full /money/investments sub-route, and
 *    that deep link stays live with its full surface intact.
 *  - Reality mounts the summary below the Steady Cash instrument, with the
 *    ScoreRail compact rail preserved above it.
 *  - No nav chrome re-presents Investments as a 6th peer tab.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { Holding } from "@/lib/planner/types";
import type { PlaidHoldingView } from "@/lib/plaid/holdings-view";
import { NAV_CATALOG } from "@/lib/layout/nav-catalog";

const storeState = {
  holdings: [] as Holding[],
  setHasHydrated: vi.fn(),
};

vi.mock("@/lib/planner/store", () => {
  const usePlannerStore = (sel: (s: typeof storeState) => unknown) => sel(storeState);
  usePlannerStore.getState = () => storeState;
  usePlannerStore.persist = {
    onFinishHydration: () => () => {},
    hasHydrated: () => true,
  };
  return { usePlannerStore };
});

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const holding = (over: Partial<Holding> = {}): Holding => ({
  id: "h1",
  symbol: "VTI",
  name: "Vanguard Total Stock Market ETF",
  assetClass: "etf",
  accountKind: "brokerage",
  shares: 10,
  costBasis: 200,
  price: 250,
  asOf: "2026-08-20",
  source: "manual",
  ...over,
});

const plaidHolding = (value: number): PlaidHoldingView => ({
  account_id: "acct-1",
  security_id: "sec-1",
  quantity: 4,
  institution_price: value / 4,
  institution_value: value,
  cost_basis: value - 100,
  iso_currency: "USD",
  security: { name: "Linked Index Fund", ticker_symbol: "LNKD", type: "mutual fund" },
});

/** Default: signed-out plaid read (401) — the summary stays quiet about it. */
beforeEach(() => {
  storeState.holdings = [];
  storeState.setHasHydrated.mockClear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
});

afterEach(cleanup);

describe("InvestmentsSummary", () => {
  it("renders the marked-portfolio aggregate with seeded holdings", async () => {
    storeState.holdings = [holding()];
    const { InvestmentsSummary } = await import("@/components/money/InvestmentsSummary");
    render(<InvestmentsSummary />);

    // 10 sh × $250 marked → $2,500.00 market value; basis $2,000 → +$500 (+25.0%).
    expect(await screen.findByText("$2,500.00")).toBeTruthy();
    expect(screen.getByText("+$500 (+25.0%)")).toBeTruthy();
    expect(screen.getByText("Marked prices, not a live feed")).toBeTruthy();
    expect(screen.queryByText(/No holdings connected yet/)).toBeNull();
  });

  it("renders linked brokerage value when institutions report positions", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ holdings: [plaidHolding(1234.56)] }), { status: 200 }),
    );
    const { InvestmentsSummary } = await import("@/components/money/InvestmentsSummary");
    render(<InvestmentsSummary />);

    expect(await screen.findByText("Linked market value")).toBeTruthy();
    expect(screen.getByText("$1,234.56")).toBeTruthy();
    expect(screen.queryByText(/No holdings connected yet/)).toBeNull();
  });

  it("shows the honest empty state with the Connections close when nothing is connected", async () => {
    const { InvestmentsSummary } = await import("@/components/money/InvestmentsSummary");
    render(<InvestmentsSummary />);

    expect(await screen.findByText(/No holdings connected yet/)).toBeTruthy();
    const connections = screen.getByRole("link", { name: "Connections" });
    expect(connections.getAttribute("href")).toBe("/connections");
  });

  it("always links through to the full /money/investments sub-route", async () => {
    storeState.holdings = [holding()];
    const { InvestmentsSummary } = await import("@/components/money/InvestmentsSummary");
    render(<InvestmentsSummary />);

    const open = screen.getByRole("link", { name: "Open Investments" });
    expect(open.getAttribute("href")).toBe("/money/investments");
  });
});

describe("Investments fold under Reality (static locks)", () => {
  const moneyPage = read("app/(product)/money/page.tsx");
  const moneyUi = read("components/v4/money/MoneyWorkspaceV4.tsx");

  it("live /money keeps investments off the quiet picture — depth lives on /money/investments", () => {
    expect(moneyPage).not.toContain("InvestmentsSummary");
    expect(moneyUi).not.toContain("InvestmentsSummary");
    expect(moneyUi).not.toContain("ScoreRail");
    expect(moneyUi).not.toContain("OperateInstrument");
  });

  it("does not remount a ScoreRail or surplus instrument on /money", () => {
    expect(moneyPage).not.toContain("ScoreRail");
    expect(moneyUi).not.toContain("ScoreRail");
    expect(moneyUi).not.toContain("OperateInstrument");
  });

  it("the /money/investments deep link stays live with its full surface intact", () => {
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/investments/page.tsx"))).toBe(
      true,
    );
    const surface = read("app/(product)/money/investments/InvestmentsSurface.tsx");
    expect(surface).toContain("PlaidHoldingsPanel");
    expect(surface).toContain("PortfolioPanel");
  });

  it("no nav chrome re-presents Investments as a 6th peer tab", () => {
    expect(NAV_CATALOG.some((e) => e.href === "/money/investments")).toBe(false);
    const sidebar = read("components/layout/AppSidebar.tsx");
    expect(sidebar).not.toContain("/money/investments");
    const bottomNav = read("components/layout/ProductBottomNav.tsx");
    expect(bottomNav).not.toContain("/money/investments");
  });
});
