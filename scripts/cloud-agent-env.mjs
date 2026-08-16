#!/usr/bin/env node
/**
 * Cursor Cloud Agent env reconciliation.
 *
 * Distinguishes BOOTABLE from ISOLATED:
 *   BUILD-SAFE      — no privileged credentials; inert local Supabase URL
 *   FULL-STACK DEV  — complete dedicated DEV trio injected
 *
 * Never falls back to HōMI production. Partial credential sets fail closed.
 * Human-authored .env.local is never overwritten. Managed files use a
 * delimited block so extra manual keys survive repeated starts.
 *
 * This file is Cloud-specific. It must never print secret values.
 */
import { copyFileSync, existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const PRODUCTION_SUPABASE_HOST = "giyycykxkzfbowiapxpd.supabase.co";
export const BUILD_SAFE_SUPABASE_URL = "http://127.0.0.1:54321";
/** Syntactically present, not a credential. createAdminClient requires a key. */
export const BUILD_SAFE_ANON_KEY =
  "eyJhbGciOiJub25lIn0.build-safe-anon-not-a-credential";
export const MANAGED_BEGIN = "# BEGIN HōMI CURSOR CLOUD MANAGED";
export const MANAGED_END = "# END HōMI CURSOR CLOUD MANAGED";

const OPTIONAL_PASSTHROUGH = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PLUS",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_FAMILY",
  "PLAID_CLIENT_ID",
  "PLAID_SECRET",
  "PLAID_ENV",
  "PLAID_TOKEN_KEY",
  "E2E_SUPABASE_URL",
  "E2E_SUPABASE_SERVICE_ROLE_KEY",
  "E2E_STRIPE_SECRET_KEY",
  "E2E_STRIPE_WEBHOOK_SECRET",
  "E2E_STRIPE_PRICE_PLUS",
];

function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname;
    const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return match ? match[1] : host;
  } catch {
    return null;
  }
}

function isProductionSupabase(url) {
  if (!present(url)) return false;
  return url.includes(PRODUCTION_SUPABASE_HOST) || url.includes("giyycykxkzfbowiapxpd");
}

function fail(code, error) {
  return { ok: false, code, error };
}

function replaceManagedBlock(existing, block) {
  const begin = existing.indexOf(MANAGED_BEGIN);
  const end = existing.indexOf(MANAGED_END);
  if (begin === -1 || end === -1 || end < begin) {
    const trimmed = existing.replace(/\s*$/, "");
    return `${trimmed}\n\n${block}\n`;
  }
  const before = existing.slice(0, begin).replace(/\s*$/, "");
  const after = existing.slice(end + MANAGED_END.length).replace(/^\s*/, "");
  const parts = [];
  if (before) parts.push(before);
  parts.push(block);
  if (after) parts.push(after);
  return `${parts.join("\n\n")}\n`;
}

function buildManagedBlock(env, mode) {
  const lines = [
    MANAGED_BEGIN,
    `# mode=${mode}`,
    `# managed-by: scripts/cloud-agent-env.mjs`,
  ];

  if (mode === "FULL-STACK DEV") {
    lines.push(`NEXT_PUBLIC_SUPABASE_URL=${env.NEXT_PUBLIC_SUPABASE_URL.trim()}`);
    lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()}`);
    lines.push(`SUPABASE_SERVICE_ROLE_KEY=${env.SUPABASE_SERVICE_ROLE_KEY.trim()}`);
    for (const key of OPTIONAL_PASSTHROUGH) {
      if (present(env[key])) lines.push(`${key}=${env[key].trim()}`);
    }
  } else {
    lines.push(`NEXT_PUBLIC_SUPABASE_URL=${BUILD_SAFE_SUPABASE_URL}`);
    lines.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${BUILD_SAFE_ANON_KEY}`);
  }

  const site = present(env.NEXT_PUBLIC_SITE_URL)
    ? env.NEXT_PUBLIC_SITE_URL.trim()
    : "http://localhost:3000";
  lines.push(`NEXT_PUBLIC_SITE_URL=${site}`);
  lines.push(MANAGED_END);
  return lines.join("\n");
}

function atomicWrite(file, content) {
  const tmp = `${file}.cloud-tmp`;
  writeFileSync(tmp, content, { encoding: "utf8", mode: 0o600 });
  try {
    renameSync(tmp, file);
  } catch {
    copyFileSync(tmp, file);
    unlinkSync(tmp);
  }
}

/**
 * @typedef {{ ok: false, code: string, error: string }} CloudEnvFailure
 * @typedef {{
 *   ok: true,
 *   mode: "BUILD-SAFE" | "FULL-STACK DEV",
 *   action: "write" | "leave-human",
 *   projectRef: string | null,
 *   log: string
 * }} CloudEnvSuccess
 */

/**
 * Reconcile a Cloud Agent `.env.local`.
 * @param {{ envFile: string, env: Record<string, string | undefined> }} args
 * @returns {CloudEnvFailure | CloudEnvSuccess}
 */
export function reconcileCloudEnv({ envFile, env }) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const presentCount = [url, anon, service].filter(present).length;

  if (presentCount > 0 && presentCount < 3) {
    return fail(
      "INCOMPLETE_DEV_SUPABASE",
      "incomplete DEV Supabase credential set; refusing mixed environment",
    );
  }

  if (presentCount === 3 && isProductionSupabase(url)) {
    return fail(
      "PRODUCTION_DENIED",
      "Cloud Agent must not target the production Supabase project",
    );
  }

  const stripe = env.STRIPE_SECRET_KEY ?? "";
  if (present(stripe) && stripe.trim().startsWith("sk_live_")) {
    return fail("LIVE_INTEGRATION_DENIED", "live Stripe keys are not allowed in Cloud Agent");
  }
  const e2eStripe = env.E2E_STRIPE_SECRET_KEY ?? "";
  if (present(e2eStripe) && e2eStripe.trim().startsWith("sk_live_")) {
    return fail("LIVE_INTEGRATION_DENIED", "live Stripe keys are not allowed in Cloud Agent");
  }
  const plaidEnv = (env.PLAID_ENV ?? "").trim().toLowerCase();
  if (plaidEnv === "production") {
    return fail("LIVE_INTEGRATION_DENIED", "Plaid production is not allowed in Cloud Agent");
  }

  const mode = presentCount === 3 ? "FULL-STACK DEV" : "BUILD-SAFE";
  const projectRef = mode === "FULL-STACK DEV" ? projectRefFromUrl(url.trim()) : null;

  let existing = "";
  let fileExists = false;
  if (existsSync(envFile)) {
    existing = readFileSync(envFile, "utf8");
    fileExists = true;
  }

  const empty = fileExists && existing.trim() === "";
  const hasManaged = existing.includes(MANAGED_BEGIN) && existing.includes(MANAGED_END);

  if (fileExists && !empty && !hasManaged) {
    return {
      ok: true,
      mode,
      action: "leave-human",
      projectRef,
      log: "cloud-agent-env: existing hand-authored .env.local detected — leaving it untouched.",
    };
  }

  const block = buildManagedBlock(env, mode);
  const next = hasManaged ? replaceManagedBlock(existing, block) : `${block}\n`;
  atomicWrite(envFile, next);

  const log =
    mode === "FULL-STACK DEV"
      ? `cloud-agent-env: FULL-STACK DEV (${projectRef ?? "dev"}) — dedicated project only.`
      : "cloud-agent-env: BUILD-SAFE mode active — no production backend, no service-role key.";

  return { ok: true, mode, action: "write", projectRef, log };
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const cwd = process.cwd();
  const envFile = join(cwd, ".env.local");
  if (argv.includes("--help")) {
    process.stdout.write(
      "Usage: node scripts/cloud-agent-env.mjs\nReconcile .env.local for Cursor Cloud (BUILD-SAFE | FULL-STACK DEV).\n",
    );
    return 0;
  }
  const result = reconcileCloudEnv({ envFile, env });
  if (!result.ok) {
    process.stderr.write(`cloud-agent-env: ${result.code} — ${result.error}\n`);
    return 1;
  }
  process.stdout.write(`${result.log}\n`);
  return 0;
}

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolve(process.argv[1]) : "";
if (invoked && pathToFileURL(invoked).href === pathToFileURL(thisFile).href) {
  process.exitCode = main();
}


