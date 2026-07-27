/**
 * Evidence-based path step completion.
 * Completing a step records *why* it cleared — manual, finance, or bank.
 */

import type { AssessmentResult } from "@/lib/scoring";
import {
  setPathStepStatus,
  type PathFinanceSnapshot,
  type PathStepStatus,
  type ReadinessPath,
} from "./path";
import {
  autoCompletePathFromSignals,
  type CategoryAutoSignals,
} from "./autocomplete";

export type EvidenceKind =
  | "manual"
  | "finance_metric"
  | "assessment_hard_stop_clear"
  | "plaid_category"
  | "partner_sync";

export interface StepEvidence {
  kind: EvidenceKind;
  detail: string;
  at: string;
}

/** Attach evidence onto a step (stored in notes footer + optional field). */
export function completeStepWithEvidence(
  path: ReadinessPath,
  stepId: string,
  status: PathStepStatus,
  evidence: StepEvidence,
  now: Date = new Date(),
): ReadinessPath {
  const next = setPathStepStatus(path, stepId, status, now);
  return {
    ...next,
    steps: next.steps.map((s) => {
      if (s.id !== stepId) return s;
      const stamp = `[evidence:${evidence.kind}] ${evidence.detail} @ ${evidence.at}`;
      const notes = s.notes.includes("[evidence:")
        ? s.notes
        : `${s.notes}\n\n${stamp}`;
      return {
        ...s,
        notes,
      };
    }),
  };
}

/**
 * Auto-complete with explicit evidence kinds from finance / assessment / plaid.
 */
export function evidenceBasedAutoComplete(
  path: ReadinessPath,
  result: AssessmentResult | null,
  finance: PathFinanceSnapshot | null,
  categories?: CategoryAutoSignals | null,
  now: Date = new Date(),
): { path: ReadinessPath; completedStepIds: string[]; reasons: string[] } {
  const base = autoCompletePathFromSignals(
    path,
    result,
    finance,
    now,
    categories,
  );
  if (base.completedStepIds.length === 0) return base;

  let next = base.path;
  for (const id of base.completedStepIds) {
    const reason =
      base.reasons.find((r) => r.includes(id)) ??
      base.reasons.find((r) => true) ??
      "Signal cleared";
    const kind: EvidenceKind = /plaid|subscription|categor/i.test(reason)
      ? "plaid_category"
      : /assessment|hard-stop/i.test(reason)
        ? "assessment_hard_stop_clear"
        : "finance_metric";
    // Re-apply evidence stamp on already-done steps
    next = {
      ...next,
      steps: next.steps.map((s) => {
        if (s.id !== id) return s;
        const detail =
          base.reasons.find((r) => r.startsWith(s.title)) ?? reason;
        const stamp = `[evidence:${kind}] ${detail} @ ${now.toISOString()}`;
        return {
          ...s,
          notes: s.notes.includes("[evidence:") ? s.notes : `${s.notes}\n\n${stamp}`,
        };
      }),
    };
  }
  return { path: next, completedStepIds: base.completedStepIds, reasons: base.reasons };
}
