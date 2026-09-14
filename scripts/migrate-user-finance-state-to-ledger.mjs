#!/usr/bin/env node
/**
 * migrate-user-finance-state-to-ledger.mjs
 *
 * One-time migration from the legacy `user_finance_state.state` JSON blob to the
 * finance ledger tables (`finance_budget_periods`, `finance_categories`,
 * `finance_transactions`, `finance_savings_goals`).
 *
 * Idempotent — never double-seeds:
 *   1. A per-user marker row in `finance_mutation_idempotency`
 *      (idempotency_key = "legacy-migration-v1") is written after a successful
 *      import. Users with a marker are skipped on every later run — including
 *      users who soft-deleted their imported rows afterwards (deleted rows are
 *      audit history, not an invitation to reseed).
 *   2. Users with pre-existing ledger rows but NO marker (partial earlier run
 *      or organically created data) are skipped and reported as CONFLICT for
 *      manual review — never silently topped up, never double-written.
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-user-finance-state-to-ledger.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-user-finance-state-to-ledger.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "giyycykxkzfbowiapxpd";

const DRY_RUN = process.argv.includes("--dry-run");

/** Per-user marker key in finance_mutation_idempotency (16–200 chars per CHECK). */
const MIGRATION_IDEMPOTENCY_KEY = "legacy-migration-v1";

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
    "[migrate] Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set it before running:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/migrate-user-finance-state-to-ledger.mjs",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SYSTEM_EXPENSE_SLUGS = new Set([
  "housing",
  "utilities",
  "groceries",
  "dining",
  "transportation",
  "insurance",
  "healthcare",
  "debt-payments",
  "family-childcare",
  "subscriptions",
  "personal",
  "entertainment",
  "travel",
  "giving",
  "other",
]);

const CATEGORY_SYNONYMS = new Map([
  ["rent", "housing"],
  ["rent-mortgage", "housing"],
  ["rent-morgage", "housing"],
  ["mortgage", "housing"],
  ["food", "groceries"],
  ["foods", "groceries"],
  ["everything-else", "other"],
  ["everything", "other"],
  ["misc", "other"],
  ["miscellaneous", "other"],
  ["miscelanious", "other"],
]);

function normalizeSlug(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeName(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function dollarsToCents(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

async function countUserRows(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`${table} count failed: ${error.message}`);
  return count || 0;
}

/** True when this user's one-time import already completed (marker row). */
async function hasMigrationMarker(userId) {
  const { data, error } = await supabase
    .from("finance_mutation_idempotency")
    .select("idempotency_key")
    .eq("user_id", userId)
    .eq("idempotency_key", MIGRATION_IDEMPOTENCY_KEY)
    .maybeSingle();
  if (error) throw new Error(`marker check failed: ${error.message}`);
  return data !== null;
}

/** Writes the migrated-at marker. Conflict-tolerant: a racing rerun is fine. */
async function writeMigrationMarker(userId, budgetPeriodId, summary) {
  const { error } = await supabase.from("finance_mutation_idempotency").upsert(
    {
      user_id: userId,
      idempotency_key: MIGRATION_IDEMPOTENCY_KEY,
      resource_type: "budget_period",
      resource_id: budgetPeriodId,
      response_status: 200,
      response_body: { migratedFrom: "user_finance_state", ...summary },
    },
    { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
  );
  if (error) throw new Error(`marker write failed: ${error.message}`);
}

async function fetchSystemCategories() {
  const { data, error } = await supabase
    .from("finance_categories")
    .select("id, slug, name, category_type")
    .eq("is_system", true);
  if (error) throw new Error(`failed to load system categories: ${error.message}`);

  const bySlug = new Map();
  const byNormalizedName = new Map();
  for (const cat of data || []) {
    bySlug.set(cat.slug, cat);
    byNormalizedName.set(normalizeName(cat.name), cat);
  }
  return { bySlug, byNormalizedName };
}

function resolveLegacyCategory(legacy, systemBySlug, systemByNormalizedName) {
  const slug = normalizeSlug(legacy.name);
  const name = normalizeName(legacy.name);

  if (slug && systemBySlug.has(slug)) return systemBySlug.get(slug);
  if (name && systemBySlug.has(name)) return systemBySlug.get(name);
  if (name && systemByNormalizedName.has(name)) return systemByNormalizedName.get(name);

  const synonym = CATEGORY_SYNONYMS.get(slug) || CATEGORY_SYNONYMS.get(name);
  if (synonym && systemBySlug.has(synonym)) return systemBySlug.get(synonym);

  return null;
}

async function migrateUser(
  userId,
  state,
  { systemBySlug, systemByNormalizedName, periodStart, periodEnd },
) {
  const prefix = `[migrate ${userId}]`;

  try {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      console.log(`${prefix} SKIP invalid or missing state`);
      return { status: "skipped" };
    }

    // Marker first: a completed import is never repeated, even if the user
    // later soft-deleted the imported rows.
    if (await hasMigrationMarker(userId)) {
      console.log(`${prefix} SKIP already migrated (marker ${MIGRATION_IDEMPOTENCY_KEY})`);
      return { status: "skipped" };
    }

    const [txCount, bpCount, sgCount] = await Promise.all([
      countUserRows("finance_transactions", userId),
      countUserRows("finance_budget_periods", userId),
      countUserRows("finance_savings_goals", userId),
    ]);

    if (txCount > 0 || bpCount > 0 || sgCount > 0) {
      // Ledger rows without a marker = organic data or a partial earlier run.
      // Loud skip for manual review — never silently top up or double-write.
      console.log(
        `${prefix} CONFLICT ledger rows exist without migration marker ` +
          `(transactions=${txCount}, budget_periods=${bpCount}, savings_goals=${sgCount}) — manual review`,
      );
      return { status: "conflict" };
    }

    const expectedIncomeCents = dollarsToCents(state.monthlyIncome);
    const budgetPeriodId = randomUUID();
    const budgetPeriod = {
      id: budgetPeriodId,
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      expected_income_cents: expectedIncomeCents > 0 ? expectedIncomeCents : null,
      status: "open",
    };

    const { data: existingUserCategories } = await supabase
      .from("finance_categories")
      .select("id, slug")
      .eq("user_id", userId)
      .eq("is_system", false);

    const userCategoryBySlug = new Map();
    for (const cat of existingUserCategories || []) {
      userCategoryBySlug.set(cat.slug, cat);
    }

    const expenseCategories = Array.isArray(state.expenseCategories) ? state.expenseCategories : [];

    const unmatched = [];
    const categoryMappings = [];

    for (const legacy of expenseCategories) {
      if (!legacy || typeof legacy !== "object") continue;
      const resolved = resolveLegacyCategory(legacy, systemBySlug, systemByNormalizedName);
      if (resolved) {
        categoryMappings.push({ legacy, category: resolved });
      } else {
        unmatched.push(legacy);
      }
    }

    const newUserCategories = [];
    const seenUserSlugs = new Set();
    for (const legacy of unmatched) {
      const slug = normalizeSlug(legacy.name) || "uncategorized";
      if (userCategoryBySlug.has(slug)) {
        categoryMappings.push({ legacy, category: userCategoryBySlug.get(slug) });
        continue;
      }
      if (seenUserSlugs.has(slug)) {
        const existing = newUserCategories.find((c) => c.slug === slug);
        categoryMappings.push({ legacy, category: { id: existing.id, slug: existing.slug } });
        continue;
      }
      seenUserSlugs.add(slug);
      const category = {
        id: randomUUID(),
        user_id: userId,
        name: String(legacy.name || "Uncategorized").slice(0, 80),
        slug,
        category_type: "expense",
        essentiality: "unclassified",
        is_system: false,
        is_archived: false,
      };
      newUserCategories.push(category);
      categoryMappings.push({ legacy, category: { id: category.id, slug: category.slug } });
    }

    if (DRY_RUN) {
      console.log(
        `${prefix} DRY-RUN would create budget_period ${periodStart}..${periodEnd}, ` +
          `income_cents=${expectedIncomeCents}, ` +
          `new_user_categories=${newUserCategories.length}, ` +
          `expense_mappings=${categoryMappings.length}`,
      );
    } else {
      const { error: bpError } = await supabase.from("finance_budget_periods").insert(budgetPeriod);
      if (bpError) throw new Error(`budget_period insert failed: ${bpError.message}`);

      if (newUserCategories.length > 0) {
        const { error: catError } = await supabase
          .from("finance_categories")
          .insert(newUserCategories);
        if (catError) throw new Error(`user category insert failed: ${catError.message}`);
      }
    }

    const payrollCategory = systemBySlug.get("payroll");
    if (!payrollCategory) {
      throw new Error("system payroll category not found");
    }

    const transactions = [];
    const postedAt = new Date().toISOString();

    if (expectedIncomeCents > 0) {
      transactions.push({
        id: randomUUID(),
        user_id: userId,
        type: "income",
        status: "posted",
        amount_cents: expectedIncomeCents,
        currency: "USD",
        description: "Monthly income",
        merchant_name: null,
        category_id: payrollCategory.id,
        account_id: null,
        transaction_date: periodStart,
        posted_at: postedAt,
        source: "migration",
        external_transaction_id: null,
        recurring_rule_id: null,
        transfer_group_id: null,
        parent_transaction_id: null,
        is_excluded_from_budget: false,
        user_note: "Migrated from legacy finance state",
      });
    }

    for (const { legacy, category } of categoryMappings) {
      const amountCents = dollarsToCents(legacy.amount);
      if (amountCents <= 0) continue;
      transactions.push({
        id: randomUUID(),
        user_id: userId,
        type: "expense",
        status: "posted",
        amount_cents: amountCents,
        currency: "USD",
        description: legacy.name || "Expense",
        merchant_name: null,
        category_id: category.id,
        account_id: null,
        transaction_date: periodStart,
        posted_at: postedAt,
        source: "migration",
        external_transaction_id: null,
        recurring_rule_id: null,
        transfer_group_id: null,
        parent_transaction_id: null,
        is_excluded_from_budget: false,
        user_note: null,
      });
    }

    if (DRY_RUN) {
      console.log(
        `${prefix} DRY-RUN would insert ${transactions.length} transactions ` +
          `(${transactions.filter((t) => t.type === "income").length} income, ` +
          `${transactions.filter((t) => t.type === "expense").length} expense)`,
      );
    } else if (transactions.length > 0) {
      const { error: txError } = await supabase.from("finance_transactions").insert(transactions);
      if (txError) throw new Error(`transaction insert failed: ${txError.message}`);
    }

    const downPaymentCents = dollarsToCents(state.downPaymentTarget);
    const liquidSavingsCents = dollarsToCents(state.liquidSavings);
    let savingsGoalResult = null;

    if (downPaymentCents > 0 || liquidSavingsCents > 0) {
      const goalType = downPaymentCents > 0 ? "home" : "emergency_reserve";
      const targetCents = downPaymentCents > 0 ? downPaymentCents : liquidSavingsCents;
      const currentCents = Math.max(0, liquidSavingsCents);
      const name = goalType === "home" ? "Down payment" : "Emergency reserve";

      const savingsGoal = {
        id: randomUUID(),
        user_id: userId,
        name,
        goal_type: goalType,
        target_amount_cents: targetCents,
        current_amount_cents: currentCents,
        status: "active",
      };

      if (DRY_RUN) {
        console.log(
          `${prefix} DRY-RUN would insert savings_goal type=${goalType} ` +
            `target_cents=${targetCents} current_cents=${currentCents}`,
        );
      } else {
        const { error: sgError } = await supabase.from("finance_savings_goals").insert(savingsGoal);
        if (sgError) throw new Error(`savings goal insert failed: ${sgError.message}`);
        savingsGoalResult = savingsGoal;
      }
    }

    if (DRY_RUN) {
      return { status: "dry-run", budgetPeriod, transactions, savingsGoalResult };
    }

    // Marker LAST: only a fully completed import earns it, so a failure
    // mid-user leaves no marker and the rerun is the CONFLICT path (loud).
    await writeMigrationMarker(userId, budgetPeriodId, {
      periodStart,
      periodEnd,
      transactionCount: transactions.length,
      newUserCategoryCount: newUserCategories.length,
      savingsGoal: savingsGoalResult ? savingsGoalResult.goal_type : null,
    });

    console.log(
      `${prefix} OK budget_period=${budgetPeriodId}, transactions=${transactions.length}, ` +
        `new_categories=${newUserCategories.length}, savings_goal=${savingsGoalResult ? "yes" : "no"}`,
    );
    return { status: "ok" };
  } catch (err) {
    console.error(`${prefix} ERROR ${err.message}`);
    return { status: "error", error: err };
  }
}

async function main() {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);

  const { bySlug: systemBySlug, byNormalizedName: systemByNormalizedName } =
    await fetchSystemCategories();

  for (const slug of SYSTEM_EXPENSE_SLUGS) {
    if (!systemBySlug.has(slug)) {
      throw new Error(`system expense category missing: ${slug}`);
    }
  }
  if (!systemBySlug.has("payroll")) {
    throw new Error("system income category missing: payroll");
  }

  if (DRY_RUN) {
    console.log(`[migrate] DRY-RUN mode: no writes will be performed`);
  }
  console.log(`[migrate] migration window: ${periodStart} .. ${periodEnd}`);

  const { data: legacyRows, error: legacyError } = await supabase
    .from("user_finance_state")
    .select("user_id, state");

  if (legacyError) {
    throw new Error(`failed to load user_finance_state: ${legacyError.message}`);
  }

  let processed = 0;
  let skipped = 0;
  let succeeded = 0;
  let failed = 0;
  let conflicts = 0;

  for (const row of legacyRows || []) {
    processed += 1;
    const result = await migrateUser(row.user_id, row.state, {
      systemBySlug,
      systemByNormalizedName,
      periodStart,
      periodEnd,
    });
    if (result.status === "skipped") skipped += 1;
    else if (result.status === "conflict") conflicts += 1;
    else if (result.status === "error") failed += 1;
    else succeeded += 1;
  }

  console.log(
    `[migrate] done processed=${processed} skipped=${skipped} succeeded=${succeeded} ` +
      `conflicts=${conflicts} failed=${failed}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
  if (conflicts > 0) {
    // Not fatal, but loud: these users need a human to reconcile rows that
    // exist without a migration marker before their legacy row can import.
    console.warn(
      `[migrate] WARNING: ${conflicts} user(s) have ledger rows without a migration marker — ` +
        `manual review required (never auto-topped-up).`,
    );
  }
}

main().catch((err) => {
  console.error("[migrate] fatal error:", err.message);
  process.exit(1);
});
