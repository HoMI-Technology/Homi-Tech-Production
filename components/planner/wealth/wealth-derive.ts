/* ------------------------------------------------------------------ */
/* Wealth panel pure helpers — allocation rows, asset-class labels and */
/* color tokens, account-kind labels, and the net-worth stack. Kept    */
/* React-free so scripts/planner-bank-wealth.test.mjs can              */
/* esbuild-bundle and assert demo parity (portfolio $57,077.95 · cost  */
/* $44,213.00 · net worth $72,098.56). Aggregates reuse                */
/* @/lib/planner/derived — no new lib files.                           */
/*                                                                     */
/* Chart strokes come from the PLANNER_CATEGORY_HEX token map          */
/* (lib/planner/types.ts) — never raw hex literals in components.      */
/* Asset classes are not ledger categories, so each class borrows a    */
/* category key purely as a palette reference.                         */
/* ------------------------------------------------------------------ */

import {
  holdingGain,
  holdingGainPct,
  summarizePortfolio,
  totalNetWorth,
} from "@/lib/planner/derived";
import {
  PLANNER_CATEGORY_HEX,
  type AssetClass,
  type BankAccount,
  type CategoryId,
  type Holding,
  type HoldingAccountKind,
  type NetWorthItem,
} from "@/lib/planner/types";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  stock: "Stocks",
  etf: "ETFs",
  mutual: "Mutual funds",
  bond: "Bonds",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

/** Uppercase chip on holding rows (`MUTUAL FUNDS`, `ETFS`, …). */
export const ASSET_CLASS_CHIP: Record<AssetClass, string> = {
  stock: "STOCKS",
  etf: "ETFS",
  mutual: "MUTUAL FUNDS",
  bond: "BONDS",
  crypto: "CRYPTO",
  cash: "CASH",
  other: "OTHER",
};

export const ASSET_CLASS_IDS = Object.keys(ASSET_CLASS_LABEL) as AssetClass[];

export const ACCOUNT_KIND_LABEL: Record<HoldingAccountKind, string> = {
  brokerage: "Taxable brokerage",
  roth: "Roth IRA",
  traditional_401k: "401(k)",
  hsa: "HSA",
  crypto: "Crypto",
  other: "Other",
};

export const ACCOUNT_KIND_IDS = Object.keys(ACCOUNT_KIND_LABEL) as HoldingAccountKind[];

/**
 * Asset class → category palette key. Allocation donut strokes resolve
 * through PLANNER_CATEGORY_HEX so no component ever carries a raw hex.
 */
export const ASSET_CLASS_CATEGORY_KEY: Record<AssetClass, CategoryId> = {
  etf: "salary",
  mutual: "investments",
  bond: "utilities",
  stock: "freelance",
  crypto: "housing",
  cash: "food",
  other: "other",
};

export function assetClassHex(assetClass: AssetClass): string {
  return PLANNER_CATEGORY_HEX[ASSET_CLASS_CATEGORY_KEY[assetClass]];
}

/* ------------------------------------------------------------------ */
/* Allocation view (donut rows, sorted by value desc)                  */
/* ------------------------------------------------------------------ */

export interface AllocationRow {
  assetClass: AssetClass;
  label: string;
  value: number;
  weight: number;
  hex: string;
}

export function allocationRows(holdings: Holding[]): AllocationRow[] {
  return summarizePortfolio(holdings).allocation.map((a) => ({
    assetClass: a.assetClass,
    label: ASSET_CLASS_LABEL[a.assetClass],
    value: a.value,
    weight: a.weight,
    hex: assetClassHex(a.assetClass),
  }));
}

/* ------------------------------------------------------------------ */
/* Holding row view-model                                              */
/* ------------------------------------------------------------------ */

export interface HoldingRow {
  holding: Holding;
  marketValue: number;
  gain: number;
  gainPct: number;
}

export function holdingRows(holdings: Holding[]): HoldingRow[] {
  return holdings
    .map((holding) => ({
      holding,
      marketValue: holding.shares * holding.price,
      gain: holdingGain(holding),
      gainPct: holdingGainPct(holding),
    }))
    .sort((a, b) => b.marketValue - a.marketValue);
}

/** `+$12,865 (+29.1%)` / `-$100 (-1.7%)` — signed unrealized gain. */
export function formatSignedGain(gain: number, gainPct: number): string {
  const sign = gain >= 0 ? "+" : "-";
  const abs = Math.abs(gain);
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
  return `${sign}${amount} (${gain >= 0 ? "+" : ""}${gainPct.toFixed(1)}%)`;
}

/* ------------------------------------------------------------------ */
/* Net-worth stack                                                     */
/* ------------------------------------------------------------------ */

export interface NetWorthLine {
  label: string;
  value: number;
}

export interface NetWorthStack {
  assetLines: NetWorthLine[];
  liabilityLines: NetWorthLine[];
  assets: number;
  liabilities: number;
  netWorth: number;
  otherAssets: NetWorthItem[];
  manualDebts: NetWorthItem[];
  /** Assets share of the assets+liabilities bar pair, 0..1. */
  assetsFraction: number;
}

export function netWorthStack(
  accounts: BankAccount[],
  holdings: Holding[],
  items: NetWorthItem[],
): NetWorthStack {
  const nw = totalNetWorth(accounts, holdings, items);
  const span = nw.assets + nw.liabilities;
  return {
    assetLines: [
      { label: "Bank cash", value: nw.cash },
      { label: "Portfolio", value: nw.portfolio },
      { label: "Other assets", value: nw.otherAssets },
    ],
    liabilityLines: [
      { label: "Manual debts", value: nw.manualLiabilities },
      { label: "Credit balances", value: nw.credit },
    ],
    assets: nw.assets,
    liabilities: nw.liabilities,
    netWorth: nw.netWorth,
    otherAssets: items.filter((i) => i.kind === "asset"),
    manualDebts: items.filter((i) => i.kind === "liability"),
    assetsFraction: span > 0 ? nw.assets / span : 0,
  };
}
