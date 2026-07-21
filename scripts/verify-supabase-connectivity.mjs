#!/usr/bin/env node
/**
 * Tier 2 Supabase smoke check — no service-role key required.
 *
 * Verifies the anon/publishable client can reach the configured project and
 * read public data (question_bank). Optionally reports whether a real service
 * role key is present (without printing it).
 *
 * Usage:
 *   node scripts/verify-supabase-connectivity.mjs
 *   npm run verify-supabase
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLACEHOLDER_PATTERNS = [/^your-/i, /placeholder/i, /^$/];

function isPlaceholder(value) {
  if (!value) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function fail(msg) {
  console.error(`[verify-supabase] FAIL: ${msg}`);
  process.exit(1);
}

if (!url || !anonKey) {
  fail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "  Copy .env.example → .env.local and fill Tier 1 values (see comments).",
  );
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`[verify-supabase] project: ${url}`);

const { count, error } = await supabase
  .from("question_bank")
  .select("id", { count: "exact", head: true });

if (error) fail(`question_bank query: ${error.message}`);
if (count !== 45) {
  console.warn(
    `[verify-supabase] WARN: expected 45 question_bank rows, got ${count ?? "?"}`,
  );
} else {
  console.log("[verify-supabase] OK: question_bank reachable (45 rows)");
}

const { error: profileError } = await supabase.from("profiles").select("id").limit(1);
if (profileError) {
  console.log("[verify-supabase] OK: profiles blocked for anon (RLS)");
} else {
  console.warn(
    "[verify-supabase] WARN: anon can read profiles — review RLS if unexpected",
  );
}

const tier1 = {
  url: !isPlaceholder(url),
  anonKey: !isPlaceholder(anonKey),
  siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
};
const tier2 = {
  serviceRoleKey: !isPlaceholder(serviceKey),
};

console.log("\n[verify-supabase] env tiers:");
console.log(
  `  Tier 1 (client): url=${tier1.url ? "set" : "missing"}, anon=${tier1.anonKey ? "set" : "missing"}, site=${tier1.siteUrl ? "set" : "missing"}`,
);
console.log(
  `  Tier 2 (server): service_role=${tier2.serviceRoleKey ? "real" : "placeholder/missing"}`,
);

if (!tier2.serviceRoleKey) {
  console.log(
    "\n[verify-supabase] Tier 2 blocked — add SUPABASE_SERVICE_ROLE_KEY from\n" +
      "  Supabase Dashboard → Settings → API to unlock:\n" +
      "    • npm run create-admin\n" +
      "    • live Playwright specs (E2E_SUPABASE_SERVICE_ROLE_KEY)\n" +
      "    • server routes using the admin client",
  );
  process.exit(0);
}

console.log("\n[verify-supabase] Tier 2 service role present — run npm run create-admin if needed.");
