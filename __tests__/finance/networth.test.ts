import { describe, expect, it } from "vitest";
import { computeNetWorthSnapshot, netWorthTrend } from "@/lib/finance/networth";

const acct = (
  id: string,
  type: string,
  currentBalance: number | null,
  subtype: string | null = null,
) => ({ id, type, subtype, currentBalance, isoCurrency: "USD" });

describe("computeNetWorthSnapshot", () => {
  it("sums depository/investment as assets and credit/loan as liabilities", () => {
    const snap = computeNetWorthSnapshot(
      [
        acct("a1", "depository", 5000.5),
        acct("a2", "investment", 10000),
        acct("c1", "credit", 1200.25),
        acct("l1", "loan", 20000),
      ],
      [],
      [],
      "2026-09-14",
    );
    expect(snap.totalAssetsCents).toBe(1500050);
    expect(snap.totalLiabilitiesCents).toBe(2120025);
    expect(snap.netWorthCents).toBe(1500050 - 2120025);
    expect(snap.completeness).toBe("complete");
    expect(snap.accountsMissingData).toBe(0);
  });

  it("supports negative net worth (signed)", () => {
    const snap = computeNetWorthSnapshot(
      [acct("a1", "depository", 100), acct("l1", "loan", 50000)],
      [],
      [],
      "2026-09-14",
    );
    expect(snap.netWorthCents).toBeLessThan(0);
    expect(snap.netWorthCents).toBe(10000 - 5000000);
  });

  it("excludes missing balances and counts them (no invention)", () => {
    const snap = computeNetWorthSnapshot(
      [acct("a1", "depository", 1000), acct("a2", "depository", null)],
      [],
      [],
      "2026-09-14",
    );
    expect(snap.totalAssetsCents).toBe(100000);
    expect(snap.accountsWithData).toBe(1);
    expect(snap.accountsMissingData).toBe(1);
    expect(snap.completeness).toBe("partial");
  });

  it("grades sparse/empty completeness", () => {
    const sparse = computeNetWorthSnapshot(
      [acct("a1", "depository", 100), acct("a2", "depository", null), acct("a3", "depository", null)],
      [],
      [],
      "2026-09-14",
    );
    expect(sparse.completeness).toBe("sparse");
    const empty = computeNetWorthSnapshot([], [], [], "2026-09-14");
    expect(empty.completeness).toBe("empty");
    expect(empty.netWorthCents).toBe(0);
  });

  it("adds holdings as assets only when the account has no balance", () => {
    const snap = computeNetWorthSnapshot(
      [acct("inv1", "investment", 500)],
      [
        { accountId: "inv1", institutionValue: 9999 }, // dup — must not double-count
        { accountId: "inv2", institutionValue: 250.25 },
        { accountId: "inv3", institutionValue: null }, // missing — skipped
      ],
      [],
      "2026-09-14",
    );
    expect(snap.totalAssetsCents).toBe(50000 + 25025);
  });

  it("adds liability payload balances only for uncovered accounts", () => {
    const snap = computeNetWorthSnapshot(
      [acct("c1", "credit", 300)],
      [],
      [
        { accountId: "c1", kind: "credit", payload: { last_statement_balance: 999 } }, // dup
        { accountId: "stu1", kind: "student", payload: { last_statement_balance: 42000.5 } },
        { accountId: "m1", kind: "mortgage", payload: {} }, // unknown — skipped, never guessed
      ],
      "2026-09-14",
    );
    expect(snap.totalLiabilitiesCents).toBe(30000 + 4200050);
  });

  it("breakdown entries are signed and sourced", () => {
    const snap = computeNetWorthSnapshot(
      [acct("a1", "depository", 10), acct("c1", "credit", 5)],
      [],
      [],
      "2026-09-14",
    );
    const asset = snap.breakdown.find((b) => b.accountId === "a1")!;
    const debt = snap.breakdown.find((b) => b.accountId === "c1")!;
    expect(asset).toMatchObject({ kind: "asset", amountCents: 1000, source: "account_balance" });
    expect(debt).toMatchObject({ kind: "liability", amountCents: -500 });
  });
});

describe("netWorthTrend", () => {
  it("is null-safe with no snapshots", () => {
    expect(netWorthTrend([])).toEqual({ current: null, weekOverWeek: null, monthOverMonth: null });
  });

  it("computes WoW and MoM deltas from real snapshots only", () => {
    const trend = netWorthTrend([
      { snapshotDate: "2026-08-10", netWorthCents: 100000 },
      { snapshotDate: "2026-09-07", netWorthCents: 110000 },
      { snapshotDate: "2026-09-14", netWorthCents: 115000 },
    ]);
    expect(trend.current).toEqual({ snapshotDate: "2026-09-14", netWorthCents: 115000 });
    expect(trend.weekOverWeek).toEqual({ deltaCents: 5000, comparedToDate: "2026-09-07" });
    expect(trend.monthOverMonth).toEqual({ deltaCents: 15000, comparedToDate: "2026-08-10" });
  });

  it("never interpolates: gaps outside the window yield null deltas", () => {
    const trend = netWorthTrend([
      { snapshotDate: "2026-01-01", netWorthCents: 100000 },
      { snapshotDate: "2026-09-14", netWorthCents: 115000 },
    ]);
    expect(trend.weekOverWeek).toBeNull();
    expect(trend.monthOverMonth).toBeNull();
  });

  it("handles negative deltas (net worth falling)", () => {
    const trend = netWorthTrend([
      { snapshotDate: "2026-09-01", netWorthCents: -5000 },
      { snapshotDate: "2026-09-08", netWorthCents: -9000 },
    ]);
    expect(trend.weekOverWeek!.deltaCents).toBe(-4000);
  });
});
