/**
 * Snapshot score before mutations and emit impact after.
 * Keeps store free of scoring circular imports.
 *
 * Path honesty: completing a Path step advances the sequence. It does not
 * recompute finance inputs — score motion is usually flat. We short-circuit
 * already-done steps and never regenerate the whole path after a single step
 * (regenerate would wipe completion state).
 */

import {
  buildScoreImpact,
  impactToSnapshot,
  type ScoreImpact,
} from "./impact";
import {
  pathCompletionRatio,
  type PathStepStatus,
  type ReadinessPath,
} from "./path";
import { scoreFromBudget } from "./score-bridge";
import { useBudgetStore } from "./store";

function snapshotScore() {
  const s = useBudgetStore.getState();
  return scoreFromBudget({
    transactions: s.transactions,
    accounts: s.accounts,
    bills: s.bills,
    holdings: s.holdings,
    netWorthItems: s.netWorthItems,
    savingsGoal: s.savingsGoal,
    readinessProfile: s.readinessProfile,
  });
}

function pathFromStore(): ReadinessPath | null {
  const snap = useBudgetStore.getState().path;
  if (!snap) return null;
  return {
    id: snap.id,
    version: 1,
    createdAt: snap.createdAt,
    score: snap.score,
    verdict: snap.verdict as ReadinessPath["verdict"],
    bindingConstraint: snap.bindingConstraint as ReadinessPath["bindingConstraint"],
    confidence: "finance_live",
    disclaimer: "",
    mode: snap.mode as ReadinessPath["mode"],
    steps: snap.steps.map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind as ReadinessPath["steps"][0]["kind"],
      daysFromNow: s.daysFromNow,
      reasonCode: s.reasonCode as ReadinessPath["steps"][0]["reasonCode"],
      notes: s.notes,
      fundingTarget: s.fundingTarget,
      fundingLabel: s.fundingLabel,
      status: s.status as PathStepStatus,
      completedAt: s.completedAt,
    })),
  };
}

function nextPendingTitle(path: ReadinessPath | null, completedId: string): string {
  if (!path) return "Open Plan when you want the next protective step.";
  const next = path.steps.find(
    (s) => s.id !== completedId && (s.status ?? "pending") === "pending",
  );
  if (!next) {
    return "Path steps complete. Reassess when life inputs change — not yet is not no.";
  }
  return `Next: ${next.title}`;
}

export function withScoreImpact(
  reason: string,
  action: () => void | { ok: boolean; error?: string },
  opts?: { regeneratePath?: boolean },
): { ok: boolean; error?: string; impact: ScoreImpact | null } {
  const before = snapshotScore();
  const result = action();
  const failed =
    result && typeof result === "object" && "ok" in result && result.ok === false;
  if (failed) {
    return {
      ok: false,
      error: (result as { error?: string }).error,
      impact: null,
    };
  }

  if (opts?.regeneratePath) {
    const s = useBudgetStore.getState();
    if (s.path) s.regeneratePath();
  }

  const after = snapshotScore();
  const impact = buildScoreImpact(before, after, reason);
  useBudgetStore.getState().setLastImpact(impactToSnapshot(impact));
  return { ok: true, impact };
}

export function payBillWithImpact(billId: string, accountId?: string) {
  return withScoreImpact(
    "Bill paid",
    () => useBudgetStore.getState().payBill(billId, accountId),
    // Bill pay can clear runway/DTI constraints — regenerate path sequence
    { regeneratePath: true },
  );
}

/**
 * Mark a Path step done/skipped with honest impact.
 * Prefer status "done" from UI; skip should not celebrate progress.
 */
export function completePathStepWithImpact(
  stepId: string,
  status: "done" | "skipped" = "done",
): { ok: boolean; impact: ScoreImpact | null } {
  const beforePath = pathFromStore();
  if (!beforePath) return { ok: false, impact: null };

  const step = beforePath.steps.find((s) => s.id === stepId);
  if (!step) return { ok: false, impact: null };

  const prior = step.status ?? "pending";
  if (prior === "done" || prior === "skipped") {
    // Already complete — no store write, no toast noise
    return { ok: true, impact: null };
  }

  const beforeRatio = pathCompletionRatio(beforePath);
  const before = snapshotScore();

  useBudgetStore.getState().completePathStep(stepId, status);
  // Do NOT regeneratePath here — that rebuilds steps and wipes completion.

  const afterPath = pathFromStore();
  const afterRatio = afterPath ? pathCompletionRatio(afterPath) : beforeRatio;
  const after = snapshotScore();

  const reason =
    status === "done" ? "Path step completed" : "Path step skipped";
  let impact = buildScoreImpact(before, after, reason);

  // Enrich with path progress (production honesty contract)
  impact = {
    ...impact,
    pathProgress: { before: beforeRatio, after: afterRatio },
    stepTitle: step.title,
    alreadyDone: false,
  };

  // Progress-first copy when score is flat (Path is not a scorer)
  if (status === "done" && Math.abs(impact.delta) < 0.5) {
    const pct = Math.round(afterRatio * 100);
    const progressMoved = Math.abs(afterRatio - beforeRatio) > 0.001;
    if (progressMoved) {
      impact = {
        ...impact,
        headline:
          pct >= 100 ? "Path steps complete" : "Step locked in",
        detail:
          pct >= 100
            ? `“${step.title}” · Protective homework on this path is clear. ${nextPendingTitle(afterPath, stepId)}`
            : `“${step.title}” · Path ${pct}% complete. ${nextPendingTitle(afterPath, stepId)}`,
        nextHint: nextPendingTitle(afterPath, stepId),
      };
    }
  }

  if (status === "skipped") {
    impact = {
      ...impact,
      headline: "Step skipped — path stays truthful",
      detail: `“${step.title}” marked skipped. No readiness claim for avoidance.`,
      nextHint: nextPendingTitle(afterPath, stepId),
    };
  }

  useBudgetStore.getState().setLastImpact(impactToSnapshot(impact));
  return { ok: true, impact };
}

export function addCheckinWithImpact(stress: number, note?: string) {
  return withScoreImpact("Daily check-in", () => {
    useBudgetStore.getState().addCheckin(stress, note);
  });
}
