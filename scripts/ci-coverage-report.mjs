/**
 * Honest CI coverage classification for HōMI.
 *
 * A green workflow is not FULL coverage. This script answers:
 *   - Did core (anonymous) E2E have credentials to run? (always, locally)
 *   - Is live Supabase integration configured?
 *   - Is Stripe TEST-mode integration configured?
 *   - Is authenticated Lighthouse configured?
 *
 * Never prints secret values. Exit 0 always (truth is not a failure).
 *
 * Usage:
 *   node scripts/ci-coverage-report.mjs
 *   node scripts/ci-coverage-report.mjs --playwright playwright-results.json
 */

import { readFileSync, appendFileSync } from "node:fs";

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function coverageFromEnv(env = process.env) {
  const supabaseUrl = env.E2E_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = env.E2E_SUPABASE_SERVICE_ROLE_KEY || "";
  const stripeKey = env.E2E_STRIPE_SECRET_KEY || "";
  const stripeWhsec = env.E2E_STRIPE_WEBHOOK_SECRET || "";
  const lhciEmail = env.LHCI_TEST_EMAIL || "";
  const lhciPassword = env.LHCI_TEST_PASSWORD || "";

  const supabase = Boolean(supabaseUrl && supabaseKey);
  const stripeLiveRefused = stripeKey.startsWith("sk_live_");
  const stripe =
    stripeKey.startsWith("sk_test_") && stripeWhsec.startsWith("whsec_");
  const lhci = Boolean(lhciEmail && lhciPassword);

  /** @type {"FULL" | "CORE"} */
  const mode = supabase && stripe ? "FULL" : "CORE";

  return {
    mode,
    supabaseIntegration: supabase ? "CONFIGURED" : "NOT_CONFIGURED",
    stripeIntegration: stripeLiveRefused
      ? "BLOCKED"
      : stripe
        ? "CONFIGURED"
        : "NOT_CONFIGURED",
    authenticatedLighthouse: lhci ? "CONFIGURED" : "NOT_CONFIGURED",
    notes: stripeLiveRefused
      ? ["E2E_STRIPE_SECRET_KEY looks like live mode — suite must refuse it."]
      : [],
  };
}

/**
 * @param {unknown} json
 */
export function summarizePlaywrightJson(json) {
  const stats = json && typeof json === "object" ? json.stats : null;
  if (!stats || typeof stats !== "object") {
    return { present: false, expected: 0, skipped: 0, unexpected: 0 };
  }
  const s = /** @type {{ expected?: number, skipped?: number, unexpected?: number }} */ (
    stats
  );
  return {
    present: true,
    expected: Number(s.expected ?? 0),
    skipped: Number(s.skipped ?? 0),
    unexpected: Number(s.unexpected ?? 0),
  };
}

function loadPlaywright(path) {
  try {
    return summarizePlaywrightJson(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return { present: false, expected: 0, skipped: 0, unexpected: 0 };
  }
}

function formatReport(cov, pw) {
  const lines = [
    `TEST_COVERAGE_MODE=${cov.mode}`,
    `CORE_E2E=${pw.present ? (pw.unexpected > 0 ? "FAIL" : "PASS") : "NOT_CONFIGURED"}`,
    `INTEGRATION_E2E_SUPABASE=${cov.supabaseIntegration}`,
    `INTEGRATION_E2E_STRIPE=${cov.stripeIntegration}`,
    `AUTHENTICATED_LIGHTHOUSE=${cov.authenticatedLighthouse}`,
  ];
  if (pw.present) {
    lines.push(
      `PLAYWRIGHT_EXPECTED=${pw.expected}`,
      `PLAYWRIGHT_SKIPPED=${pw.skipped}`,
      `PLAYWRIGHT_UNEXPECTED=${pw.unexpected}`,
    );
  }
  for (const note of cov.notes) lines.push(`NOTE=${note}`);
  if (cov.mode === "CORE") {
    lines.push(
      "MEANING=CORE means anonymous/public suites may run; live Supabase and/or Stripe TEST suites are not configured and must not be described as FULL.",
    );
  } else {
    lines.push(
      "MEANING=FULL means live Supabase + Stripe TEST-mode secrets are present. Confirm skipped=0 for gated specs in the Playwright report.",
    );
  }
  return lines.join("\n");
}

function writeStepSummary(text) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  const md = [
    "## Coverage truth",
    "",
    "```",
    text,
    "```",
    "",
    "A green badge is not FULL coverage. See `docs/OPERATORS-MANUAL.md` §A.",
    "",
  ].join("\n");
  appendFileSync(summary, md);
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("ci-coverage-report.mjs") ||
    process.argv[1].endsWith("ci-coverage-report.js"));

if (isMain) {
  const pwFlag = process.argv.indexOf("--playwright");
  const pwPath = pwFlag >= 0 ? process.argv[pwFlag + 1] : "";
  const cov = coverageFromEnv();
  const pw = pwPath
    ? loadPlaywright(pwPath)
    : { present: false, expected: 0, skipped: 0, unexpected: 0 };
  const text = formatReport(cov, pw);
  process.stdout.write(`${text}\n`);
  writeStepSummary(text);
}
