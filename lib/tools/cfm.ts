/**
 * Canonical Financial Model (CFM) — Money Reality spine.
 *
 * One shared, source-labeled view of the user's numbers that every lens
 * (calculator) reads from. The CFM is a VIEW, not a second database:
 *
 *   1. Budget ledger (cents) — preferred SoT when the user has real ledger data
 *   2. Legacy finance snapshot (dollars) — fallback during dual-path migration
 *   3. Decision overlay ("homi:tools-state") — price/rate/rent etc., write-back
 *      only on explicit user action ("update my numbers")
 *
 * Honesty contract (same doctrine as the Companion context spine):
 * - The CFM exists only when the user has actually saved money data.
 *   Illustrative defaults are never presented as the user's numbers.
 * - Every field carries a source label:
 *     self-reported — entered on Money (ledger or legacy snapshot)
 *     lens-derived  — captured inside a tool, with the user's consent
 *     missing       — a first-class signal; never imputed
 * - Freshness travels with the model via meta.savedAt.
 *
 * SSR-safe: all storage access is window-guarded, mirroring store.ts.
 * Pure derivation cores take plain objects so they unit-test without storage.
 */

import {
  loadFinanceState,
  hasSavedFinanceState,
  financeSavedAt,
  netCashFlow,
  savingsRate,
  runwayMonths,
  debtToIncome,
  type FinanceState,
} from "@/lib/finance/store";
import {
  activeGoal,
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger, type LiquidSource } from "@/lib/finance/metrics";
import type { FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import { centsToDollars } from "@/lib/finance/money";
import { createSyncedResource, type Stamped } from "@/lib/persistence";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldSource = "self-reported" | "lens-derived" | "missing";

export interface SourcedNumber {
  value: number;
  source: FieldSource;
}

/** Lens-specific fields the finance dashboard does not track. Lenses write
 * these back only on explicit user action — never silently. */
export interface ToolsOverlay {
  targetPrice?: number;
  downPaymentSaved?: number;
  currentRent?: number;
  assumedRatePct?: number;
  termYears?: number;
  taxInsuranceRatePct?: number;
  hoaMonthly?: number;
  homeValue?: number;
  currentMortgageBalance?: number;
  currentMortgageRatePct?: number;
  investedAssets?: number;
  annualContribution?: number;
}

export interface CanonicalFinancialModel {
  core: {
    monthlyIncome: SourcedNumber;
    monthlyExpenses: SourcedNumber;
    monthlyDebtPayments: SourcedNumber;
    liquidSavings: SourcedNumber;
    totalDebt: SourcedNumber;
  };
  housing: {
    targetPrice: SourcedNumber;
    downPaymentSaved: SourcedNumber;
    currentRent: SourcedNumber;
    assumedRatePct: SourcedNumber;
    termYears: SourcedNumber;
    taxInsuranceRatePct: SourcedNumber;
    hoaMonthly: SourcedNumber;
    homeValue: SourcedNumber;
    currentMortgageBalance: SourcedNumber;
    currentMortgageRatePct: SourcedNumber;
  };
  horizon: {
    investedAssets: SourcedNumber;
    annualContribution: SourcedNumber;
    expectedReturnPct: SourcedNumber;
    volatilityPct: SourcedNumber;
  };
  /** Deterministic derivations from the finance store — never stored. */
  derived: {
    netCashFlow: number;
    savingsRatePct: number;
    runwayMonths: number;
    dtiPct: number;
  };
  meta: {
    /** ISO timestamp of the underlying money save — never "now" at read. */
    savedAt: string | null;
    /** ledger preferred; legacy fallback during migration. */
    source?: "ledger" | "legacy";
    completeness?: FinanceCompleteness;
    liquidSource?: LiquidSource;
    /** True when debt service was observed; false means DTI is not trustworthy. */
    hasDebtSignal?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Pure derivation core (unit-testable without storage)
// ---------------------------------------------------------------------------

function sourced(value: number | undefined, source: FieldSource): SourcedNumber {
  if (value === undefined || !Number.isFinite(value)) {
    return { value: 0, source: "missing" };
  }
  return { value, source };
}

function overlayField(value: number | undefined): SourcedNumber {
  return sourced(value, "lens-derived");
}

/**
 * True when the ledger holds a real money picture (not just seeded categories).
 * Pure — used by CFM honesty gates and Money Stand empty states.
 */
export function ledgerHasRealPicture(state: BudgetLedgerState): boolean {
  return state.transactions.length > 0 || state.periods.length > 0 || activeGoal(state) !== null;
}

/**
 * Builds the CFM from a legacy finance snapshot and a tools overlay. Pure —
 * storage-reading wrappers live in buildCfm().
 */
export function deriveCfm(
  finance: FinanceState,
  overlay: ToolsOverlay,
  savedAt: string | null,
): CanonicalFinancialModel {
  const investedFromAssets = finance.assets
    .filter((a) => /retire|invest|brokerage|401|ira/i.test(a.name))
    .reduce((s, a) => s + a.amount, 0);

  const ncf = netCashFlow(finance);

  return {
    core: {
      monthlyIncome: sourced(finance.monthlyIncome, "self-reported"),
      monthlyExpenses: sourced(finance.monthlyExpenses, "self-reported"),
      monthlyDebtPayments: sourced(finance.monthlyDebtPayments, "self-reported"),
      liquidSavings: sourced(finance.liquidSavings, "self-reported"),
      totalDebt: sourced(finance.totalDebt, "self-reported"),
    },
    housing: {
      targetPrice: overlayField(overlay.targetPrice),
      downPaymentSaved: overlayField(overlay.downPaymentSaved),
      currentRent: overlayField(overlay.currentRent),
      assumedRatePct: overlayField(overlay.assumedRatePct),
      termYears: overlayField(overlay.termYears),
      taxInsuranceRatePct: overlayField(overlay.taxInsuranceRatePct),
      hoaMonthly: overlayField(overlay.hoaMonthly),
      homeValue: overlayField(overlay.homeValue),
      currentMortgageBalance: overlayField(overlay.currentMortgageBalance),
      currentMortgageRatePct: overlayField(overlay.currentMortgageRatePct),
    },
    horizon: {
      investedAssets: overlayField(
        overlay.investedAssets ?? (investedFromAssets > 0 ? investedFromAssets : undefined),
      ),
      annualContribution: overlayField(
        overlay.annualContribution ?? (ncf > 0 ? Math.round(ncf * 12) : undefined),
      ),
      expectedReturnPct: sourced(finance.expectedReturnPct, "self-reported"),
      volatilityPct: sourced(finance.volatilityPct, "self-reported"),
    },
    derived: {
      netCashFlow: ncf,
      savingsRatePct: savingsRate(finance),
      runwayMonths: runwayMonths(finance),
      dtiPct: debtToIncome(finance),
    },
    meta: {
      savedAt,
      source: "legacy",
      completeness: "low",
      liquidSource: finance.liquidSavings > 0 ? "legacy_snapshot" : "missing",
      hasDebtSignal: finance.monthlyDebtPayments > 0 || finance.totalDebt > 0,
    },
  };
}

/**
 * Builds the CFM from the budget ledger (Money Reality SoT). Pure.
 * Named metrics come from lib/finance/metrics.ts so Stand and lenses agree.
 * Missing ledger signals stay `missing` — never imputed as zero debt/DTI.
 */
export function deriveCfmFromLedger(
  state: BudgetLedgerState,
  overlay: ToolsOverlay,
  nowIso: string,
  savedAt: string | null,
): CanonicalFinancialModel {
  const metrics = metricsFromLedger(state, nowIso, savedAt);
  const goal = activeGoal(state);
  const s = metrics.surplus;

  const monthlyIncome = s.incomeDollars > 0 ? s.incomeDollars : undefined;
  const monthlyExpenses =
    metrics.evidence.hasExpenses || s.expenseDollars > 0 ? s.expenseDollars : undefined;
  // Only surface debt payments when we observed the debt category — else missing.
  const monthlyDebtPayments = metrics.evidence.hasDebtSignal ? s.debtPaymentDollars : undefined;
  const liquidSavings =
    metrics.runway.liquidDollars !== null && metrics.runway.liquidDollars > 0
      ? metrics.runway.liquidDollars
      : undefined;

  const ncf = s.dollars;
  const homeGoalSeed =
    goal?.goalType === "home" && goal.currentAmountCents > 0
      ? centsToDollars(goal.currentAmountCents)
      : undefined;

  return {
    core: {
      monthlyIncome: sourced(monthlyIncome, "self-reported"),
      monthlyExpenses: sourced(monthlyExpenses, "self-reported"),
      monthlyDebtPayments: sourced(monthlyDebtPayments, "self-reported"),
      liquidSavings: sourced(liquidSavings, "self-reported"),
      // v1 ledger has no liability register — honest missing, not fake $0.
      totalDebt: sourced(undefined, "self-reported"),
    },
    housing: {
      targetPrice: overlayField(overlay.targetPrice),
      downPaymentSaved: overlayField(overlay.downPaymentSaved ?? homeGoalSeed),
      currentRent: overlayField(overlay.currentRent),
      assumedRatePct: overlayField(overlay.assumedRatePct),
      termYears: overlayField(overlay.termYears),
      taxInsuranceRatePct: overlayField(overlay.taxInsuranceRatePct),
      hoaMonthly: overlayField(overlay.hoaMonthly),
      homeValue: overlayField(overlay.homeValue),
      currentMortgageBalance: overlayField(overlay.currentMortgageBalance),
      currentMortgageRatePct: overlayField(overlay.currentMortgageRatePct),
    },
    horizon: {
      investedAssets: overlayField(overlay.investedAssets),
      annualContribution: overlayField(
        overlay.annualContribution ?? (ncf > 0 ? Math.round(ncf * 12) : undefined),
      ),
      expectedReturnPct: sourced(undefined, "self-reported"),
      volatilityPct: sourced(undefined, "self-reported"),
    },
    derived: {
      netCashFlow: ncf,
      savingsRatePct: metrics.savingsRatePct ?? 0,
      // null runway stays 0 for legacy numeric consumers; meta.liquidSource tells truth.
      runwayMonths: metrics.runway.months ?? 0,
      // null DTI stays 0 only when debt unknown — hasDebtSignal is the honesty gate.
      dtiPct: metrics.dti.pct ?? 0,
    },
    meta: {
      savedAt,
      source: "ledger",
      completeness: metrics.evidence.completeness,
      liquidSource: metrics.evidence.liquidSource,
      hasDebtSignal: metrics.evidence.hasDebtSignal,
    },
  };
}

/** Dot-path resolver, e.g. "housing.targetPrice" → SourcedNumber. */
export function resolveCfmValue(cfm: CanonicalFinancialModel, path: string): SourcedNumber {
  const [group, key] = path.split(".");
  const bucket =
    group === "core"
      ? cfm.core
      : group === "housing"
        ? cfm.housing
        : group === "horizon"
          ? cfm.horizon
          : null;
  if (!bucket || !key) return { value: 0, source: "missing" };
  const field = (bucket as Record<string, SourcedNumber>)[key];
  return field ?? { value: 0, source: "missing" };
}

/**
 * Share of the given CFM paths backed by real user data (any non-missing
 * source). This is the honesty dial the Companion and the UI use: at low
 * coverage, speak in illustrative terms, never "your numbers".
 */
export function cfmCoverage(cfm: CanonicalFinancialModel, paths: string[]): number {
  if (paths.length === 0) return 0;
  const present = paths.filter((p) => resolveCfmValue(cfm, p).source !== "missing").length;
  return present / paths.length;
}

// ---------------------------------------------------------------------------
// Overlay storage (thin, SSR-safe, mirrors the finance store's patterns)
// ---------------------------------------------------------------------------

const OVERLAY_KEY = "homi:tools-state";
const OVERLAY_STAMP_KEY = "homi:tools-state:updated-at";

export function loadToolsOverlay(): ToolsOverlay {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERLAY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ToolsOverlay;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** The local copy with its LWW stamp; legacy data without a stamp reads 0. */
function loadStampedToolsOverlay(): Stamped<ToolsOverlay> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OVERLAY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ToolsOverlay;
    const stampRaw = window.localStorage.getItem(OVERLAY_STAMP_KEY);
    const updatedAt = stampRaw ? Number.parseInt(stampRaw, 10) : 0;
    return {
      value: parsed && typeof parsed === "object" ? parsed : {},
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  } catch {
    return null;
  }
}

export function hasSavedToolsOverlay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OVERLAY_KEY) !== null;
  } catch {
    return false;
  }
}

/** ISO timestamp of the last overlay write, or null when never saved. */
export function toolsOverlaySavedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stamp = window.localStorage.getItem(OVERLAY_STAMP_KEY);
    if (!stamp) return null;
    const ms = Number.parseInt(stamp, 10);
    return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
  } catch {
    return null;
  }
}

/** Local write WITHOUT a sync push — the sync layer itself uses this. */
function writeToolsOverlayLocal(stamped: Stamped<ToolsOverlay>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(stamped.value));
    window.localStorage.setItem(OVERLAY_STAMP_KEY, String(stamped.updatedAt));
  } catch {
    // Storage unavailable (private browsing quota, etc.) — the lens still
    // works for this session; nothing is persisted.
  }
}

const toolsOverlaySync = createSyncedResource<ToolsOverlay>({
  endpoint: "/api/tools/overlay",
  loadLocal: loadStampedToolsOverlay,
  saveLocal: writeToolsOverlayLocal,
});

/**
 * Merges fields into the overlay. Only call this in response to an explicit
 * user action ("update my numbers") — silent write-back would corrupt the
 * user's decision record. Local-first, synchronous; a background sync mirrors
 * it to the database for signed-in users so the numbers follow them across
 * devices. Anonymous visitors keep the old localStorage-only behavior.
 */
export function saveToolsOverlayFields(fields: Partial<ToolsOverlay>): void {
  if (typeof window === "undefined") return;
  try {
    const merged: ToolsOverlay = { ...loadToolsOverlay(), ...fields };
    const stamped: Stamped<ToolsOverlay> = { value: merged, updatedAt: Date.now() };
    writeToolsOverlayLocal(stamped);
    toolsOverlaySync.push(stamped);
  } catch {
    // Storage unavailable — ignore.
  }
}

/**
 * Reconcile with the server copy (last-write-wins) and return the freshest
 * overlay, hydrating localStorage with the winner. Anonymous and offline
 * sessions reconcile to the local copy (empty object only when nothing stored
 * anywhere) — callers fall back to loadToolsOverlay() / defaults either way.
 */
export async function pullToolsOverlay(): Promise<ToolsOverlay | null> {
  const result = await toolsOverlaySync.pull();
  return result?.value ?? null;
}

// ---------------------------------------------------------------------------
// Storage-backed builder
// ---------------------------------------------------------------------------

/**
 * Builds the CFM from local storage, or null when the user has never saved
 * money data. Prefers the budget ledger (Money Reality SoT); falls back to
 * the legacy finance snapshot. Null is the honesty gate: callers must fall
 * back to illustrative defaults and must not speak in the user's voice.
 */
export function buildCfm(): CanonicalFinancialModel | null {
  const overlay = loadToolsOverlay();
  const nowIso = new Date().toISOString();

  if (hasSavedBudgetLedger()) {
    const ledger = loadBudgetLedger(nowIso);
    if (ledgerHasRealPicture(ledger)) {
      // Freshness from last write stamp — never Date.now() at read.
      return deriveCfmFromLedger(ledger, overlay, nowIso, budgetLedgerSavedAt());
    }
  }

  if (!hasSavedFinanceState()) return null;
  return deriveCfm(loadFinanceState(), overlay, financeSavedAt());
}

/**
 * Like buildCfm(), but always returns a model — using the finance store's
 * illustrative defaults when nothing is saved, with every core field still
 * labeled. Callers that only need derived math (never user-voice copy) can
 * use this; anything user-facing should prefer buildCfm() and branch on null.
 */
export function buildCfmOrDefaults(): { cfm: CanonicalFinancialModel; real: boolean } {
  const built = buildCfm();
  if (built) return { cfm: built, real: true };
  return {
    cfm: deriveCfm(loadFinanceState(), loadToolsOverlay(), null),
    real: false,
  };
}
