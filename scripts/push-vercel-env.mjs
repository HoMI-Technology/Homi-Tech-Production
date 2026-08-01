#!/usr/bin/env node
/**
 * Push environment variables from .env.local into Vercel
 * ======================================================
 *
 * Values are read from the process environment (i.e. from .env.local via
 * --env-file) and sent straight to Vercel. They are never printed, never passed
 * on a command line, and never written anywhere else — so a secret goes from
 * the gitignored file to Vercel without passing through a terminal or a chat
 * transcript on the way.
 *
 * Requires VERCEL_TOKEN in .env.local — create at
 * https://vercel.com/account/tokens, scoped to the team that owns the project.
 *
 * Usage:
 *   node --env-file=.env.local scripts/push-vercel-env.mjs SENTRY_DSN
 *   node --env-file=.env.local scripts/push-vercel-env.mjs SENTRY_DSN POSTHOG_PROJECT_ID
 *   node --env-file=.env.local scripts/push-vercel-env.mjs --targets production SOME_VAR
 *
 * Defaults to writing BOTH production and preview, because the single most
 * common env mistake in this project has been setting a variable in Production
 * only (see docs/ops/VERCEL-ENV-AUDIT-2026-08-01.md).
 *
 * Idempotent: upserts, so re-running with a rotated value updates in place.
 */

import { readFileSync } from "node:fs";

const VALID_TARGETS = ["production", "preview", "development"];

function parseArgs(argv) {
  const names = [];
  let targets = ["production", "preview"];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--targets") {
      const raw = argv[++i];
      if (!raw) fail("--targets needs a comma-separated value");
      targets = raw.split(",").map((t) => t.trim());
      const bad = targets.filter((t) => !VALID_TARGETS.includes(t));
      if (bad.length) fail(`unknown target(s): ${bad.join(", ")}`);
    } else if (argv[i].startsWith("-")) {
      fail(`unknown flag: ${argv[i]}`);
    } else {
      names.push(argv[i]);
    }
  }
  return { names, targets };
}

function fail(msg) {
  console.error(`[push-vercel-env] ${msg}`);
  process.exit(1);
}

const token = process.env.VERCEL_TOKEN;
if (!token) {
  fail(
    "Missing VERCEL_TOKEN.\n" +
      "  Create one at https://vercel.com/account/tokens (scope it to the team\n" +
      "  that owns this project), add it to .env.local as VERCEL_TOKEN=..., then\n" +
      "  run with:  node --env-file=.env.local scripts/push-vercel-env.mjs <NAME>",
  );
}

const { names, targets } = parseArgs(process.argv.slice(2));
if (names.length === 0) {
  fail("no variable names given. Example: ... push-vercel-env.mjs SENTRY_DSN");
}

let project;
try {
  project = JSON.parse(readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"));
} catch {
  fail("could not read .vercel/project.json — run `vercel link` first");
}
const { projectId, orgId } = project;

// Refuse to push a name whose value is absent, rather than silently writing "".
const missing = names.filter((n) => !process.env[n]);
if (missing.length) {
  fail(
    `these have no value in the environment: ${missing.join(", ")}\n` +
      "  Add them to .env.local (one KEY=value per line) and re-run. Did you\n" +
      "  remember --env-file=.env.local?",
  );
}

async function upsert(key, value) {
  const url =
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env` +
    `?upsert=true&teamId=${encodeURIComponent(orgId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, type: "encrypted", target: targets }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Never echo the value back, even on error.
    throw new Error(`${res.status} ${body?.error?.message ?? JSON.stringify(body)}`);
  }
  return body;
}

console.log(`[push-vercel-env] project ${projectId}  targets: ${targets.join(", ")}\n`);

let failures = 0;
for (const key of names) {
  try {
    await upsert(key, process.env[key]);
    console.log(`  ok    ${key.padEnd(32)} -> ${targets.join(", ")}`);
  } catch (err) {
    console.error(`  FAIL  ${key.padEnd(32)} ${err.message}`);
    failures++;
  }
}

console.log("");
if (failures) {
  console.error(`[push-vercel-env] ${failures} failed.`);
  process.exit(1);
}
console.log("[push-vercel-env] Done. Values take effect on the next deployment.");
console.log("Verify names with: vercel env ls");
