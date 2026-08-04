/**
 * Path to Ready — local-first persistence + optional server LWW sync.
 */

import type { AssessmentResult } from "@/lib/scoring/engine";
import {
  hasSavedFinanceState,
  loadFinanceState,
  netCashFlow,
  runwayMonths,
  financeSavedAt,
} from "@/lib/finance/store";
import {
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { buildPathFinanceSnapshotFromLedger } from "@/lib/finance/readiness-snapshot";
import { createSyncedResource, type Stamped } from "@/lib/persistence";
import {
  buildReadinessPath,
  normalizeReadinessPath,
  setPathStepStatus,
  PATH_DISCLAIMER,
  type PathFinanceSnapshot,
  type PathStep,
  type PathStepStatus,
  type ReadinessPath,
} from "./path";
import { loadLocalResult } from "@/lib/assessment/storage";
import {
  loadCouplesAlignment,
  partnerBlocksJointReady,
} from "./partner";
import { evidenceBasedAutoComplete } from "./evidence";
import { archivePathVersion } from "./versions";

function injectPartnerStep(path: ReadinessPath): ReadinessPath {
  if (path.mode === "ready_optional") return path;
  if (path.steps.some((s) => s.reasonCode === "PARTNER_ALIGNMENT")) return path;
  const couples = loadCouplesAlignment();
  if (!partnerBlocksJointReady(couples)) return path;

  const step: PathStep = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `partner-${Date.now()}`,
    title: "Household alignment session before joint proceed",
    kind: "milestone",
    daysFromNow: 5,
    reasonCode: "PARTNER_ALIGNMENT",
    href: "/household#couples",
    notes:
      `Couples alignment is ${couples?.overallPct ?? "low"}%` +
      (couples?.biggestGapTopic ? ` (gap: ${couples.biggestGapTopic})` : "") +
      ". Solo readiness is not household readiness. " +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    status: "pending",
    completedAt: null,
  };

  // Insert after cash-flow / hard-stop openers
  const steps = [...path.steps];
  const insertAt = Math.min(1, steps.length);
  steps.splice(insertAt, 0, step);
  return {
    ...path,
    bindingConstraint: path.bindingConstraint ?? "PARTNER_ALIGNMENT",
    steps: steps.slice(0, 7),
  };
}

const STORAGE_KEY = "homi:readiness-path";
const STAMP_KEY = "homi:readiness-path:updated-at";

function writeLocal(stamped: Stamped<ReadinessPath>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped.value));
    window.localStorage.setItem(STAMP_KEY, String(stamped.updatedAt));
  } catch {
    // private mode / quota
  }
}

function loadStampedLocal(): Stamped<ReadinessPath> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const path = normalizeReadinessPath(JSON.parse(raw) as unknown);
    if (!path) return null;
    const stampRaw = window.localStorage.getItem(STAMP_KEY);
    const updatedAt = stampRaw ? Number.parseInt(stampRaw, 10) : 0;
    return {
      value: path,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
    };
  } catch {
    return null;
  }
}

const pathSync = createSyncedResource<ReadinessPath>({
  endpoint: "/api/readiness-path",
  loadLocal: loadStampedLocal,
  saveLocal: writeLocal,
  debounceMs: 400,
});

export function loadReadinessPath(): ReadinessPath | null {
  return loadStampedLocal()?.value ?? null;
}

export function saveReadinessPath(path: ReadinessPath): void {
  const stamped: Stamped<ReadinessPath> = {
    value: normalizeReadinessPath(path) ?? path,
    updatedAt: Date.now(),
  };
  writeLocal(stamped);
  pathSync.push(stamped);
}

export function clearReadinessPath(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STAMP_KEY);
  } catch {
    // ignore
  }
}

/** Pull server copy (signed-in); hydrates localStorage on win. */
export async function pullReadinessPath(): Promise<ReadinessPath | null> {
  const result = await pathSync.pull();
  return result?.value ?? null;
}

export function financeSnapshotForPath(): PathFinanceSnapshot | null {
  if (hasSavedBudgetLedger()) {
    const nowIso = new Date().toISOString();
    const ledger = loadBudgetLedger(nowIso);
    const snapshot = buildPathFinanceSnapshotFromLedger(ledger, nowIso.slice(0, 10));
    if (snapshot) return snapshot;
  }

  if (!hasSavedFinanceState()) return null;
  const state = loadFinanceState();
  const runway = runwayMonths(state);
  return {
    netCashFlow: netCashFlow(state),
    runwayMonths: Number.isFinite(runway) ? runway : null,
    monthlyExpenses: state.monthlyExpenses,
    liquidSavings: state.liquidSavings,
    monthlyDebtPayments: state.monthlyDebtPayments,
    monthlyIncome: state.monthlyIncome,
  };
}

export function generatePathFromLocalAssessment(): ReadinessPath | null {
  const stored = loadLocalResult();
  if (!stored) return null;
  return generatePathFromResult(stored.result, stored.completedAt);
}

export function generatePathFromResult(
  result: AssessmentResult,
  assessmentCompletedAt?: string | null,
  opts?: { archiveExisting?: boolean },
): ReadinessPath {
  if (opts?.archiveExisting !== false) {
    const existing = loadReadinessPath();
    if (existing) archivePathVersion(existing);
  }
  const base = buildReadinessPath(result, {
    assessmentCompletedAt: assessmentCompletedAt ?? null,
    finance: financeSnapshotForPath(),
  });
  return injectPartnerStep(base);
}

/**
 * Auto-complete cleared gates from finance + latest assessment; persist if changed.
 * Uses evidence stamps when steps auto-complete.
 */
export function reconcilePathWithSignals(
  result?: AssessmentResult | null,
  categories?: { subscriptionDragMonthly?: number; diningHeavy?: boolean } | null,
): { path: ReadinessPath | null; completedStepIds: string[]; reasons: string[] } {
  const path = loadReadinessPath();
  if (!path) return { path: null, completedStepIds: [], reasons: [] };
  const assessment = result ?? loadLocalResult()?.result ?? null;
  const { path: next, completedStepIds, reasons } = evidenceBasedAutoComplete(
    path,
    assessment,
    financeSnapshotForPath(),
    categories,
  );
  if (completedStepIds.length > 0) {
    saveReadinessPath(next);
  }
  return { path: next, completedStepIds, reasons };
}

/**
 * Auto-generate path for non-READY verdicts (activation).
 * Does not overwrite an existing path for the same verdict unless force.
 */
export function ensurePathForVerdict(
  result: AssessmentResult,
  assessmentCompletedAt?: string | null,
  force = false,
): ReadinessPath | null {
  if (result.verdict === "READY" && result.hardStops.length === 0) {
    return loadReadinessPath();
  }
  const existing = loadReadinessPath();
  if (existing && existing.verdict === result.verdict && !force) {
    return existing;
  }
  const path = generatePathFromResult(result, assessmentCompletedAt);
  saveReadinessPath(path);
  return path;
}

export function completePathStep(
  stepId: string,
  status: PathStepStatus = "done",
): ReadinessPath | null {
  const path = loadReadinessPath();
  if (!path) return null;
  const next = setPathStepStatus(path, stepId, status);
  saveReadinessPath(next);
  return next;
}

export function markPathCalendarCommitted(
  path: ReadinessPath,
  at: Date = new Date(),
): ReadinessPath {
  const next: ReadinessPath = {
    ...path,
    calendarCommittedAt: at.toISOString(),
  };
  saveReadinessPath(next);
  return next;
}

export function getFinanceSavedAtForPath(): string | null {
  return financeSavedAt();
}
