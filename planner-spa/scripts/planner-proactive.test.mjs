/**
 * Pure-logic test for the planner proactive layer (lib/planner/{stress,
 * signals,nudges,digest}.ts).
 *
 * Same esbuild-bundle pattern as scripts/planner-store.test.mjs: each lib
 * is bundled to a temp ESM file (with the `@/` alias resolved) and driven
 * with synthetic + demo-seed inputs. Every clock read is threaded through
 * an explicit `today`/`asOf` so the suite is deterministic.
 *
 *   1. stress   — rising 7-check-in series → index > 50, positive slope,
 *                 slope_up ("climbing") classification; calm flat series →
 *                 low index, steady_ok, no signal
 *   2. signals  — demo seed (path = null) → due-bill signal + no-path
 *                 signal, ≤ 6 total, dismissal filter works
 *   3. nudges   — same input → if–then bill nudge present, cap of 4
 *   4. digest   — demo ledger → last-7-day spend > prior-7-day, housing is
 *                 the top riser; cashflow spark has 30 points
 *
 * Run: node scripts/planner-proactive.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), "planner-proactive-"));

await build({
  entryPoints: [
    path.join(ROOT, "src/lib/planner/stress.ts"),
    path.join(ROOT, "src/lib/planner/signals.ts"),
    path.join(ROOT, "src/lib/planner/nudges.ts"),
    path.join(ROOT, "src/lib/planner/digest.ts"),
    path.join(ROOT, "src/lib/planner/derived.ts"),
  ],
  outdir: OUTDIR,
  bundle: true,
  format: "esm",
  platform: "neutral",
  alias: { "@": path.join(ROOT, "src") },
  logLevel: "silent",
});

const load = (name) => import(pathToFileURL(path.join(OUTDIR, name)).href);

const { analyzeStress } = await load("stress.js");
const { derivePlannerSignals } = await load("signals.js");
const { deriveBehaviorNudges } = await load("nudges.js");
const { buildSpendDigest, buildCashflowSpark } = await load("digest.js");
const {
  addDaysISO,
  buildDemoSeed,
  financialReality,
  summarizePortfolio,
  totalNetWorth,
} = await load("derived.js");

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* Fixed clock: the demo seed's reference "today". */
const NOW = new Date("2026-08-02T12:00:00");
const TODAY = "2026-08-02";

/* ---------------------------------------------------------------- *
 * 1 — stress analytics                                             *
 * ---------------------------------------------------------------- */

const checkin = (offset, stress) => {
  const date = addDaysISO(TODAY, offset - 6); // 0..6 → 07-27 .. 08-02
  return {
    id: `ci-${offset}`,
    date,
    financialStress: stress,
    createdAt: `${date}T09:00:00`,
  };
};

// Rising series: 2,3,4,5,6,7,8 across 7 consecutive days.
const rising = analyzeStress([2, 3, 4, 5, 6, 7, 8].map((s, i) => checkin(i, s)));
assert.ok(rising.index > 50, `rising index ${rising.index} should be > 50`);
assert.ok(rising.slope > 0, `rising slope ${rising.slope} should be positive`);
assert.equal(rising.reasonCode, "slope_up", "rising reason code");
assert.equal(rising.label, "Stress is climbing");
assert.equal(rising.shouldSignal, true, "climbing stress should surface");
ok("rising series → index 70 · slope +1.00 · slope_up (climbing)");

// Calm flat series: 2 across 7 days.
const calm = analyzeStress([2, 2, 2, 2, 2, 2, 2].map((s, i) => checkin(i, s)));
assert.ok(calm.index < 20, `calm index ${calm.index} should be < 20`);
assert.equal(calm.reasonCode, "steady_ok", "calm reason code");
assert.equal(calm.shouldSignal, false, "calm stretch stays quiet");
ok("calm flat series → low index · steady_ok · silent");

// Empty + sparse guard rails.
const empty = analyzeStress([]);
assert.equal(empty.reasonCode, "insufficient");
assert.equal(empty.shouldSignal, false);
ok("empty check-ins → insufficient baseline, no signal");

/* ---------------------------------------------------------------- *
 * 2 — signals from the demo seed (path = null)                     *
 * ---------------------------------------------------------------- */

const seed = buildDemoSeed(NOW);
const reality = financialReality(seed.transactions, seed.accounts, seed.bills);
const portfolio = summarizePortfolio(seed.holdings);
const nw = totalNetWorth(seed.accounts, seed.holdings, seed.netWorthItems);

const signalInput = {
  income: reality.income,
  cashFlow: reality.cashFlow,
  savingsRate: reality.savingsRate,
  runwayMonths: reality.runwayMonths,
  dti: reality.dti,
  bills: seed.bills,
  path: null,
  assessment: null,
  portfolioValue: portfolio.marketValue,
  netWorth: nw.netWorth,
  checkins: seed.checkins,
  today: TODAY,
};

const signals = derivePlannerSignals(signalInput);
const signalIds = signals.map((s) => s.id);

assert.ok(
  signalIds.includes("bills-due-soon"),
  `expected a due-bill signal, got ${signalIds}`,
);
const billSignal = signals.find((s) => s.id === "bills-due-soon");
assert.equal(billSignal.severity, "amber", "due-today bill is amber");
assert.ok(
  signalIds.includes("path-missing"),
  `expected a no-path signal, got ${signalIds}`,
);
assert.ok(signals.length <= 6, `signals capped at 6, got ${signals.length}`);
ok(`demo seed → [${signalIds.join(", ")}] · ≤ 6 · severity-ranked`);

// Severity ordering is non-decreasing in the priority map.
const rank = { crimson: 0, amber: 1, yellow: 2, cyan: 3, emerald: 4 };
for (let i = 1; i < signals.length; i++) {
  assert.ok(
    rank[signals[i].severity] >= rank[signals[i - 1].severity],
    "signals sorted by severity",
  );
}

// Dismissal filter: dismiss the bill signal → it disappears, path remains.
const dismissed = derivePlannerSignals({
  ...signalInput,
  dismissedIds: ["bills-due-soon"],
});
assert.ok(!dismissed.some((s) => s.id === "bills-due-soon"), "dismissed id filtered");
assert.ok(dismissed.some((s) => s.id === "path-missing"), "other signals survive");
ok("dismissal-set filtering works");

// All-clear fallback: everything dismissed → emerald all-clear card.
const cleared = derivePlannerSignals({
  ...signalInput,
  dismissedIds: signalIds,
});
assert.deepEqual(cleared.map((s) => s.id), ["all-clear"], "all-clear fallback");
ok("all-clear fallback when every signal is dismissed");

/* ---------------------------------------------------------------- *
 * 3 — nudges from the same input                                   *
 * ---------------------------------------------------------------- */

const nudges = deriveBehaviorNudges({
  assessment: null,
  bills: seed.bills,
  path: null,
  stress: analyzeStress(seed.checkins),
  cashFlow: reality.cashFlow,
  runwayMonths: reality.runwayMonths,
  savingsRate: reality.savingsRate,
  today: TODAY,
});
const nudgeIds = nudges.map((n) => n.id);

assert.ok(
  nudgeIds.includes("nudge-ii-due"),
  `expected an if–then bill nudge, got ${nudgeIds}`,
);
const billNudge = nudges.find((n) => n.id === "nudge-ii-due");
assert.equal(billNudge.kind, "implementation_intention");
assert.ok(nudgeIds.includes("nudge-micro-generate-path"), "no-path micro-commitment");
assert.ok(nudges.length <= 4, `nudges capped at 4, got ${nudges.length}`);
for (let i = 1; i < nudges.length; i++) {
  assert.ok(nudges[i].priority >= nudges[i - 1].priority, "priority sorted");
}
ok(`demo seed → [${nudgeIds.join(", ")}] · if–then bill nudge · cap 4`);

/* ---------------------------------------------------------------- *
 * 4 — spend digest + cashflow spark from the demo ledger           *
 * ---------------------------------------------------------------- */

const digest = buildSpendDigest(seed.transactions, NOW);
assert.ok(
  digest.totalSpend > digest.priorSpend,
  `last 7d ${digest.totalSpend} should exceed prior 7d ${digest.priorSpend}`,
);
assert.equal(digest.rising[0]?.category, "housing", "housing is the top riser");
assert.ok(digest.rising.length <= 3 && digest.falling.length <= 3, "top-3 movers");
assert.ok(digest.headline.startsWith("Spend up"), `headline: ${digest.headline}`);
assert.ok(digest.income > 0, "in-week income counted");
ok(
  `last 7d $${digest.totalSpend} > prior 7d $${digest.priorSpend} · top riser housing · "${digest.headline}"`,
);

const spark = buildCashflowSpark(seed.transactions, 30, NOW);
assert.equal(spark.length, 30, "spark length 30");
assert.equal(spark[29].date, TODAY, "spark ends on asOf");
// Cumulative is a running sum of daily net.
let acc = 0;
for (const p of spark) {
  acc += p.net;
  assert.ok(Math.abs(p.cumulative - acc) < 1e-9, "cumulative integrity");
}
ok("cashflow spark → 30 points · cumulative series consistent");

console.log(`\n${passed} assertion groups passed`);
