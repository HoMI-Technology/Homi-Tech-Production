/**
 * Lenses & voice libs test — housing lens / companion / brokers /
 * institutions, bundled with esbuild (same pattern as
 * scripts/planner-closed-loop.test.mjs; the '@' path alias is resolved
 * via esbuild's alias option).
 *
 * Asserts:
 *
 *   1. housing lens on the screenshot case — price 425000, down 38000,
 *      rate 6.5, term 30, tax/ins 1.35%, HOA 45, rent 1850 on the demo
 *      ledger (income 6650, cash flow 3033, liquid 18720.60):
 *      buy/mo ≈ $2,969 · monthly delta ≈ +$1,119 · ratio ≈ 45% ·
 *      verdict buy_stretch · 20%-down gap $47,000 · 3 warnings
 *   2. a clear-rent case (big delta, comfortable ratio) → rent_clearer
 *   3. companion — hard-stop context → protection reply (no advice
 *      language); FOMO keyword → deflection; "should I buy" →
 *      not-advice guardrail; greeting voice; verdict label resolves
 *      through canon VERDICT_META (no hardcoded "ALMOST")
 *   4. brokers / institutions lookups + fallback to "other"
 *
 * Run: node scripts/planner-lenses.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = fs.mkdtempSync(path.join(os.tmpdir(), "planner-lenses-"));

await build({
  entryPoints: [
    path.join(ROOT, "src/lib/planner/housing.ts"),
    path.join(ROOT, "src/lib/planner/companion.ts"),
    path.join(ROOT, "src/lib/planner/brokers.ts"),
    path.join(ROOT, "src/lib/planner/institutions.ts"),
  ],
  outdir: OUTDIR,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
  alias: { "@": path.join(ROOT, "src") },
});

const mod = (name) => import(pathToFileURL(path.join(OUTDIR, name)).href);

const { computeHousingLens } = await mod("housing.js");
const { greeting, buildCompanionReply } = await mod("companion.js");
const { BROKERS, brokerMeta } = await mod("brokers.js");
const { INSTITUTIONS, institutionMeta, institutionLabel } = await mod(
  "institutions.js",
);

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

/* ------------------------------------------------------------------ */
/* 1 — housing lens, screenshot case                                   */
/* ------------------------------------------------------------------ */

const shot = computeHousingLens({
  targetPrice: 425000,
  downPaymentSaved: 38000,
  ratePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.35,
  hoaMonthly: 45,
  currentRent: 1850,
  monthlyIncome: 6650,
  liquidSavings: 18720.6,
  netCashFlow: 3033,
});

assert.ok(Math.abs(shot.monthlyHousing - 2969) < 1, `buy/mo ${shot.monthlyHousing}`);
assert.ok(Math.abs(shot.monthlyDelta - 1119) < 1, `delta ${shot.monthlyDelta}`);
assert.ok(
  Math.abs(Math.round(shot.housingRatioPct) - 45) < 1e-9 ||
    Math.abs(shot.housingRatioPct - 44.65) < 0.1,
  `ratio ${shot.housingRatioPct}`,
);
assert.equal(shot.verdict, "buy_stretch", `verdict ${shot.verdict}`);
assert.equal(shot.downPaymentGap, 47000, `gap ${shot.downPaymentGap}`);
assert.equal(shot.notes.length, 3, `notes ${JSON.stringify(shot.notes)}`);
assert.ok(shot.notes.some((n) => n.includes("36%")), "stretch-line note");
assert.ok(shot.notes.some((n) => n.includes("$1,119")), "monthly-delta note");
assert.ok(shot.notes.some((n) => n.includes("$47,000")), "20%-down-gap note");
assert.ok(shot.canCoverDown, "5% minimum down covered");
assert.ok(shot.runwayHitMonths != null && shot.runwayHitMonths > 0, "runway hit");
ok("screenshot case — $2,969/mo · +$1,119 delta · ≈45% · buy_stretch · $47k gap · 3 warnings");

/* ------------------------------------------------------------------ */
/* 2 — clear-rent case → rent_clearer                                  */
/* ------------------------------------------------------------------ */

const renter = computeHousingLens({
  targetPrice: 425000,
  downPaymentSaved: 85000, // full 20% down — not blocked, no stretch
  ratePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.35,
  hoaMonthly: 45,
  currentRent: 1850,
  monthlyIncome: 12000,
  liquidSavings: 60000,
  netCashFlow: 4500,
});

assert.equal(renter.verdict, "rent_clearer", `verdict ${renter.verdict}`);
assert.ok(renter.housingRatioPct <= 36, `ratio ${renter.housingRatioPct}`);
assert.ok(renter.monthlyDelta > 400, `delta ${renter.monthlyDelta}`);
assert.equal(renter.downPaymentGap, 0, "no 20% gap");
ok("clear-rent case — comfortable ratio + >$400 delta → rent_clearer");

/* sanity — a fully blocked case (>45% ratio) for the 4-way verdict */
const blocked = computeHousingLens({
  ...{
    targetPrice: 425000,
    downPaymentSaved: 38000,
    ratePct: 6.5,
    termYears: 30,
    taxInsuranceRatePct: 1.35,
    hoaMonthly: 45,
    currentRent: 1850,
    liquidSavings: 18720.6,
    netCashFlow: 3033,
  },
  monthlyIncome: 5000, // 2969 / 5000 = 59% > 45%
});
assert.equal(blocked.verdict, "blocked", `verdict ${blocked.verdict}`);
assert.ok(blocked.notes.some((n) => n.includes("45%")), "hard-stop note");
ok("blocked case — >45% ratio → blocked + hard-stop note");

/* ------------------------------------------------------------------ */
/* 3 — companion                                                       */
/* ------------------------------------------------------------------ */

const healthyCtx = {
  monthlyIncome: 6650,
  netCashFlow: 3033,
  savingsRate: 46,
  runwayMonths: 5.2,
  dti: 3,
  liquidSavings: 18720.6,
  netWorth: 72098.56,
  portfolioValue: 57077.95,
  pathVerdict: "ALMOST_THERE",
  pathBinding: null,
  pathNextStep: "Top up the emergency fund to 6 months",
  pathCompletionPct: 40,
};

/* greeting — voice is character-exact */
const g = greeting();
assert.ok(
  g.includes("your homie for this decision, not your banker and not a hype man"),
  `greeting voice: ${g}`,
);
assert.ok(g.includes("HōMI"), "brand spelling in greeting");
ok("greeting — homie voice, exact");

/* hard-stop context → protection reply, no advice language */
const hardStopCtx = {
  ...healthyCtx,
  netCashFlow: -180,
  runwayMonths: 0.4,
  dti: 55,
  pathVerdict: "NOT_YET",
  pathBinding: null,
};
const protect = buildCompanionReply("am i ready to buy?", hardStopCtx);
assert.ok(protect.includes("Straight answer: not yet"), `reply: ${protect}`);
assert.ok(protect.includes("protective gate"), `reply: ${protect}`);
assert.ok(!/recommend|you should buy|go for it/i.test(protect), "no advice language");
ok("hard-stop context → protection reply, zero advice language");

/* FOMO keyword → deflection */
const fomoReply = buildCompanionReply(
  "everyone else is buying and the fomo is real",
  healthyCtx,
);
assert.ok(fomoReply.includes("Manufactured urgency"), `reply: ${fomoReply}`);
assert.ok(fomoReply.includes("30 quiet days"), `reply: ${fomoReply}`);
ok("FOMO keyword → urgency deflection");

/* "should I buy" → not-advice guardrail (works even without numbers) */
const guard = buildCompanionReply("should I buy this house?", healthyCtx);
assert.ok(guard.includes("crosses into advice"), `reply: ${guard}`);
assert.ok(guard.includes("YOUR cash flow, runway, and debt load"), `reply: ${guard}`);
const guardNoCtx = buildCompanionReply("should i buy?", null);
assert.ok(guardNoCtx.includes("crosses into advice"), "guardrail before ctx gate");
ok("'should I buy' → not-advice guardrail (with and without ctx)");

/* verdict label resolves through canon VERDICT_META — never hardcoded */
const pathReply = buildCompanionReply("where am I on the path?", healthyCtx);
assert.ok(pathReply.includes("Path verdict: ALMOST THERE."), `reply: ${pathReply}`);
assert.ok(!pathReply.includes("ALMOST_THERE"), "raw key never shown");
ok("path talk — ALMOST_THERE renders via canon meta label");

/* ------------------------------------------------------------------ */
/* 4 — brokers / institutions                                          */
/* ------------------------------------------------------------------ */

assert.equal(BROKERS.length, 6);
assert.deepEqual(
  { ...brokerMeta("fidelity") },
  { id: "fidelity", label: "Fidelity", short: "FID", color: "#4caf50" },
);
assert.equal(brokerMeta("robinhood").short, "RH");
assert.equal(brokerMeta("other").label, "Other broker");
assert.equal(brokerMeta("etrade").label, "E*TRADE");
assert.equal(brokerMeta("not-a-broker").id, "other", "unknown → other fallback");
ok("brokers — 6 metas, exact fidelity entry, unknown → other");

assert.equal(INSTITUTIONS.length, 6);
assert.deepEqual(
  { ...institutionMeta("chase") },
  { id: "chase", label: "Chase", short: "CH", accent: "#22d3ee" },
);
assert.equal(institutionLabel("bofa"), "Bank of America");
assert.equal(institutionMeta("ally").accent, "#7c3aed");
assert.equal(institutionMeta("not-a-bank").id, "other", "unknown → other fallback");
assert.equal(institutionLabel("not-a-bank"), "not-a-bank", "label falls back to id");
ok("institutions — 6 metas, exact chase entry, meta → other, label → id");

console.log(`\n${passed} assertion groups passed`);
