/**
 * Canonical Financial Model (CFM) — Decision Lab Phase 1.
 *
 * One shared, source-labeled view of the user's numbers that every lens
 * (calculator) reads from, instead of each page inventing its own slider
 * defaults. The CFM is a VIEW, not a second database: core money fields
 * derive from the finance store (lib/finance/store.ts) and lens-specific
 * fields live in a thin overlay record ("homi:tools-state") that lenses
 * write back to only when the user explicitly asks ("update my numbers").
 *
 * Honesty contract (same doctrine as the Companion context spine):
 * - The CFM exists only when the user has actually saved finance data
 *   (hasSavedFinanceState). Illustrative defaults are never presented as
 *   the user's numbers.
 * - Every field carries a source label:
 *     self-reported — entered on the finance dashboard
 *     lens-derived  — captured inside a tool, with the user's consent
 *     missing       — a first-class signal; never imputed
 * - Freshness travels with the model via financeSavedAt().
 *
 * SSR-safe: all storage access is window-guarded, mirroring store.ts.
 * The pure derivation core (deriveCfm) takes plain objects so it can be
 * unit-tested without localStorage.
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
    /** ISO timestamp of the underlying finance save, or null if unknown. */
    savedAt: string | null;
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
 * Builds the CFM from a finance state and a tools overlay. Pure — the
 * storage-reading wrapper is buildCfm().
 */
export function deriveCfm(
  finance: FinanceState,
  overlay: ToolsOverlay,
  savedAt: string | null,
): CanonicalFinancialModel {
  const investedFromAssets = finance.assets
    .filter((a) => /retire|invest|brokerage|401|ira/i.test(a.name))
    .reduce((s, a) => s + a.amount, 0);

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
        overlay.annualContribution ??
          (netCashFlow(finance) > 0 ? Math.round(netCashFlow(finance) * 12) : undefined),
      ),
      expectedReturnPct: sourced(finance.expectedReturnPct, "self-reported"),
      volatilityPct: sourced(finance.volatilityPct, "self-reported"),
    },
    derived: {
      netCashFlow: netCashFlow(finance),
      savingsRatePct: savingsRate(finance),
      runwayMonths: runwayMonths(finance),
      dtiPct: debtToIncome(finance),
    },
    meta: { savedAt },
  };
}

/** Dot-path resolver, e.g. "housing.targetPrice" → SourcedNumber. */
export function resolveCfmValue(
  cfm: CanonicalFinancialModel,
  path: string,
): SourcedNumber {
  const [group, key] = path.split(".");
  const bucket =
    group === "core" ? cfm.core : group === "housing" ? cfm.housing : group === "horizon" ? cfm.horizon : null;
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

/**
 * Merges fields into the overlay. Only call this in response to an explicit
 * user action ("update my numbers") — silent write-back would corrupt the
 * user's decision record. Local-first, synchronous; a cross-device sync
 * layer can mirror this later the same way lib/persistence.ts mirrors the
 * finance store.
 */
export function saveToolsOverlayFields(fields: Partial<ToolsOverlay>): void {
  if (typeof window === "undefined") return;
  try {
    const merged: ToolsOverlay = { ...loadToolsOverlay(), ...fields };
    window.localStorage.setItem(OVERLAY_KEY, JSON.stringify(merged));
    window.localStorage.setItem(OVERLAY_STAMP_KEY, String(Date.now()));
  } catch {
    // Storage unavailable (private browsing quota, etc.) — the lens still
    // works for this session; nothing is persisted.
  }
}

// ---------------------------------------------------------------------------
// Storage-backed builder
// ---------------------------------------------------------------------------

/**
 * Builds the CFM from local storage, or null when the user has never saved
 * finance data. Null is the honesty gate: callers must fall back to
 * illustrative defaults and must not speak in the user's voice.
 */
export function buildCfm(): CanonicalFinancialModel | null {
  if (!hasSavedFinanceState()) return null;
  return deriveCfm(loadFinanceState(), loadToolsOverlay(), financeSavedAt());
}

/**
 * Like buildCfm(), but always returns a model — using the finance store's
 * illustrative defaults when nothing is saved, with every core field still
 * labeled. Callers that only need derived math (never user-voice copy) can
 * use this; anything user-facing should prefer buildCfm() and branch on null.
 */
export function buildCfmOrDefaults(): { cfm: CanonicalFinancialModel; real: boolean } {
  const real = hasSavedFinanceState();
  return {
    cfm: deriveCfm(loadFinanceState(), loadToolsOverlay(), real ? financeSavedAt() : null),
    real,
  };
}
