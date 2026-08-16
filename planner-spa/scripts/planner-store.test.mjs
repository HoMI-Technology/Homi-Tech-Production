/**
 * Pure-logic test for the planner data foundation (lib/planner/derived.ts).
 *
 * zustand + persist needs a DOM, so the store module itself is not
 * importable here — instead this bundles the pure derived module with
 * esbuild (same pattern as scripts/budget-persistence.test.mjs) and checks
 * the demo seed against the reference planner's screenshot state:
 *
 *   1. income        = $6,650
 *   2. expenses      ≈ $3,617
 *   3. runway        ≈ 5.2 months
 *   4. DTI           ≈ 3%
 *   5. savings rate  ≈ 46%
 *   6. portfolio MV  ≈ $57,077.95 · net worth ≈ $72,098.56
 *   7. seed shape    — 3 accounts / 6 bills / 6 holdings / 15 ledger rows
 *   8. gauge temperatures (runway yellow at 5.2mo) + ISO date helpers
 *
 * Run: node scripts/planner-store.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "planner-derived-")),
  "derived.mjs",
);

await build({
  entryPoints: [path.join(ROOT, "src/lib/planner/derived.ts")],
  outfile: OUT,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
});

const {
  buildDemoSeed,
  financialReality,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
  addDaysISO,
  daysUntil,
} = await import(pathToFileURL(OUT).href);

/* The screenshots were taken with demo date Aug 2, 2026. */
const seed = buildDemoSeed(new Date("2026-08-02T12:00:00"));
const reality = financialReality(seed.transactions, seed.accounts, seed.bills);

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* 1 — income $6,650 (biweekly paycheck + consulting weekend). */
assert.equal(reality.income, 6650, "demo income");
ok("income = $6,650");

/* 2 — expenses ≈ $3,617 (fifteen ledger rows over ~2 weeks). */
assert.ok(Math.abs(reality.expenses - 3617) < 0.01, `expenses ${reality.expenses}`);
ok("expenses ≈ $3,617");

/* 3 — runway ≈ 5.2 months ($18,720.60 cash / $3,617 outflow). */
assert.ok(
  Math.abs(Math.round(reality.runwayMonths * 10) / 10 - 5.2) < 1e-9,
  `runway ${reality.runwayMonths}`,
);
ok("runway ≈ 5.2 months");

/* 4 — DTI ≈ 3% ($220 student-loan payment / $6,650 income). */
assert.equal(Math.round(reality.dti), 3, `dti ${reality.dti}`);
ok("DTI ≈ 3%");

/* 5 — savings rate ≈ 46% (($6,650 − $3,617) / $6,650). */
assert.equal(Math.round(reality.savingsRate), 46, `savingsRate ${reality.savingsRate}`);
ok("savings rate ≈ 46%");

/* 6 — portfolio + net worth match the wealth tab. */
const portfolio = summarizePortfolio(seed.holdings);
assert.ok(Math.abs(portfolio.marketValue - 57077.95) < 0.01, `mv ${portfolio.marketValue}`);
assert.ok(Math.abs(portfolio.costBasis - 44213.0) < 0.01, `cost ${portfolio.costBasis}`);
const nw = totalNetWorth(seed.accounts, seed.holdings, seed.netWorthItems);
assert.ok(Math.abs(nw.netWorth - 72098.56) < 0.01, `netWorth ${nw.netWorth}`);
ok("portfolio ≈ $57,077.95 · net worth ≈ $72,098.56");

/* 7 — seed shape: 3 accounts, 6 bills, 6 holdings, 15 ledger rows, goal. */
assert.equal(seed.accounts.length, 3, "accounts");
assert.equal(seed.bills.length, 6, "bills");
assert.equal(seed.holdings.length, 6, "holdings");
assert.equal(seed.transactions.length, 15, "transactions");
assert.deepEqual(
  { target: seed.savingsGoal.target, current: seed.savingsGoal.current },
  { target: 12000, current: 4800 },
  "emergency fund goal",
);
assert.ok(Math.abs(upcomingBillsTotal(seed.bills) - 2345.88) < 0.01, "open bills");
ok("seed shape — 3 accounts / 6 bills / 6 holdings / 15 rows / $4.8k of $12k goal");

/* 8 — gauge temperatures (runway 5.2mo is yellow: under the 6-month emerald
 * line); date helpers round-trip. */
assert.deepEqual(reality.temps, {
  cashFlow: "emerald",
  savingsRate: "emerald",
  runway: "yellow",
  dti: "emerald",
});
assert.equal(addDaysISO("2026-08-02", 3), "2026-08-05");
assert.equal(daysUntil("2026-08-05", "2026-08-02"), 3);
assert.equal(daysUntil("2026-07-31", "2026-08-02"), -2);
ok("gauge temperatures + ISO date helpers");

console.log(`\n${passed}/8 assertion groups passed`);
