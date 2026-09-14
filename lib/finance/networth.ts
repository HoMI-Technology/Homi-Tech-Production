/**
 * Budget & Runway — Phase 2 net-worth snapshots (pure).
 *
 * Computes a point-in-time net worth from Plaid-shaped inputs and derives
 * trends across persisted snapshots. Pure: no I/O, no clock — the as-of
 * date is always a parameter.
 *
 * Honesty rules:
 *   - Missing balances are EXCLUDED from totals and COUNTED, never
 *     estimated. The completeness grade tells the reader how much of the
 *     picture the numbers cover.
 *   - Net worth can be negative; the snapshot column is signed bigint for
 *     exactly this reason (unlike transactions, where sign lives in the
 *     type). Debts exceeding assets is a real state, not an error.
 *   - netWorthTrend never interpolates: a delta is reported only when a
 *     real prior snapshot exists inside the comparison window.
 *
 * Plaid legal: inputs are read-only account/holding/liability snapshots;
 * nothing here is a consumer report or an FCRA product.
 */

import { dollarsToCents, sumCents, type MoneyCents } from "@/lib/finance/money";

/* ------------------------------------------------------------------ */
/* Plaid-shaped inputs (structural — routes pass table rows)           */
/* ------------------------------------------------------------------ */

export interface NetWorthAccountInput {
  /** External plaid account_id (matches plaid_holdings/plaid_liabilities). */
  id: string;
  type: string; // depository | credit | loan | investment | ...
  subtype: string | null;
  /** Floating dollars as stored on plaid_accounts; null when Plaid has none. */
  currentBalance: number | null;
  isoCurrency: string | null;
}

export interface NetWorthHoldingInput {
  accountId: string; // external plaid account_id string
  /** Floating dollars; null when unknown. */
  institutionValue: number | null;
}

export interface NetWorthLiabilityInput {
  accountId: string;
  kind: string; // credit | student | mortgage
  /** Raw Plaid payload; balances are dug out best-effort per kind. */
  payload: Record<string, unknown>;
}

export type SnapshotSource = "plaid" | "manual" | "mixed";

/* ------------------------------------------------------------------ */
/* Snapshot computation                                                */
/* ------------------------------------------------------------------ */

export interface NetWorthBreakdownEntry {
  accountId: string;
  kind: "asset" | "liability";
  /** Signed contribution: assets positive, liabilities negative. */
  amountCents: MoneyCents;
  source: "account_balance" | "holding" | "liability_payload";
}

export type NetWorthCompleteness = "complete" | "partial" | "sparse" | "empty";

export interface NetWorthSnapshotResult {
  asOfDate: string; // YYYY-MM-DD
  totalAssetsCents: MoneyCents;
  totalLiabilitiesCents: MoneyCents; // positive magnitude
  /** assets − liabilities; CAN BE NEGATIVE (signed by design). */
  netWorthCents: MoneyCents;
  source: SnapshotSource;
  breakdown: NetWorthBreakdownEntry[];
  /** How much of the account list contributed a number at all. */
  completeness: NetWorthCompleteness;
  accountsWithData: number;
  accountsMissingData: number;
}

/** Liability-kind accounts: balance owed, counted on the liability side. */
function isLiabilityAccountType(type: string): boolean {
  return type === "credit" || type === "loan";
}

/**
 * Best-effort balance extraction from a plaid_liabilities payload. Plaid's
 * liabilities payloads differ per kind (credit.last_statement_balance,
 * student.last_statement_balance / mortgage origination); we only accept a
 * finite number at a known key and otherwise report the liability as
 * missing rather than guessing.
 */
function liabilityBalanceDollars(payload: Record<string, unknown>): number | null {
  const candidates = [
    payload["last_statement_balance"],
    payload["current_balance"],
    payload["outstanding_balance"],
    payload["principal_balance"],
  ];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  }
  return null;
}

/**
 * Computes one net-worth snapshot as of `asOfDate`.
 *
 * Assets: depository/investment account balances + investment holdings
 * values. Liabilities: credit/loan account balances + liability payload
 * balances not already covered by an account row (deduped by accountId so
 * a credit account with both a balance and a liability payload counts
 * once).
 */
export function computeNetWorthSnapshot(
  accounts: readonly NetWorthAccountInput[],
  holdings: readonly NetWorthHoldingInput[],
  liabilities: readonly NetWorthLiabilityInput[],
  asOfDate: string,
  source: SnapshotSource = "plaid",
): NetWorthSnapshotResult {
  const breakdown: NetWorthBreakdownEntry[] = [];
  let withData = 0;
  let missingData = 0;

  const accountIdsWithBalance = new Set<string>();

  for (const account of accounts) {
    if (account.currentBalance === null || !Number.isFinite(account.currentBalance)) {
      missingData += 1;
      continue;
    }
    withData += 1;
    accountIdsWithBalance.add(account.id);
    const amountCents = dollarsToCents(account.currentBalance);
    if (isLiabilityAccountType(account.type)) {
      breakdown.push({
        accountId: account.id,
        kind: "liability",
        amountCents: -amountCents,
        source: "account_balance",
      });
    } else {
      breakdown.push({
        accountId: account.id,
        kind: "asset",
        amountCents,
        source: "account_balance",
      });
    }
  }

  // Holdings without a usable account balance still count as assets.
  for (const holding of holdings) {
    if (holding.institutionValue === null || !Number.isFinite(holding.institutionValue)) {
      continue;
    }
    if (accountIdsWithBalance.has(holding.accountId)) continue;
    breakdown.push({
      accountId: holding.accountId,
      kind: "asset",
      amountCents: dollarsToCents(holding.institutionValue),
      source: "holding",
    });
  }

  // Liability payloads fill in debts the account rows don't cover.
  for (const liability of liabilities) {
    if (accountIdsWithBalance.has(liability.accountId)) continue;
    const dollars = liabilityBalanceDollars(liability.payload);
    if (dollars === null) continue;
    breakdown.push({
      accountId: liability.accountId,
      kind: "liability",
      amountCents: -dollarsToCents(dollars),
      source: "liability_payload",
    });
    accountIdsWithBalance.add(liability.accountId);
  }

  const totalAssetsCents = sumCents(
    breakdown.filter((e) => e.kind === "asset").map((e) => e.amountCents),
  );
  const totalLiabilitiesCents = sumCents(
    breakdown.filter((e) => e.kind === "liability").map((e) => -e.amountCents),
  );

  const totalAccounts = withData + missingData;
  let completeness: NetWorthCompleteness;
  if (totalAccounts === 0 || withData === 0) completeness = "empty";
  else if (missingData === 0) completeness = "complete";
  else if (withData / totalAccounts >= 0.5) completeness = "partial";
  else completeness = "sparse";

  return {
    asOfDate,
    totalAssetsCents,
    totalLiabilitiesCents,
    netWorthCents: totalAssetsCents - totalLiabilitiesCents,
    source,
    breakdown,
    completeness,
    accountsWithData: withData,
    accountsMissingData: missingData,
  };
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */

export interface NetWorthSnapshotPoint {
  snapshotDate: string; // YYYY-MM-DD
  netWorthCents: MoneyCents;
}

export interface NetWorthDelta {
  /** Signed change in cents; negative = net worth fell. */
  deltaCents: MoneyCents;
  /** Date of the snapshot compared against. */
  comparedToDate: string;
}

export interface NetWorthTrendResult {
  current: NetWorthSnapshotPoint | null;
  /** Most recent prior snapshot 5–10 days back; null when none exists. */
  weekOverWeek: NetWorthDelta | null;
  /** Most recent prior snapshot 25–40 days back; null when none exists. */
  monthOverMonth: NetWorthDelta | null;
}

/** Whole days between two YYYY-MM-DD dates (positive when b is later). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * WoW / MoM deltas across persisted snapshots. Never interpolates: if no
 * real snapshot falls inside a comparison window, that delta is null —
 * a chart with a gap is honest, an invented mid-month point is not.
 */
export function netWorthTrend(
  snapshots: readonly NetWorthSnapshotPoint[],
): NetWorthTrendResult {
  const ordered = [...snapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
  const current = ordered[ordered.length - 1] ?? null;
  if (!current) {
    return { current: null, weekOverWeek: null, monthOverMonth: null };
  }

  const prior = ordered.slice(0, -1);

  const findInWindow = (minDays: number, maxDays: number): NetWorthSnapshotPoint | null => {
    for (let i = prior.length - 1; i >= 0; i--) {
      const days = daysBetween(prior[i]!.snapshotDate, current.snapshotDate);
      if (days >= minDays && days <= maxDays) return prior[i]!;
    }
    return null;
  };

  const wowBase = findInWindow(5, 10);
  const momBase = findInWindow(25, 40);

  return {
    current,
    weekOverWeek: wowBase
      ? { deltaCents: current.netWorthCents - wowBase.netWorthCents, comparedToDate: wowBase.snapshotDate }
      : null,
    monthOverMonth: momBase
      ? { deltaCents: current.netWorthCents - momBase.netWorthCents, comparedToDate: momBase.snapshotDate }
      : null,
  };
}
