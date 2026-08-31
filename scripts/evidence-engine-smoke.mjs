#!/usr/bin/env node
/**
 * Signed-in Evidence Engine smoke.
 *
 * persist → baseline row → due survey → structured save → verdict unchanged
 *
 *   SMOKE_EMAIL / SMOKE_PASSWORD
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local ok)
 *   SMOKE_BASE_URL  (default http://localhost:3000 — not production)
 *
 * Production writes require EVIDENCE_SMOKE_WRITE=1. Persist on a free-tier
 * account can 402; the script then uses the latest assessment.
 *
 * BLOCKED (honest): merge + migration not applied, or missing credentials.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

const email = process.env.SMOKE_EMAIL ?? process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.SMOKE_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? "";
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const site = (process.env.SMOKE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const isProd = /homitechnology\.com$/i.test(new URL(site).hostname);
const writeAllowed = process.env.EVIDENCE_SMOKE_WRITE === "1" || !isProd;

const SAMPLE = {
  inputs: {
    debtToIncomeRatio: 0.25,
    downPaymentPercent: 0.2,
    emergencyFundMonths: 6,
    creditScore: 750,
    creditScoreProvenance: "band_ignored",
    selfReportedCreditBand: "good",
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 7,
    fomoLevel: 3,
    timeHorizonMonths: 18,
    savingsRate: 0.15,
    downPaymentProgress: 0.5,
    monthlyHousingRatio: 0.28,
  },
  kind: "full",
  decisionType: "home_buying",
};

function ok(m) {
  console.log(`  ✓ ${m}`);
}
function bad(m, d = "") {
  console.error(`  ✗ ${m}${d ? ` — ${d}` : ""}`);
}

function projectRef(url) {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "";
  }
}

function authCookie(session) {
  const ref = projectRef(supabaseUrl);
  const name = `sb-${ref}-auth-token`;
  return `${name}=${encodeURIComponent(JSON.stringify(session))}`;
}

async function rest(path, access, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${access}`,
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* raw */
  }
  return { res, body, text };
}

async function main() {
  console.log(`\nEvidence Engine smoke → ${site}\n`);
  if (!email || !password) {
    bad("missing SMOKE_EMAIL / SMOKE_PASSWORD");
    console.log("BLOCKED: signed-in credentials not set.");
    process.exit(2);
  }
  if (!supabaseUrl || !anon) {
    bad("missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
    console.log("BLOCKED: Supabase public env not set.");
    process.exit(2);
  }

  let failed = 0;
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await tokenRes.json();
  if (!tokenRes.ok || !session.access_token) {
    bad("sign-in", `${tokenRes.status}`);
    process.exit(1);
  }
  ok("sign-in");
  const access = session.access_token;
  const userId = session.user?.id;
  const cookie = authCookie(session);
  const appHeaders = {
    cookie,
    Authorization: `Bearer ${access}`,
    "content-type": "application/json",
  };

  let assessmentId = null;
  let verdictBefore = null;
  let scoreBefore = null;

  if (writeAllowed) {
    const persist = await fetch(`${site}/api/assessments`, {
      method: "POST",
      headers: appHeaders,
      body: JSON.stringify(SAMPLE),
    });
    const persistBody = await persist.json().catch(() => ({}));
    if (persist.status === 402) {
      ok("persist  402 rescoring_locked — using latest assessment");
    } else if (persist.ok && persistBody.id) {
      assessmentId = persistBody.id;
      ok(`persist  ${assessmentId}`);
    } else {
      bad("persist", `${persist.status} ${JSON.stringify(persistBody).slice(0, 160)}`);
      failed++;
    }
  } else {
    ok("persist skipped (production write requires EVIDENCE_SMOKE_WRITE=1)");
  }

  const list = await fetch(`${site}/api/assessments`, { headers: appHeaders });
  const listBody = await list.json().catch(() => ({}));
  const rows = Array.isArray(listBody.assessments) ? listBody.assessments : [];
  if (!list.ok) {
    bad("assessments GET", `${list.status}`);
    failed++;
  } else {
    ok(`assessments  n=${rows.length}`);
  }
  const current = rows.find((r) => r.id === assessmentId) ?? rows[0];
  if (!current?.id) {
    bad("no assessment to inspect");
    console.log("BLOCKED: account has no completed assessment.");
    process.exit(failed === 0 ? 2 : 1);
  }
  assessmentId = current.id;
  verdictBefore = current.verdict;
  scoreBefore = current.overall_score;
  ok(`assessment  verdict=${verdictBefore} score=${scoreBefore}`);

  const baseline = await rest(
    `/assessment_outcome_baselines?assessment_id=eq.${assessmentId}&select=*`,
    access,
  );
  if (baseline.res.status === 404 || /does not exist|schema cache/i.test(baseline.text)) {
    bad("baseline table missing — migration not applied");
    console.log("BLOCKED: apply 20260831000001_evidence_engine.sql then re-run.");
    process.exit(2);
  }
  const baselineRows = Array.isArray(baseline.body) ? baseline.body : [];
  if (baseline.res.ok && baselineRows[0]) {
    ok(`baseline  schema=${baselineRows[0].schema_version}`);
  } else if (baseline.res.ok) {
    ok("baseline  missing (legacy assessment — expected until a new persist)");
  } else {
    bad("baseline", `${baseline.res.status}`);
    failed++;
  }

  const surveys = await rest(
    `/outcome_surveys?assessment_id=eq.${assessmentId}&select=id,kind,due_at,completed_at,contact_state&order=due_at.asc`,
    access,
  );
  let surveyRows = Array.isArray(surveys.body) ? surveys.body : [];
  if (!surveys.res.ok) {
    bad("surveys list", `${surveys.res.status}`);
    failed++;
  } else {
    ok(`surveys  n=${surveyRows.length}`);
  }

  if (writeAllowed) {
    let target = surveyRows.find((s) => !s.completed_at);
    if (!target) {
      const insert = await rest("/outcome_surveys", access, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          assessment_id: assessmentId,
          kind: "day30",
          due_at: new Date(Date.now() - 60_000).toISOString(),
          contact_state: "eligible",
        }),
      });
      if (insert.res.ok) {
        target = Array.isArray(insert.body) ? insert.body[0] : insert.body;
        ok("survey  inserted due row");
      } else {
        bad("survey insert", `${insert.res.status} ${String(insert.text).slice(0, 160)}`);
        failed++;
      }
    } else {
      const due = await rest(`/outcome_surveys?id=eq.${target.id}`, access, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ due_at: new Date(Date.now() - 60_000).toISOString() }),
      });
      if (due.res.ok) ok("survey  marked due");
      else {
        bad("survey due patch", `${due.res.status}`);
        failed++;
      }
    }

    if (target?.id) {
      const save = await fetch(`${site}/api/outcomes/surveys`, {
        method: "POST",
        headers: appHeaders,
        body: JSON.stringify({
          surveyId: target.id,
          outcome: "waited",
          notes: "evidence-engine smoke",
          financial_stress: 4,
        }),
      });
      const saveBody = await save.json().catch(() => ({}));
      if (save.ok) ok("structured save");
      else if (save.status === 409) ok("structured save  already completed");
      else {
        bad("structured save", `${save.status} ${JSON.stringify(saveBody).slice(0, 160)}`);
        failed++;
      }
    }
  } else {
    ok("survey write skipped (production write requires EVIDENCE_SMOKE_WRITE=1)");
  }

  const after = await fetch(`${site}/api/assessments`, { headers: appHeaders });
  const afterBody = await after.json().catch(() => ({}));
  const afterRow = (afterBody.assessments ?? []).find((r) => r.id === assessmentId);
  if (!afterRow) {
    bad("re-fetch assessment");
    failed++;
  } else if (afterRow.verdict !== verdictBefore || afterRow.overall_score !== scoreBefore) {
    bad(
      "verdict changed after survey",
      `${verdictBefore}/${scoreBefore} → ${afterRow.verdict}/${afterRow.overall_score}`,
    );
    failed++;
  } else {
    ok(`verdict unchanged  ${afterRow.verdict} ${afterRow.overall_score}`);
  }

  if (failed > 0) {
    console.log(`\nEvidence Engine smoke: FAIL (${failed})\n`);
    process.exit(1);
  }
  console.log("\nEvidence Engine smoke: PASS\n");
}

main().catch((err) => {
  bad("crash", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
