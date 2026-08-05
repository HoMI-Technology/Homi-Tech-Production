#!/usr/bin/env node
/**
 * migrate-goals-to-ledger.mjs
 *
 * One-time migration from the legacy `goals` table (migration 00018) to the
 * finance ledger `finance_savings_goals` table (migration 20260803000001).
 *
 * Reads every legacy row regardless of `kind`, maps it to the ledger shape,
 * and inserts it only when a matching row does not already exist. Existing
 * ledger rows are never overwritten, so the script is idempotent and safe to
 * rerun.
 *
 * Field mapping decisions:
 *   - user_id                         -> user_id (unchanged)
 *   - kind = 'down_payment'           -> goal_type = 'home'
 *   - kind = anything else            -> goal_type = 'custom'
 *   - label                           -> name (falls back to a generated name)
 *   - target_amount (dollars)         -> target_amount_cents (cents)
 *   - target_date                     -> target_date (unchanged)
 *   - created_at / updated_at         -> preserved when present
 *   - current_amount_cents            -> 0 (legacy goals had no balance column)
 *   - planned_monthly_contribution_cents -> 0 (not collected in legacy table)
 *   - status                          -> 'active'
 *
 * Merge behavior: if the user already has an active `finance_savings_goals`
 * row, the legacy goal is merged into it (name, goal_type, target_amount_cents,
 * target_date, updated_at). This avoids violating the one-active-goal unique
 * index. If no active row exists, a new row is inserted.
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-goals-to-ledger.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-goals-to-ledger.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "giyycykxkzfbowiapxpd";

const DRY_RUN = process.argv.includes("--dry-run");

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

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  `https://${PROJECT_REF}.supabase.co`;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error(
    "[migrate-goals] Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set it before running:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/migrate-goals-to-ledger.mjs",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const KIND_TO_GOAL_TYPE = new Map([
  ["down_payment", "home"],
  ["emergency_reserve", "emergency_reserve"],
  ["home", "home"],
  ["vehicle", "vehicle"],
  ["education", "education"],
  ["family", "family"],
  ["travel", "travel"],
  ["custom", "custom"],
]);

function dollarsToCents(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

function mapKindToGoalType(kind) {
  if (!kind) return "custom";
  const normalized = String(kind).toLowerCase().trim();
  return KIND_TO_GOAL_TYPE.get(normalized) || "custom";
}

function deriveName(label, goalType, kind) {
  if (label && String(label).trim()) return String(label).trim().slice(0, 80);
  if (goalType === "home") return "Down payment";
  const titleCase = String(kind || goalType)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return titleCase.slice(0, 80) || "Savings goal";
}

async function loadExistingLedgerGoals() {
  const { data, error } = await supabase
    .from("finance_savings_goals")
    .select("id, user_id, name, target_date")
    .eq("status", "active");
  if (error) throw new Error(`failed to load finance_savings_goals: ${error.message}`);

  const byUser = new Map();
  for (const row of data || []) {
    // Prefer the first active goal we see per user; there should only be one.
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, row);
  }
  return byUser;
}

async function main() {
  if (DRY_RUN) {
    console.log("[migrate-goals] DRY-RUN mode: no writes will be performed");
  }

  const { data: legacyRows, error: legacyError } = await supabase
    .from("goals")
    .select("id, user_id, kind, label, target_amount, target_date, created_at, updated_at");

  if (legacyError) {
    throw new Error(`failed to load goals: ${legacyError.message}`);
  }

  if (!legacyRows || legacyRows.length === 0) {
    console.log("[migrate-goals] no legacy goals found; nothing to migrate");
    return;
  }

  console.log(`[migrate-goals] loaded ${legacyRows.length} legacy goal(s)`);

  const existingActiveByUser = await loadExistingLedgerGoals();

  let skipped = 0;
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const row of legacyRows) {
    const prefix = `[migrate-goals ${row.id ?? "?"}]`;
    const goalType = mapKindToGoalType(row.kind);
    const name = deriveName(row.label, goalType, row.kind);
    const targetAmountCents = dollarsToCents(row.target_amount);

    if (targetAmountCents === null || targetAmountCents <= 0) {
      console.log(`${prefix} SKIP invalid target_amount: ${row.target_amount}`);
      skipped += 1;
      continue;
    }

    const existingActive = existingActiveByUser.get(row.user_id);

    if (existingActive) {
      // Merge legacy goal into the user's existing active ledger goal so we
      // never violate the one-active-goal unique index.
      const patch = {
        name,
        goal_type: goalType,
        target_amount_cents: targetAmountCents,
        target_date: row.target_date ?? null,
        updated_at: row.updated_at ?? new Date().toISOString(),
      };

      if (DRY_RUN) {
        console.log(
          `${prefix} DRY-RUN would update existing active goal ${existingActive.id} ` +
            `for user_id=${row.user_id} name="${name}" ` +
            `goal_type=${goalType} target_cents=${targetAmountCents} ` +
            `target_date=${patch.target_date ?? "null"}`,
        );
        updated += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from("finance_savings_goals")
        .update(patch)
        .eq("id", existingActive.id);
      if (updateError) {
        console.error(`${prefix} ERROR update failed: ${updateError.message}`);
        failed += 1;
        continue;
      }

      updated += 1;
      console.log(
        `${prefix} OK updated existing active goal ${existingActive.id} ` +
          `target_cents=${targetAmountCents} for user ${row.user_id}`,
      );
      continue;
    }

    const newRow = {
      id: randomUUID(),
      user_id: row.user_id,
      name,
      goal_type: goalType,
      target_amount_cents: targetAmountCents,
      current_amount_cents: 0,
      target_date: row.target_date ?? null,
      planned_monthly_contribution_cents: 0,
      status: "active",
      created_at: row.created_at ?? new Date().toISOString(),
      updated_at: row.updated_at ?? new Date().toISOString(),
    };

    if (DRY_RUN) {
      console.log(
        `${prefix} DRY-RUN would insert ` +
          `user_id=${newRow.user_id} name="${newRow.name}" ` +
          `goal_type=${newRow.goal_type} target_cents=${newRow.target_amount_cents} ` +
          `target_date=${newRow.target_date ?? "null"}`,
      );
      inserted += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("finance_savings_goals").insert(newRow);
    if (insertError) {
      console.error(`${prefix} ERROR insert failed: ${insertError.message}`);
      failed += 1;
      continue;
    }

    inserted += 1;
    console.log(
      `${prefix} OK inserted ${newRow.goal_type} goal ` +
        `target_cents=${newRow.target_amount_cents} for user ${newRow.user_id}`,
    );
  }

  console.log(
    `[migrate-goals] done total=${legacyRows.length} inserted=${inserted} updated=${updated} skipped=${skipped} failed=${failed}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[migrate-goals] fatal error:", err.message);
  process.exit(1);
});
