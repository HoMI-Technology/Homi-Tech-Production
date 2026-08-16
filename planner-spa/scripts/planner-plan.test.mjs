/**
 * Plan-tab wave test — the regeneratePath adapter (store/planner.ts
 * buildPlannerPathSnapshot) exercised PURELY in node, no DOM.
 *
 * The store module is bundled with esbuild (same pattern as
 * scripts/planner-lenses.test.mjs; '@' alias resolved via esbuild's alias
 * option). zustand persist rehydrates against the window-guarded envelope
 * storage, which returns null outside the browser, so the store imports
 * and runs cleanly in plain node.
 *
 * Asserts:
 *
 *   1. demo seed → regeneratePath produces a PathSnapshot matching the
 *      canon engine output (score 73 · verdict ALMOST_THERE · mode build)
 *   2. PathSnapshot shape — id / createdAt / score / verdict /
 *      bindingConstraint / mode / steps[]; step shape has NO href (the
 *      canon route field is projected away)
 *   3. verdict is always a canon four-tier VerdictKey — the reference
 *      planner's 75/55 three-tier vocabulary can never surface
 *   4. step ordering — daysFromNow ascending, first step ≤ 7 days,
 *      ≤ 7 steps, always ends with a REASSESS step (build mode)
 *   5. READY band → ready_optional mode + a single MAINTENANCE step
 *   6. empty workspace → assessment_only still produces a valid path
 *   7. completePathStep semantics — done stamps completedAt, pending
 *      clears it; completing never regenerates the path (closed loop
 *      doctrine)
 *   8. clearPath semantics
 *
 * Run: node scripts/planner-plan.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "planner-plan-")),
  "planner-store.mjs",
);

await build({
  entryPoints: [path.join(ROOT, "src/store/planner.ts")],
  outfile: OUT,
  bundle: true,
  format: "esm",
  platform: "neutral",
  logLevel: "silent",
  alias: { "@": path.join(ROOT, "src") },
});

const { usePlannerStore, buildPlannerPathSnapshot, PLANNER_STORAGE_KEY } =
  await import(pathToFileURL(OUT).href);

let passed = 0;
function ok(name) {
  passed += 1;
  console.log(`  ok — ${name}`);
}

const CANON_VERDICTS = new Set([
  "READY",
  "ALMOST_THERE",
  "BUILD_FIRST",
  "NOT_YET",
]);

const store = usePlannerStore;

/* ------------------------------------------------------------------ */
/* 1 — demo seed → canon path (score 73 · ALMOST_THERE)                */
/* ------------------------------------------------------------------ */

store.getState().resetDemo();
store.getState().regeneratePath();
const demo = store.getState().path;

assert.ok(demo, "path exists after regeneratePath");
assert.equal(demo.score, 73, `score ${demo.score}`);
assert.equal(demo.verdict, "ALMOST_THERE", `verdict ${demo.verdict}`);
assert.equal(demo.mode, "build", `mode ${demo.mode}`);
assert.ok(demo.steps.length >= 2, `steps ${demo.steps.length}`);
ok("demo seed → regeneratePath → score 73 · ALMOST_THERE · build mode");

/* ------------------------------------------------------------------ */
/* 2 — PathSnapshot shape (no canon href on steps)                     */
/* ------------------------------------------------------------------ */

assert.equal(typeof demo.id, "string");
assert.ok(!Number.isNaN(Date.parse(demo.createdAt)), "createdAt ISO");
assert.equal(typeof demo.score, "number");
assert.equal(typeof demo.verdict, "string");
assert.ok(
  demo.bindingConstraint === null ||
    typeof demo.bindingConstraint === "string",
);
assert.ok(demo.mode === "build" || demo.mode === "ready_optional");
assert.ok(Array.isArray(demo.steps));
for (const step of demo.steps) {
  assert.equal(typeof step.id, "string");
  assert.equal(typeof step.title, "string");
  assert.ok(["milestone", "deadline", "review"].includes(step.kind));
  assert.equal(typeof step.daysFromNow, "number");
  assert.equal(typeof step.reasonCode, "string");
  assert.equal(typeof step.notes, "string");
  assert.ok(step.fundingTarget === null || typeof step.fundingTarget === "number");
  assert.ok(step.fundingLabel === null || typeof step.fundingLabel === "string");
  assert.ok(["pending", "done", "skipped"].includes(step.status));
  assert.ok(step.completedAt === null || typeof step.completedAt === "string");
  assert.ok(!("href" in step), "step href must be projected away");
}
ok("PathSnapshot shape — all fields present, href projected away");

/* ------------------------------------------------------------------ */
/* 3 — canon four-tier verdicts only (never the 75/55 vocabulary)      */
/* ------------------------------------------------------------------ */

assert.ok(CANON_VERDICTS.has(demo.verdict), `verdict ${demo.verdict}`);
// Exercise the empty-workspace path too — still a canon verdict.
const emptySnap = buildPlannerPathSnapshot(store.getState(), {
  now: new Date("2026-08-02T12:00:00"),
});
assert.ok(CANON_VERDICTS.has(emptySnap.verdict), `verdict ${emptySnap.verdict}`);
ok("verdicts resolve to the canon four-tier VerdictKey only");

/* ------------------------------------------------------------------ */
/* 4 — step ordering: ascending days, first ≤ 7, ≤ 7 steps, REASSESS   */
/* ------------------------------------------------------------------ */

assert.ok(demo.steps.length <= 7, `≤7 steps (${demo.steps.length})`);
assert.ok(
  demo.steps[0].daysFromNow <= 7,
  `first step ${demo.steps[0].daysFromNow}d`,
);
for (let i = 1; i < demo.steps.length; i += 1) {
  assert.ok(
    demo.steps[i].daysFromNow >= demo.steps[i - 1].daysFromNow,
    `step order ${demo.steps[i - 1].daysFromNow} → ${demo.steps[i].daysFromNow}`,
  );
}
assert.equal(
  demo.steps[demo.steps.length - 1].reasonCode,
  "REASSESS",
  "build-mode path ends with reassessment",
);
ok("step ordering — ascending days · first ≤ 7 · ≤ 7 steps · ends REASSESS");

/* ------------------------------------------------------------------ */
/* 5 — READY band → ready_optional + single MAINTENANCE step           */
/* ------------------------------------------------------------------ */

store.getState().resetDemo();
store.getState().setReadinessProfile({
  creditScore: 780,
  lifeStability: 9,
  confidenceLevel: 9,
  partnerAlignment: 9,
  fomoLevel: 2,
  timeHorizonMonths: 36,
  targetHomePrice: 300000,
  downPaymentSaved: 60000, // full 20% — clears down-payment gates
});
store.getState().regeneratePath();
const ready = store.getState().path;
assert.ok(ready, "ready path exists");
assert.equal(ready.verdict, "READY", `verdict ${ready.verdict}`);
assert.equal(ready.mode, "ready_optional", `mode ${ready.mode}`);
assert.equal(ready.steps.length, 1, `steps ${ready.steps.length}`);
assert.equal(ready.steps[0].reasonCode, "MAINTENANCE");
assert.equal(ready.bindingConstraint, "READY_CELEBRATE");
ok("READY band → ready_optional · single MAINTENANCE step · READY_CELEBRATE");

/* ------------------------------------------------------------------ */
/* 6 — empty workspace still generates (assessment-only confidence)    */
/* ------------------------------------------------------------------ */

store.getState().clearWorkspace();
store.getState().regeneratePath();
const empty = store.getState().path;
assert.ok(empty, "empty-workspace path exists");
assert.ok(CANON_VERDICTS.has(empty.verdict));
assert.ok(empty.steps.length > 0, "empty workspace still sequences steps");
assert.ok(empty.steps[0].daysFromNow <= 7);
ok("empty workspace → valid path with protective steps");

/* ------------------------------------------------------------------ */
/* 7 — completePathStep semantics (closed loop, never regenerate)      */
/* ------------------------------------------------------------------ */

store.getState().resetDemo();
store.getState().regeneratePath();
const before = store.getState().path;
const stepId = before.steps[0].id;
const pathId = before.id;

store.getState().completePathStep(stepId);
let after = store.getState().path;
assert.equal(after.id, pathId, "completion must not regenerate the path");
assert.equal(after.steps.length, before.steps.length, "steps not rebuilt");
assert.equal(after.steps[0].status, "done");
assert.ok(after.steps[0].completedAt, "completedAt stamped");

store.getState().completePathStep(stepId, "pending");
after = store.getState().path;
assert.equal(after.steps[0].status, "pending");
assert.equal(after.steps[0].completedAt, null, "pending clears the stamp");

store.getState().completePathStep(stepId, "skipped");
after = store.getState().path;
assert.equal(after.steps[0].status, "skipped");
assert.ok(after.steps[0].completedAt, "skipped stamps completion");
ok("completePathStep — done/skipped stamp, pending clears, no regenerate");

/* ------------------------------------------------------------------ */
/* 8 — clearPath semantics                                             */
/* ------------------------------------------------------------------ */

store.getState().clearPath();
assert.equal(store.getState().path, null);
ok("clearPath — path back to null (no-path signal can fire)");

/* storage key untouched by the wave */
assert.equal(PLANNER_STORAGE_KEY, "homi-planner-v1");

console.log(`\n${passed}/8 assertion groups passed`);
