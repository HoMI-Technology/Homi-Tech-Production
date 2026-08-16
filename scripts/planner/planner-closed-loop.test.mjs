/**
 * Closed-loop core libs test — cfm / score-bridge / impact, bundled with
 * esbuild (same pattern as scripts/planner-store.test.mjs; the '@' path
 * alias is resolved via esbuild's alias option).
 *
 * Asserts, on the demo seed (buildDemoSeed from @/lib/planner/derived):
 *
 *   1. scoreFromBudget → HōMI-Score ≈ 73 (±1), verdict ALMOST_THERE
 *   2. pillar percentages ≈ 74 / 66 / 80 (±2) — screenshot parity, the
 *      key acceptance (reference audit-overview.png)
 *   3. cfm estimateHousingPayment PITI sanity on a known case
 *      (+ the zero-rate branch), and the mandated canon-honesty change:
 *      horizon return/volatility resolve "missing" when not self-reported
 *   4. impact builder on a synthetic before/after → correct delta +
 *      headline kind (bill_paid, readiness up)
 *
 * Run: node scripts/planner-closed-loop.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), "planner-loop-"));

await build({
  entryPoints: [
    path.join(ROOT, "src/lib/planner/derived.ts"),
    path.join(ROOT, "src/lib/planner/cfm.ts"),
    path.join(ROOT, "src/lib/planner/score-bridge.ts"),
    path.join(ROOT, "src/lib/planner/impact.ts"),
    path.join(ROOT, "src/lib/score.ts"),
  ],
  outdir: OUTDIR,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
  alias: { "@": path.join(ROOT, "src") },
});

const mod = (name) =>
  import(pathToFileURL(path.join(OUTDIR, name)).href);

const { buildDemoSeed } = await mod("planner/derived.js");
const { deriveCfm, resolveCfmValue, cfmCoverage, estimateHousingPayment, SOURCE_LABEL } =
  await mod("planner/cfm.js");
const { buildAssessmentInputs, scoreFromBudget, toPlannerScore, scoreHouseholdMember } =
  await mod("planner/score-bridge.js");
const { buildScoreImpact, impactToSnapshot } = await mod("planner/impact.js");
const { computeScore } = await mod("score.js");

/* The screenshots were taken with demo date Aug 2, 2026. */
const seed = buildDemoSeed(new Date("2026-08-02T12:00:00"));

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* 1 — scoreFromBudget on the demo seed: score ≈ 73, verdict ALMOST_THERE. */
const result = scoreFromBudget(seed);
assert.ok(Math.abs(result.score - 73) <= 1, `score ${result.score}`);
assert.equal(result.verdict, "ALMOST_THERE", `verdict ${result.verdict}`);
assert.deepEqual(result.hardStops, [], "no hard-stops on the demo seed");
ok(`scoreFromBudget → ${result.score} · ${result.verdict}`);

/* 2 — pillar percentages ≈ 74 / 66 / 80 (screenshot parity). */
const view = toPlannerScore(result);
assert.ok(Math.abs(view.pillarPct.financial - 74) <= 2, `financial ${view.pillarPct.financial}`);
assert.ok(Math.abs(view.pillarPct.emotional - 66) <= 2, `emotional ${view.pillarPct.emotional}`);
assert.ok(Math.abs(view.pillarPct.timing - 80) <= 2, `timing ${view.pillarPct.timing}`);
assert.equal(view.verdict, "ALMOST_THERE");
assert.equal(typeof view.keyInsight, "string");
assert.ok(view.nextSteps.length > 0, "nextSteps present");
ok(
  `pillars ${view.pillarPct.financial} / ${view.pillarPct.emotional} / ${view.pillarPct.timing} (target 74 / 66 / 80)`,
);

/* 3 — cfm: PITI sanity on a known case + zero-rate branch + the mandated
 * missing-horizon honesty contract. */
const known = estimateHousingPayment({
  targetPrice: 375000,
  downPaymentSaved: 75000,
  ratePct: 6,
  termYears: 30,
  taxInsuranceRatePct: 1.2,
  hoaMonthly: 0,
});
// $300k principal, 6%/30yr → P&I $1,798.65; tax/ins $375/mo → $2,173.65.
assert.ok(Math.abs(known - 2173.65) < 0.01, `PITI ${known}`);
const zeroRate = estimateHousingPayment({
  targetPrice: 360000,
  downPaymentSaved: 0,
  ratePct: 0,
  termYears: 30,
  taxInsuranceRatePct: 0,
  hoaMonthly: 0,
});
assert.ok(Math.abs(zeroRate - 1000) < 1e-9, `zero-rate ${zeroRate}`);
const withHoa = estimateHousingPayment({
  targetPrice: 360000,
  downPaymentSaved: 60000,
  ratePct: 0,
  termYears: 30,
  taxInsuranceRatePct: 1,
  hoaMonthly: 250,
});
assert.ok(Math.abs(withHoa - (300000 / 360 + 300 + 250)) < 1e-9, `PITI+HOA ${withHoa}`);

// Canon honesty contract: horizon return/volatility are never imputed.
const cfm = deriveCfm(
  {
    monthlyIncome: 6650,
    monthlyExpenses: 3617,
    monthlyDebtPayments: 220,
    liquidSavings: 18720.6,
    totalDebt: 24600,
    portfolioValue: 57077.95,
    netCashFlow: 3033,
    savingsRatePct: 45.6,
    runwayMonths: 5.2,
    dtiPct: 3.3,
  },
  { targetPrice: 400000, downPaymentSaved: 20000 },
  null,
);
assert.equal(cfm.horizon.expectedReturnPct.source, "missing", "return must be missing, never imputed");
assert.equal(cfm.horizon.volatilityPct.source, "missing", "volatility must be missing, never imputed");
assert.equal(cfm.horizon.investedAssets.source, "lens-derived", "portfolio fallback");
assert.equal(resolveCfmValue(cfm, "core.monthlyIncome").source, "self-reported");
assert.equal(resolveCfmValue(cfm, "housing.targetPrice").value, 400000);
assert.equal(resolveCfmValue(cfm, "bogus.path").source, "missing");
assert.equal(SOURCE_LABEL.missing, "Missing");
assert.equal(
  cfmCoverage(cfm, [
    "core.monthlyIncome",
    "housing.targetPrice",
    "horizon.expectedReturnPct",
    "horizon.volatilityPct",
  ]),
  0.5,
  "coverage counts missing horizon honestly",
);
ok("cfm PITI $2,173.65 known case · zero-rate branch · horizon missing never imputed");

/* 4 — impact builder on a synthetic before/after: DTI crosses into the top
 * band (0 pts → 10 pts), everything else held constant. */
const baseInputs = {
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 8,
  partnerAlignment: 8,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};
const before = computeScore({ ...baseInputs, debtToIncomeRatio: 0.45 });
const after = computeScore({ ...baseInputs, debtToIncomeRatio: 0.28 });
assert.equal(after.pillars.financial.total - before.pillars.financial.total, 10);

const impact = buildScoreImpact(before, after, "Bill paid");
assert.equal(impact.delta, 10, `delta ${impact.delta}`);
assert.equal(impact.actionKind, "bill_paid");
assert.equal(impact.headline, "Bill closed the loop — readiness up", impact.headline);
assert.equal(impact.pillarDeltas.financial, 10);
assert.equal(impact.pillarDeltas.emotional, 0);
assert.equal(impact.pillarDeltas.timing, 0);
assert.ok(impact.detail.includes("Financial Reality"), "main-mover narrative");
assert.equal(impact.hardStopsCleared, 0);
assert.equal(impact.hardStopsAdded, 0);
const snap = impactToSnapshot(impact);
assert.equal(snap.delta, 10);
assert.equal(snap.headline, impact.headline);
assert.equal(snap.actionKind, "bill_paid");
ok("impact builder — delta +10 · 'Bill closed the loop — readiness up' · snapshot");

/* 5 — bridge plumbing: income multiplier (household clamp) + flat-delta
 * headline kind on a no-op reason. */
const member = scoreHouseholdMember(
  seed,
  { ...seed.householdPartner, incomeShare: 0.5 },
  "primary",
);
assert.equal(member.score, result.score, "primary member matches solo score when partner disabled");
const flat = buildScoreImpact(result, result, "Daily check-in");
assert.equal(flat.delta, 0);
assert.equal(flat.actionKind, "checkin");
assert.equal(flat.headline, "Check-in saved — pattern updated", flat.headline);
ok("household primary parity · flat-delta progress-first headline kind");

console.log(`\n${passed}/5 assertion groups passed`);
