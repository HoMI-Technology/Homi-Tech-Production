/* ------------------------------------------------------------------ */
/* Closed loop — snapshot score before mutations, emit ScoreImpact.    */
/* Production: scoring is async via /api/scoring (never invent scores).*/
/* NEVER regenerate path on step completion.                           */
/* ------------------------------------------------------------------ */

import { buildScoreImpact, impactToSnapshot, type ScoreImpact } from "@/lib/planner/impact";
import {
  nextScoreSeq,
  scoreResultFromBudget,
  ScoringRequestError,
} from "@/lib/planner/score-bridge";
import type { PathSnapshot } from "@/lib/planner/types";
import type { ScoreResult } from "@/lib/planner/score-result";
import { usePlannerStore } from "@/lib/planner/store";

function bridgeInputFromStore() {
  const s = usePlannerStore.getState();
  return {
    transactions: s.transactions,
    accounts: s.accounts,
    bills: s.bills,
    holdings: s.holdings,
    netWorthItems: s.netWorthItems,
    savingsGoal: s.savingsGoal,
    readinessProfile: s.readinessProfile,
  };
}

async function snapshotScore(): Promise<ScoreResult | null> {
  try {
    return await scoreResultFromBudget(bridgeInputFromStore());
  } catch (err) {
    if (err instanceof ScoringRequestError) return null;
    return null;
  }
}

function pathProgressRatio(path: PathSnapshot): number {
  const steps = path.steps.filter((s) => s.reasonCode !== "REASSESS");
  if (steps.length === 0) {
    if (path.steps.length === 0) return 1;
    const done = path.steps.filter((s) => s.status !== "pending").length;
    return done / path.steps.length;
  }
  const done = steps.filter((s) => s.status !== "pending").length;
  return done / steps.length;
}

function nextPendingTitle(path: PathSnapshot | null, completedId: string): string {
  if (!path) return "Open Plan when you want the next protective step.";
  const next = path.steps.find((s) => s.id !== completedId && s.status === "pending");
  if (!next) {
    return "Path steps complete. Reassess when life inputs change — not yet is not no.";
  }
  return `Next: ${next.title}`;
}

export async function withScoreImpact(
  reason: string,
  action: () => void | { ok: boolean; error?: string },
  opts?: { regeneratePath?: boolean },
): Promise<{ ok: boolean; error?: string; impact: ScoreImpact | null }> {
  const seq = nextScoreSeq();
  const before = await snapshotScore();

  const result = action();
  const failed = result && typeof result === "object" && "ok" in result && result.ok === false;
  if (failed) {
    return {
      ok: false,
      error: (result as { error?: string }).error,
      impact: null,
    };
  }

  if (opts?.regeneratePath) {
    const s = usePlannerStore.getState();
    if (s.path) await s.regeneratePath();
  }

  const after = await snapshotScore();
  // Ignore stale responses if a newer closed-loop started.
  if (seq !== nextScoreSeq() - 0 && false) {
    /* seq check placeholder — use captured after */
  }

  if (!before || !after) {
    // Money still saved; no toast invented score.
    return { ok: true, impact: null };
  }

  const impact = buildScoreImpact(before, after, reason);
  usePlannerStore.getState().setLastImpact(impactToSnapshot(impact));
  return { ok: true, impact };
}

export async function payBillWithImpact(billId: string, accountId?: string) {
  return withScoreImpact("Bill paid", () => usePlannerStore.getState().payBill(billId, accountId), {
    regeneratePath: true,
  });
}

export async function completePathStepWithImpact(
  stepId: string,
  status: "done" | "skipped" = "done",
): Promise<{ ok: boolean; impact: ScoreImpact | null }> {
  const beforePath = usePlannerStore.getState().path;
  if (!beforePath) return { ok: false, impact: null };

  const step = beforePath.steps.find((s) => s.id === stepId);
  if (!step) return { ok: false, impact: null };

  const prior = step.status;
  if (prior === "done" || prior === "skipped") {
    return { ok: true, impact: null };
  }

  const beforeRatio = pathProgressRatio(beforePath);
  const before = await snapshotScore();

  usePlannerStore.getState().completePathStep(stepId, status);
  // Do NOT regeneratePath here — that rebuilds steps and wipes completion.

  const afterPath = usePlannerStore.getState().path;
  const afterRatio = afterPath ? pathProgressRatio(afterPath) : beforeRatio;
  const after = await snapshotScore();

  if (!before || !after) {
    return { ok: true, impact: null };
  }

  const reason = status === "done" ? "Path step completed" : "Path step skipped";
  let impact = buildScoreImpact(before, after, reason);

  impact = {
    ...impact,
    pathProgress: { before: beforeRatio, after: afterRatio },
    stepTitle: step.title,
    alreadyDone: false,
  };

  if (status === "done" && Math.abs(impact.delta) < 0.5) {
    const pct = Math.round(afterRatio * 100);
    const progressMoved = Math.abs(afterRatio - beforeRatio) > 0.001;
    if (progressMoved) {
      impact = {
        ...impact,
        headline: pct >= 100 ? "Path steps complete" : "Step locked in",
        detail:
          pct >= 100
            ? `"${step.title}" · Protective homework on this path is clear. ${nextPendingTitle(afterPath, stepId)}`
            : `"${step.title}" · Path ${pct}% complete. ${nextPendingTitle(afterPath, stepId)}`,
        nextHint: nextPendingTitle(afterPath, stepId),
      };
    }
  }

  if (status === "skipped") {
    impact = {
      ...impact,
      headline: "Step skipped — path stays truthful",
      detail: `"${step.title}" marked skipped. No readiness claim for avoidance.`,
      nextHint: nextPendingTitle(afterPath, stepId),
    };
  }

  usePlannerStore.getState().setLastImpact(impactToSnapshot(impact));
  return { ok: true, impact };
}

export async function addCheckinWithImpact(stress: number, note?: string) {
  return withScoreImpact("Daily check-in", () => {
    usePlannerStore.getState().addCheckin(stress, note);
  });
}
