/**
 * Pure-logic test for the planner Overview surface
 * (components/planner/overview/OverviewCommand.tsx).
 *
 * Same esbuild-bundle pattern as scripts/planner-proactive.test.mjs: the
 * canon libs the Overview reads are bundled to temp ESM (with the `@/`
 * alias resolved) and driven with the demo seed + an empty workspace.
 * The Overview renders these derivations verbatim, so this suite pins
 * the §3/§9 screenshot-parity numbers:
 *
 *   1. demo reality — income $6,650 · spent $3,617 · cash flow $3,033 ·
 *      saved 46% · bank cash $18,720.60 · runway 5.2 mo · DTI 3%
 *   2. demo wealth  — portfolio $57,077.95 · net worth $72,098.56 ·
 *      bills open $2,345.88
 *   3. demo score   — ≈73 ALMOST_THERE, pillars ≈74/66/80 (hero parity)
 *   4. empty state  — score 43 NOT_YET + CREDIT_UNDER_620 hard-stop,
 *      runway ∞ (spec §8/§9)
 *   5. spend digest — last-7 spend > prior-7, housing top category
 *   6. cash spark   — 30 points, final cumulative = net ledger flow
 *   7. donut        — category breakdown sums to expenses, housing 51%
 *
 * Run: node scripts/planner-overview.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), "planner-overview-"));

await build({
  entryPoints: [
    path.join(ROOT, "src/lib/planner/derived.ts"),
    path.join(ROOT, "src/lib/planner/score-bridge.ts"),
    path.join(ROOT, "src/lib/planner/digest.ts"),
  ],
  outdir: OUTDIR,
  bundle: true,
  format: "esm",
  platform: "neutral",
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "silent",
});

const load = (name) => import(pathToFileURL(path.join(OUTDIR, name)).href);

const {
  DEFAULT_GOAL,
  DEFAULT_READINESS_PROFILE,
  buildDemoSeed,
  financialReality,
  summarize,
  summarizeAccounts,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
} = await load("derived.js");
const { scoreFromBudget, toPlannerScore } = await load("score-bridge.js");
const { buildCashflowSpark, buildSpendDigest } = await load("digest.js");

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* Fixed clock: the demo seed's reference "today" (screenshot parity). */
const NOW = new Date("2026-08-02T12:00:00");
const seed = buildDemoSeed(NOW);

/* ---------------------------------------------------------------- *
 * 1 — demo financial reality (hero tiles + gauges)                 *
 * ---------------------------------------------------------------- */

const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
assert.equal(reality.income, 6650, `income ${reality.income}`);
assert.equal(reality.expenses, 3617, `expenses ${reality.expenses}`);
assert.equal(reality.cashFlow, 3033, `cash flow ${reality.cashFlow}`);
assert.equal(Math.round(reality.savingsRate), 46, `saved ${reality.savingsRate}`);
assert.equal(reality.runwayMonths.toFixed(1), "5.2", `runway ${reality.runwayMonths}`);
assert.equal(Math.round(reality.dti), 3, `dti ${reality.dti}`);
ok("demo reality — 6650 / 3617 / +3033 · saved 46% · runway 5.2 mo · DTI 3%");

/* ---------------------------------------------------------------- *
 * 2 — demo wealth + bills (hero tiles)                             *
 * ---------------------------------------------------------------- */

const { cash } = summarizeAccounts(seed.accounts);
const portfolio = summarizePortfolio(seed.holdings);
const nw = totalNetWorth(seed.accounts, seed.holdings, seed.netWorthItems);
const billsOpen = upcomingBillsTotal(seed.bills);

assert.ok(Math.abs(cash - 18720.6) < 0.005, `cash ${cash}`);
assert.ok(Math.abs(portfolio.marketValue - 57077.95) < 0.05, `portfolio ${portfolio.marketValue}`);
assert.ok(Math.abs(nw.netWorth - 72098.56) < 0.05, `net worth ${nw.netWorth}`);
assert.ok(Math.abs(billsOpen - 2345.88) < 0.005, `bills open ${billsOpen}`);
ok("demo wealth — cash $18,720.60 · portfolio $57,077.95 · NW $72,098.56 · bills $2,345.88");

/* ---------------------------------------------------------------- *
 * 3 — demo score (hero + export pack + gauges pillar bars)         *
 * ---------------------------------------------------------------- */

const bridgeInput = {
  transactions: seed.transactions,
  accounts: seed.accounts,
  bills: seed.bills,
  holdings: seed.holdings,
  netWorthItems: seed.netWorthItems,
  savingsGoal: seed.savingsGoal,
  readinessProfile: seed.readinessProfile,
};
const view = toPlannerScore(scoreFromBudget(bridgeInput));

assert.ok(Math.abs(view.score - 73) <= 1, `score ${view.score}`);
assert.equal(view.verdict, "ALMOST_THERE", `verdict ${view.verdict}`);
assert.ok(Math.abs(view.pillarPct.financial - 74) <= 2, `financial ${view.pillarPct.financial}`);
assert.ok(Math.abs(view.pillarPct.emotional - 66) <= 2, `emotional ${view.pillarPct.emotional}`);
assert.ok(Math.abs(view.pillarPct.timing - 80) <= 2, `timing ${view.pillarPct.timing}`);
assert.equal(view.hardStops.length, 0, "demo has no hard-stops");
assert.ok(view.keyInsight.length > 0 && view.nextSteps.length > 0, "insight + next steps");
ok(`demo score — ${view.score} ALMOST_THERE · pillars ${view.pillarPct.financial}/${view.pillarPct.emotional}/${view.pillarPct.timing}`);

/* ---------------------------------------------------------------- *
 * 4 — empty workspace (spec §8/§9: 43 NOT_YET + hard-stop, ∞ runway) *
 * ---------------------------------------------------------------- */

const emptyInput = {
  transactions: [],
  accounts: [],
  bills: [],
  holdings: [],
  netWorthItems: [],
  savingsGoal: { ...DEFAULT_GOAL },
  readinessProfile: { ...DEFAULT_READINESS_PROFILE },
};
const emptyView = toPlannerScore(scoreFromBudget(emptyInput));
const emptyReality = financialReality([], [], []);

assert.equal(emptyView.score, 43, `empty score ${emptyView.score}`);
assert.equal(emptyView.verdict, "NOT_YET", `empty verdict ${emptyView.verdict}`);
assert.ok(emptyView.hardStops.includes("CREDIT_UNDER_620"), "empty hard-stop");
assert.equal(emptyReality.runwayMonths, Infinity, "empty runway ∞");
assert.equal(emptyReality.income, 0);
assert.equal(emptyReality.expenses, 0);
assert.equal(
  buildSpendDigest([], NOW).headline,
  "No spend recorded in the last two weeks.",
  "empty digest headline",
);
ok("empty state — 43 NOT_YET · CREDIT_UNDER_620 · tiles $0 · runway ∞");

/* ---------------------------------------------------------------- *
 * 5 — spend digest (§3.8)                                          *
 * ---------------------------------------------------------------- */

const digest = buildSpendDigest(seed.transactions, NOW);
assert.ok(digest.totalSpend > digest.priorSpend, "spend up week-over-week");
assert.ok((digest.deltaPct ?? 0) > 0, `deltaPct ${digest.deltaPct}`);
assert.equal(digest.topCategories[0].category, "housing", "housing top");
assert.equal(digest.topCategories[0].amount, 1850, "housing $1,850");
assert.ok(digest.rising.length > 0 && digest.rising[0].category === "housing", "housing rising");
assert.equal(digest.periodLabel, "Last 7 days");
ok(`spend digest — $${digest.totalSpend} vs $${digest.priorSpend} · housing leads`);

/* ---------------------------------------------------------------- *
 * 6 — 30-day cash spark (§3.3)                                     *
 * ---------------------------------------------------------------- */

const spark = buildCashflowSpark(seed.transactions, 30, NOW);
assert.equal(spark.length, 30, `spark points ${spark.length}`);
assert.equal(spark[0].cumulative, spark[0].net, "first point starts at its own net");
assert.equal(
  spark[spark.length - 1].cumulative,
  3033,
  `final cumulative ${spark[spark.length - 1].cumulative}`,
);
ok("cash spark — 30 points · Start $0 → Now +$3,033");

/* ---------------------------------------------------------------- *
 * 7 — spending donut (§3.10)                                       *
 * ---------------------------------------------------------------- */

const summary = summarize(seed.transactions);
const breakdownTotal = summary.categoryBreakdown.reduce((s, c) => s + c.amount, 0);
assert.equal(breakdownTotal, 3617, `breakdown total ${breakdownTotal}`);
assert.equal(summary.categoryBreakdown[0].category, "housing");
assert.equal(
  Math.round((summary.categoryBreakdown[0].amount / summary.expenses) * 100),
  51,
  "housing 51%",
);
ok("donut — 8 categories sum $3,617 · housing 51%");

console.log(`\nplanner-overview: ${passed} group(s) passed.`);
