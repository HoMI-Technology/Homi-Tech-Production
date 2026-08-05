#!/usr/bin/env node
/**
 * scripts/backfill-plaid-to-ledger.mjs
 *
 * One-time, idempotent backfill of existing `plaid_transactions` rows into
 * `finance_transactions`. New Plaid sync windows already write to the ledger via
 * `lib/plaid/sync.ts` (`syncItemToLedger`); this script catches up historical rows.
 *
 * Idempotency: before inserting, the script loads every active (`deleted_at is null`,
 * `source = 'plaid'`) `finance_transactions.external_transaction_id` and skips any
 * Plaid row whose `transaction_id` is already present.
 *
 * Run:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/backfill-plaid-to-ledger.mjs
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/backfill-plaid-to-ledger.mjs --dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/backfill-plaid-to-ledger.mjs --batch-size 250
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_REF = "giyycykxkzfbowiapxpd";
const DEFAULT_BATCH_SIZE = 500;
const READ_PAGE_SIZE = 1000;

const DRY_RUN = process.argv.includes("--dry-run");

function parseBatchSize() {
  const idx = process.argv.indexOf("--batch-size");
  if (idx === -1 || idx + 1 >= process.argv.length) return DEFAULT_BATCH_SIZE;
  const n = Number(process.argv[idx + 1]);
  if (!Number.isFinite(n) || n < 1 || n > 10000) {
    throw new Error(`Invalid --batch-size: ${process.argv[idx + 1]}`);
  }
  return Math.floor(n);
}

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

// IMPORTANT: Do not process.exit() at module load. This file is imported by
// unit tests for pure mapping helpers; CLI-only env checks belong in main().
function resolveSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    `https://${PROJECT_REF}.supabase.co`
  );
}

// =============================================================================
// Category mapping
// =============================================================================

/**
 * Duplicate of the mapping in `lib/plaid/sync.ts`.
 * MUST stay in sync with `lib/plaid/sync.ts` (`PLAID_CATEGORY_TO_SLUG`).
 */
export const PLAID_CATEGORY_TO_SLUG = {
  BANK_FEES: "other",
  ENTERTAINMENT: "entertainment",
  FOOD_AND_DRINK: "dining",
  GENERAL_MERCHANDISE: "personal",
  GENERAL_SERVICES: "personal",
  GIFTS_AND_DONATIONS: "giving",
  GOVERNMENT_AND_NON_PROFIT: "giving",
  HOME_IMPROVEMENT: "housing",
  HOUSING: "housing",
  INSURANCE: "insurance",
  LOAN_PAYMENTS: "debt-payments",
  MEDICAL: "healthcare",
  PERSONAL_CARE: "personal",
  RENT_AND_UTILITIES: "utilities",
  TRANSPORTATION: "transportation",
  TRAVEL: "travel",
  EDUCATION: "other",
  INCOME: "other-income",
};

/**
 * Duplicate of `lib/plaid/sync.ts` `mapPlaidCategoryToFinanceCategory`.
 * MUST stay in sync with the TypeScript source.
 */
export function mapPlaidCategoryToFinanceCategory(plaidCategory, slugToId) {
  if (!plaidCategory) return null;
  const slug = PLAID_CATEGORY_TO_SLUG[plaidCategory];
  if (!slug) return null;
  return slugToId.get(slug) ?? null;
}

// =============================================================================
// Row mapping
// =============================================================================

/**
 * Maps one `plaid_transactions` row to a `finance_transactions` insert row.
 * Mirrors the mapping inside `lib/plaid/sync.ts#syncItemToLedger`.
 */
export function mapPlaidRowToFinanceTransaction(row, slugToId, nowIso) {
  const amount = Number(row.amount);
  if (!Number.isFinite(amount)) {
    throw new Error(`Non-numeric amount for transaction ${row.transaction_id}: ${row.amount}`);
  }
  if (amount === 0) {
    return null;
  }

  const type = amount > 0 ? "expense" : "income";
  const amountCents = Math.round(Math.abs(amount) * 100);
  const isPending = row.pending === true;
  const description = String(row.name ?? row.merchant_name ?? "Plaid transaction").slice(0, 160);
  const merchantName = row.merchant_name ? String(row.merchant_name).slice(0, 160) : null;
  const categoryId = mapPlaidCategoryToFinanceCategory(row.category, slugToId);
  const txnDate = row.txn_date ?? nowIso.slice(0, 10);

  return {
    id: randomUUID(),
    user_id: row.user_id,
    source: "plaid",
    external_transaction_id: row.transaction_id,
    status: isPending ? "pending" : "posted",
    type,
    amount_cents: amountCents,
    currency: "USD",
    transaction_date: txnDate,
    posted_at: isPending ? null : nowIso,
    description,
    merchant_name: merchantName,
    category_id: categoryId,
    is_excluded_from_budget: false,
    updated_at: nowIso,
  };
}

/**
 * Pure helper: turns a batch of Plaid rows into finance rows, skipping rows
 * whose `transaction_id` is already present in the ledger.
 */
export function buildFinanceRows(plaidRows, existingExternalIds, slugToId, nowIso) {
  const toInsert = [];
  let skippedExisting = 0;
  let skippedZero = 0;

  for (const row of plaidRows) {
    if (existingExternalIds.has(row.transaction_id)) {
      skippedExisting += 1;
      continue;
    }
    const mapped = mapPlaidRowToFinanceTransaction(row, slugToId, nowIso);
    if (mapped === null) {
      skippedZero += 1;
      continue;
    }
    toInsert.push(mapped);
  }

  return { toInsert, skippedExisting, skippedZero };
}

// =============================================================================
// Supabase I/O
// =============================================================================

async function fetchSystemCategories(supabase) {
  const { data, error } = await supabase
    .from("finance_categories")
    .select("id, slug")
    .eq("is_system", true);
  if (error) {
    throw new Error(`finance_categories lookup failed: ${error.message}`);
  }
  return new Map((data ?? []).map((c) => [c.slug, c.id]));
}

async function fetchExistingExternalIds(supabase) {
  const existing = new Set();
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("finance_transactions")
      .select("external_transaction_id")
      .eq("source", "plaid")
      .is("deleted_at", null)
      .not("external_transaction_id", "is", null)
      .order("external_transaction_id")
      .range(offset, offset + READ_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`finance_transactions existing lookup failed: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.external_transaction_id) existing.add(row.external_transaction_id);
    }
    if (data.length < READ_PAGE_SIZE) break;
    offset += READ_PAGE_SIZE;
  }
  return existing;
}

async function fetchPlaidTransactionBatch(supabase, from, to) {
  const { data, error } = await supabase
    .from("plaid_transactions")
    .select("user_id, transaction_id, amount, txn_date, name, merchant_name, category, pending")
    .order("id")
    .range(from, to);
  if (error) {
    throw new Error(`plaid_transactions read failed: ${error.message}`);
  }
  return data ?? [];
}

// =============================================================================
// Core backfill
// =============================================================================

/**
 * Runs the backfill against the provided Supabase service-role client.
 * Exported so the mapping/dedupe logic can be unit-tested in isolation.
 */
export async function runBackfill(supabase, { dryRun = false, batchSize = DEFAULT_BATCH_SIZE } = {}) {
  const nowIso = new Date().toISOString();
  const slugToId = await fetchSystemCategories(supabase);

  console.log(`[backfill] loaded ${slugToId.size} system categories`);

  const existingExternalIds = await fetchExistingExternalIds(supabase);
  console.log(`[backfill] found ${existingExternalIds.size} existing active Plaid ledger rows`);

  let readTotal = 0;
  let skippedExisting = 0;
  let skippedZero = 0;
  let inserted = 0;
  let errors = 0;
  const preview = [];
  let offset = 0;

  for (;;) {
    const rows = await fetchPlaidTransactionBatch(supabase, offset, offset + READ_PAGE_SIZE - 1);
    if (rows.length === 0) break;

    readTotal += rows.length;
    const { toInsert, skippedExisting: batchExisting, skippedZero: batchZero } = buildFinanceRows(
      rows,
      existingExternalIds,
      slugToId,
      nowIso,
    );
    skippedExisting += batchExisting;
    skippedZero += batchZero;

    if (dryRun) {
      for (const row of toInsert) {
        if (preview.length < 3) preview.push(row);
      }
      console.log(
        `[backfill] DRY-RUN read=${readTotal} batch=${rows.length} ` +
          `wouldInsert=${toInsert.length} skippedExisting=${batchExisting} skippedZero=${batchZero}`,
      );
    } else {
      console.log(
        `[backfill] read=${readTotal} batch=${rows.length} ` +
          `queueing=${toInsert.length} skippedExisting=${batchExisting} skippedZero=${batchZero}`,
      );

      for (let i = 0; i < toInsert.length; i += batchSize) {
        const chunk = toInsert.slice(i, i + batchSize);
        try {
          const { error } = await supabase.from("finance_transactions").insert(chunk);
          if (error) throw new Error(error.message);
          inserted += chunk.length;
          console.log(`[backfill] inserted ${chunk.length} rows (total ${inserted})`);
        } catch (err) {
          errors += 1;
          console.error(`[backfill] insert chunk ${i}-${i + chunk.length} failed: ${err.message}`);
        }
      }
    }

    if (rows.length < READ_PAGE_SIZE) break;
    offset += READ_PAGE_SIZE;
  }

  const summary = {
    readTotal,
    skippedExisting,
    skippedZero,
    inserted,
    errors,
    dryRun,
  };

  if (dryRun && preview.length > 0) {
    console.log("[backfill] DRY-RUN sample rows:");
    for (const row of preview) {
      console.log(JSON.stringify(row));
    }
  }

  console.log(
    `[backfill] done read=${readTotal} skippedExisting=${skippedExisting} skippedZero=${skippedZero} ` +
      `inserted=${inserted} errors=${errors}`,
  );

  return summary;
}

// =============================================================================
// CLI entry point
// =============================================================================

async function main() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error(
      "[backfill] Missing SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Set it before running:\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/backfill-plaid-to-ledger.mjs",
    );
    process.exit(1);
  }

  const supabaseUrl = resolveSupabaseUrl();
  const batchSize = parseBatchSize();

  if (DRY_RUN) {
    console.log(`[backfill] DRY-RUN mode: no writes will be performed (batchSize=${batchSize})`);
  } else {
    console.log(`[backfill] LIVE mode (batchSize=${batchSize})`);
  }
  console.log(`[backfill] Supabase URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const summary = await runBackfill(supabase, { dryRun: DRY_RUN, batchSize });

  if (summary.errors > 0) {
    process.exit(1);
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((err) => {
    console.error("[backfill] fatal error:", err.message);
    process.exit(1);
  });
}
