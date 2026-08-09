#!/usr/bin/env node
/**
 * One-command smoke for HōMI.
 *
 *   npm run smoke              → live site is up (HTTP + health + scoring)
 *   npm run smoke:auth         → same + signed-in Playwright (needs 2 env vars)
 *
 * Signed-in needs only:
 *   SMOKE_EMAIL=you@example.com
 *   SMOKE_PASSWORD=YourPassword1
 * (aliases: E2E_TEST_EMAIL / E2E_TEST_PASSWORD)
 *
 * Target defaults to production. Override with SMOKE_BASE_URL.
 */

import { spawnSync } from "node:child_process";

const mode = (process.argv[2] ?? "public").toLowerCase();
const base = (
  process.env.SMOKE_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://homitechnology.com"
).replace(/\/$/, "");
const email = process.env.SMOKE_EMAIL ?? process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.SMOKE_PASSWORD ?? process.env.E2E_TEST_PASSWORD ?? "";

const PATHS = [
  "/",
  "/pricing",
  "/assessment",
  "/shadow-score",
  "/tools/mortgage",
  "/auth/sign-in",
  "/api/healthcheck",
];

function ok(label) {
  console.log(`  ✓ ${label}`);
}
function bad(label, detail = "") {
  console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

async function publicSmoke() {
  console.log(`\nSmoke (public) → ${base}\n`);
  let failed = 0;

  for (const p of PATHS) {
    try {
      const res = await fetch(`${base}${p}`, { redirect: "follow" });
      if (res.ok) ok(`${p}  ${res.status}`);
      else {
        bad(`${p}`, `status ${res.status}`);
        failed++;
      }
    } catch (e) {
      bad(p, e.message);
      failed++;
    }
  }

  try {
    const health = await fetch(`${base}/api/healthcheck`).then((r) => r.json());
    if (health.ok && health.database === "ok") {
      ok(`health  ok  version=${String(health.version ?? "").slice(0, 7)}`);
    } else {
      bad("health", JSON.stringify(health));
      failed++;
    }
  } catch (e) {
    bad("health", e.message);
    failed++;
  }

  try {
    const body = {
      debtToIncomeRatio: 0.25,
      downPaymentPercent: 0.2,
      emergencyFundMonths: 6,
      creditScore: 750,
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 7,
      fomoLevel: 3,
      timeHorizonMonths: 18,
      savingsRate: 0.15,
      downPaymentProgress: 0.5,
      monthlyHousingRatio: 0.28,
    };
    const res = await fetch(`${base}/api/scoring`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && typeof data.score === "number" && data.verdict) {
      ok(`scoring  ${data.score} ${data.verdict}`);
    } else {
      bad("scoring", `${res.status} ${JSON.stringify(data).slice(0, 120)}`);
      failed++;
    }
  } catch (e) {
    bad("scoring", e.message);
    failed++;
  }

  console.log(failed === 0 ? "\nPublic smoke: PASS\n" : `\nPublic smoke: FAIL (${failed})\n`);
  return failed === 0;
}

function authSmoke() {
  if (!email || !password) {
    console.log(`
Signed-in smoke needs a real account (2 vars only):

  # PowerShell
  $env:SMOKE_EMAIL = "you@example.com"
  $env:SMOKE_PASSWORD = "YourPassword1"
  npm run smoke:auth

  # bash
  SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='YourPassword1' npm run smoke:auth

Create the account once at ${base}/auth/sign-up
(or use any existing non-admin test account).
`);
    return false;
  }

  console.log(`\nSmoke (signed-in) → ${base} as ${email}\n`);

  const env = {
    ...process.env,
    E2E_BASE_URL: base,
    E2E_TEST_EMAIL: email,
    E2E_TEST_PASSWORD: password,
    SMOKE_EMAIL: email,
    SMOKE_PASSWORD: password,
  };

  const result = spawnSync(
    "npx",
    ["playwright", "test", "e2e/auth-smoke.e2e.ts", "--reporter=list"],
    { env, stdio: "inherit", shell: true },
  );

  if (result.status === 0) {
    console.log("\nSigned-in smoke (browser): PASS\n");
    return true;
  }

  // This Windows QA box often blocks Playwright Chromium (SAC spawn UNKNOWN).
  // Fall back to password-grant + live Supabase/API checks — no browser.
  console.error(
    "\nBrowser smoke failed (often Windows SAC blocking Chromium).\n" +
      "Falling back to signed-in API smoke (no browser)…\n",
  );
  const api = spawnSync("node", ["scripts/smoke-auth-api.mjs"], {
    env,
    stdio: "inherit",
    shell: true,
  });
  if (api.status === 0) {
    console.log("Signed-in smoke (API fallback): PASS\n");
    return true;
  }
  console.error("Signed-in smoke: FAIL\n");
  printManual();
  return false;
}

function printManual() {
  console.log(`Manual signed-in checklist (${base}):
  1. Sign in at /auth/sign-in
  2. Finish /assessment → land on /results with a verdict
  3. Open Companion (bottom-right)
  4. Open /finance and /tools/mortgage
  5. Optional checkout: /pricing (use Stripe test card 4242… on Preview, not live)
`);
}

async function main() {
  if (mode === "help" || mode === "-h" || mode === "--help") {
    console.log(`Usage:
  npm run smoke           Public production smoke (no secrets)
  npm run smoke:auth      Signed-in smoke (SMOKE_EMAIL + SMOKE_PASSWORD)
  npm run smoke:manual    Print the 5-step human checklist

Env:
  SMOKE_BASE_URL          default https://homitechnology.com
  SMOKE_EMAIL             account email
  SMOKE_PASSWORD          account password
`);
    process.exit(0);
  }

  if (mode === "manual") {
    printManual();
    process.exit(0);
  }

  if (mode === "auth" || mode === "signed-in" || mode === "signin") {
    const pub = await publicSmoke();
    const auth = authSmoke();
    process.exit(pub && auth ? 0 : 1);
  }

  // default: public
  const pass = await publicSmoke();
  console.log("Tip: signed-in smoke is one more command after you set two vars:");
  console.log("  $env:SMOKE_EMAIL='…'; $env:SMOKE_PASSWORD='…'; npm run smoke:auth\n");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
