/**
 * Pure-logic test for the Banks & bills + Wealth tabs (C3 wave).
 *
 * The tab components are React, but their derivation helpers are pure:
 *   - src/components/planner/banking/banking-derive.ts
 *   - src/components/planner/wealth/wealth-derive.ts
 *
 * This bundles both with esbuild (same pattern as
 * scripts/planner-store.test.mjs) and asserts demo-seed parity with the
 * reference planner screenshots:
 *
 *   banking:  cash $18,720.60 · open bills $2,345.88 · due today 1 ·
 *             overdue 0 · EOM projected $16,374.72 (= cash − open bills)
 *   wealth:   portfolio MV $57,077.95 · cost $44,213.00 · unrealized
 *             +$12,865 (+29.1%) · net worth $72,098.56 · assets
 *             $96,698.56 · liabilities $24,600.00 · runway 5.2 mo · DTI 3%
 *
 * Run: node scripts/planner-bank-wealth.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "planner-bank-wealth-"));

const alias = {
  "@": path.join(ROOT, "src"),
};

async function bundle(entry, outfile) {
  await build({
    entryPoints: [path.join(ROOT, entry)],
    outfile: path.join(TMP, outfile),
    bundle: true,
    format: "esm",
    platform: "neutral",
    logLevel: "silent",
    alias,
  });
  return import(pathToFileURL(path.join(TMP, outfile)).href);
}

const banking = await bundle(
  "src/components/planner/banking/banking-derive.ts",
  "banking-derive.mjs",
);
const wealth = await bundle(
  "src/components/planner/wealth/wealth-derive.ts",
  "wealth-derive.mjs",
);
const derived = await bundle("src/lib/planner/derived.ts", "derived.mjs");
const { buildDemoSeed, financialReality, summarizePortfolio, todayISO, addDaysISO } =
  derived;

/* The screenshots were taken with demo date Aug 2, 2026. */
const seed = buildDemoSeed(new Date("2026-08-02T12:00:00"));

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* 1 — bill pay tiles: OPEN $2,345.88 · DUE TODAY 1 · OVERDUE 0. */
const tiles = banking.billTiles(seed.bills);
assert.equal(tiles.openCount, 6, "six open bills");
assert.ok(Math.abs(tiles.openTotal - 2345.88) < 0.01, `open total ${tiles.openTotal}`);
assert.equal(tiles.dueToday, 1, "TECO electric is due today on the demo date");
assert.equal(tiles.overdue, 0, "no overdue bills on the demo date");
assert.equal(tiles.overdueTotal, 0);
ok("bill tiles — OPEN $2,345.88 · DUE TODAY 1 · OVERDUE 0");

/* 2 — EOM projected = cash − open bills = $16,374.72. */
const eom = banking.eomProjection(seed.accounts, seed.bills);
assert.ok(Math.abs(eom - 16374.72) < 0.01, `eom ${eom}`);
ok("EOM projected $16,374.72 = cash $18,720.60 − open bills $2,345.88");

/* 3 — pay ordering + pay-from resolution mirrors store semantics. */
const ordered = banking.sortBillsForPay(seed.bills);
assert.deepEqual(
  ordered.map((b) => b.id),
  [
    "bill-demo-teco",
    "bill-demo-rent",
    "bill-demo-spectrum",
    "bill-demo-netflix",
    "bill-demo-student-loan",
    "bill-demo-mobile",
  ],
  "due today first, then by due date",
);
const teco = seed.bills.find((b) => b.id === "bill-demo-teco");
assert.equal(
  banking.defaultPayFromId(teco, seed.accounts),
  "acct-demo-checking",
  "bill-assigned account wins",
);
const unassigned = { ...teco, id: "bill-x", accountId: undefined };
assert.equal(
  banking.defaultPayFromId(unassigned, seed.accounts),
  "acct-demo-checking",
  "checking is the first payable fallback",
);
assert.deepEqual(
  banking.payFromOptions(seed.accounts).map((a) => a.id),
  ["acct-demo-checking", "acct-demo-savings", "acct-demo-ally"],
  "checking before savings",
);
ok("pay ordering + pay-from fallback (bill account → checking)");

/* 4 — status chips, relative-due copy, and sync stamps. */
assert.equal(banking.BILL_STATUS_CHIP.due, "DUE TODAY");
assert.equal(banking.BILL_STATUS_CHIP.overdue, "OVERDUE");
const mkBill = (dueDate, status = "upcoming") => ({
  ...teco,
  id: "bill-rel",
  dueDate,
  status,
});
assert.equal(banking.dueRelativeLabel(mkBill(todayISO(), "due")), "Due today");
assert.equal(
  banking.dueRelativeLabel(mkBill(addDaysISO(todayISO(), -2), "overdue")),
  "2d overdue",
);
assert.equal(
  banking.dueRelativeLabel(mkBill(addDaysISO(todayISO(), 3))),
  "Due in 3d",
);
assert.equal(banking.formatDay("2026-08-05"), "Aug 5");
assert.equal(banking.formatSyncStamp(null), "Never");
assert.ok(
  banking.formatSyncStamp("2026-08-02T14:30:00").includes("Aug 2"),
  "sync stamp includes the day",
);
assert.ok(
  banking.formatSyncLong("2026-08-03T14:04:00").includes("Aug 3"),
  "header Last sync stamp includes the day",
);
ok("status chips + relative-due copy + sync stamps");

/* 5 — portfolio tiles: MV $57,077.95 · cost $44,213.00 · +$12,865 (+29.1%). */
const summary = summarizePortfolio(seed.holdings);
assert.ok(Math.abs(summary.marketValue - 57077.955) < 0.01, `mv ${summary.marketValue}`);
assert.ok(Math.abs(summary.costBasis - 44213) < 0.01, `cost ${summary.costBasis}`);
assert.equal(
  wealth.formatSignedGain(summary.gain, summary.gainPct),
  "+$12,865 (+29.1%)",
  "unrealized tile copy",
);
assert.equal(wealth.formatSignedGain(-100.1, -1.7), "-$100 (-1.7%)", "loss copy");
ok("portfolio tiles — $57,077.95 · $44,213.00 · +$12,865 (+29.1%)");

/* 6 — allocation rows: ETFs 43% · Mutual funds 42% · Bonds 10% · Stocks 5%,
 * strokes resolved through PLANNER_CATEGORY_HEX (no raw hex in components). */
const allocation = wealth.allocationRows(seed.holdings);
assert.deepEqual(
  allocation.map((r) => [r.assetClass, Math.round(r.weight), Math.round(r.value)]),
  [
    ["etf", 43, 24739],
    ["mutual", 42, 23931],
    ["bond", 10, 5836],
    ["stock", 5, 2572],
  ],
  "allocation weights",
);
assert.equal(allocation[0].label, "ETFs");
assert.equal(
  wealth.assetClassHex("etf"),
  "#34d399", // the emerald token value from PLANNER_CATEGORY_HEX.salary
  "etf stroke borrows the emerald category token",
);
const rows = wealth.holdingRows(seed.holdings);
assert.equal(rows[0].holding.symbol, "FXAIX", "largest position first");
assert.equal(rows.length, 6, "six demo holdings");
assert.ok(Math.abs(rows[0].marketValue - 23931.3) < 0.01, "FXAIX market value");
ok("allocation 43/42/10/5 + holding rows sorted by value");

/* 7 — net-worth stack: $72,098.56 = $96,698.56 − $24,600.00. */
const stack = wealth.netWorthStack(seed.accounts, seed.holdings, seed.netWorthItems);
assert.ok(Math.abs(stack.assets - 96698.555) < 0.01, `assets ${stack.assets}`);
assert.ok(Math.abs(stack.liabilities - 24600) < 0.01, `liabilities ${stack.liabilities}`);
assert.ok(Math.abs(stack.netWorth - 72098.555) < 0.01, `net worth ${stack.netWorth}`);
assert.deepEqual(
  stack.assetLines.map((l) => [l.label, Math.round(l.value * 100) / 100]),
  [
    ["Bank cash", 18720.6],
    ["Portfolio", 57077.95],
    ["Other assets", 20900],
  ],
  "asset lines",
);
assert.deepEqual(
  stack.liabilityLines.map((l) => [l.label, Math.round(l.value)]),
  [
    ["Manual debts", 24600],
    ["Credit balances", 0],
  ],
  "liability lines",
);
assert.equal(stack.otherAssets.length, 2, "vehicle + HSA");
assert.equal(stack.manualDebts.length, 2, "student + auto loan");
ok("net-worth stack — $96,698.56 assets − $24,600.00 = $72,098.56");

/* 8 — runway 5.2 mo + DTI 3% gauges the NetWorthPanel displays. */
const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
assert.ok(
  Math.abs(Math.round(reality.runwayMonths * 10) / 10 - 5.2) < 1e-9,
  `runway ${reality.runwayMonths}`,
);
assert.equal(Math.round(reality.dti), 3, `dti ${reality.dti}`);
assert.equal(reality.temps.runway, "yellow", "runway 5.2mo is the watch band");
assert.equal(reality.temps.dti, "emerald", "DTI ≤28% is strong");
ok("runway 5.2 mo (watch) + DTI 3% (strong)");

console.log(`\n${passed}/8 assertion groups passed`);
