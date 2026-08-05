#!/usr/bin/env node
/**
 * Mark local sequential migrations 00001..00041 as applied remotely.
 *
 * Context: the production Supabase project's `supabase_migrations.schema_migrations`
 * table records the rebuilt schema under timestamped versions (20260706*…), so the
 * local `00001_*`…`00041_*` files show as "not applied remotely". Those migrations
 * are already applied (they are the same schema, just renumbered/squashed during the
 * finance-launch cleanup). This script records the local version strings as applied
 * via `supabase migration repair --status applied` so future `supabase db push` /
 * `migration list` runs reconcile cleanly.
 *
 * Note on 00020a: `00020a_profiles_privilege_guard.sql` has a non-standard version
 * string that the Supabase CLI rejects. It was renamed to
 * `20260804000002_profiles_privilege_guard.sql` and marked applied separately.
 * This script skips any non-numeric filename prefix and warns about it.
 *
 * Usage:
 *   node scripts/mark-local-migrations-applied.mjs
 *   node scripts/mark-local-migrations-applied.mjs --dry-run
 */

import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase", "migrations");
const DRY_RUN = process.argv.includes("--dry-run");

// Pure numeric sequential versions only. Non-numeric suffixes (e.g. 00020a) must
// be handled outside this script because `supabase migration repair` rejects them.
const MIGRATION_FILE_RE = /^(\d+)_(.+)\.sql$/i;
const RANGE_MIN = 1;
const RANGE_MAX = 41;

if (!existsSync(MIGRATIONS_DIR)) {
  console.error(
    `[mark-local-migrations-applied] Migrations directory not found: ${MIGRATIONS_DIR}`,
  );
  process.exit(1);
}

function parseMigrationFile(filename) {
  const match = filename.match(MIGRATION_FILE_RE);
  if (!match) return null;
  const version = match[1];
  const name = match[2];
  return { filename, version, name };
}

const allFiles = readdirSync(MIGRATIONS_DIR)
  .map(parseMigrationFile)
  .filter(Boolean)
  .filter((m) => {
    const numeric = parseInt(m.version, 10);
    return !Number.isNaN(numeric) && numeric >= RANGE_MIN && numeric <= RANGE_MAX;
  })
  .sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));

const nonNumericFiles = readdirSync(MIGRATIONS_DIR).filter((f) => {
  const match = f.match(/^\d+[a-z]_.+\.sql$/i);
  if (!match) return false;
  const numeric = parseInt(match[1], 10);
  return !Number.isNaN(numeric) && numeric >= RANGE_MIN && numeric <= RANGE_MAX;
});

if (allFiles.length === 0) {
  console.log("[mark-local-migrations-applied] No 00001..00041 migrations found.");
  process.exit(0);
}

console.log(
  `[mark-local-migrations-applied] ${DRY_RUN ? "DRY RUN — no writes" : "LIVE RUN"}`,
);
console.log(
  `[mark-local-migrations-applied] will mark ${allFiles.length} version(s) as applied`,
);

if (nonNumericFiles.length > 0) {
  console.log(
    `[mark-local-migrations-applied] warning: ${nonNumericFiles.length} non-numeric filename(s) skipped — handle manually:`,
  );
  for (const f of nonNumericFiles) {
    console.log(`  - ${f}`);
  }
}

let applied = 0;
let failed = 0;

for (const m of allFiles) {
  const cmd = `supabase migration repair --status applied ${m.version}`;
  if (DRY_RUN) {
    console.log(`[dry-run] would run: ${cmd}`);
    applied++;
    continue;
  }

  try {
    execSync(cmd, { stdio: "pipe", cwd: process.cwd() });
    console.log(`[mark-local-migrations-applied] marked ${m.version} (${m.name}) applied`);
    applied++;
  } catch (err) {
    const stderr = err.stderr?.toString() ?? err.message;
    console.error(
      `[mark-local-migrations-applied] FAILED ${m.version}: ${stderr.trim()}`,
    );
    failed++;
  }
}

console.log("\n[mark-local-migrations-applied] summary:");
console.log(`  versions processed: ${allFiles.length}`);
console.log(`  marked applied:     ${applied}`);
if (failed > 0) {
  console.log(`  failed:             ${failed}`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(
    "\n[mark-local-migrations-applied] dry-run complete. Rerun without --dry-run to write.",
  );
} else {
  console.log(
    "\n[mark-local-migrations-applied] done. Verify with: supabase migration list",
  );
}
