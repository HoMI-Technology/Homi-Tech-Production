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
import { MONEY_MODES, modeFromPath } from "@/components/money/MoneyModeNav";

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
  const stand = read("components/money/MoneyStand.tsx");

  it("MoneyStand mounts the summary below the Steady Cash instrument", () => {
    expect(stand).toContain(
      'import { InvestmentsSummary } from "@/components/money/InvestmentsSummary"',
    );
    const instrumentEnd = stand.indexOf("</OperateInstrument>");
    const summaryIdx = stand.indexOf("<InvestmentsSummary />");
    expect(instrumentEnd).toBeGreaterThan(-1);
    expect(summaryIdx).toBeGreaterThan(instrumentEnd);
  });

  it("the ScoreRail compact rail stays above the instrument and the summary", () => {
    const railIdx = stand.lastIndexOf("{scoreRail}");
    expect(railIdx).toBeGreaterThan(-1);
    expect(railIdx).toBeLessThan(stand.indexOf("<OperateInstrument"));
    expect(railIdx).toBeLessThan(stand.indexOf("<InvestmentsSummary />"));
  });

  it("the /money/investments deep link stays live with its full surface intact", () => {
    expect(existsSync(resolve(process.cwd(), "app/(product)/money/investments/page.tsx"))).toBe(
      true,
    );
    const surface = read("app/(product)/money/investments/InvestmentsSurface.tsx");
    expect(surface).toContain("PlaidHoldingsPanel");
    expect(surface).toContain("PortfolioPanel");
    // Reality lights for the folded route — deep links keep working.
    expect(modeFromPath("/money/investments")).toBe("reality");
  });

  it("no nav chrome re-presents Investments as a 6th peer tab", () => {
    expect(MONEY_MODES).toHaveLength(5);
    expect(MONEY_MODES.some((m) => m.href === "/money/investments")).toBe(false);
    expect(MONEY_MODES.map((m) => m.label)).toEqual([
      "Readiness",
      "Reality",
      "Decide",
      "Plan",
      "Goals",
    ]);
    // Desktop sidebar + mobile drawer derive from the same catalog — no Invest entry.
    const sidebar = read("components/layout/AppSidebar.tsx");
    expect(sidebar).not.toContain("/money/investments");
    const bottomNav = read("components/layout/ProductBottomNav.tsx");
    expect(bottomNav).not.toContain("/money/investments");
  });
});
