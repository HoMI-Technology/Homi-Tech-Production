/* ------------------------------------------------------------------ */
/* Closed loop — snapshot the score before mutations, emit a           */
/* ScoreImpact after. Keeps the store free of scoring circular         */
/* imports.                                                            */
/*                                                                     */
/* Ported from the reference planner closed-loop.ts (lib audit #12:    */
/* PORT, wave 1), with the store import adapted to @/store/planner     */
/* (usePlannerStore). The reference's rules are kept verbatim:         */
/*   - snapshot score before mutation → emit ScoreImpact after         */
/*   - NEVER regenerate the path on step completion (canon impact-bus  */
/*     doctrine — a regenerate rebuilds steps and wipes completion)    */
/*   - progress-first copy when the score delta is flat                */
/*                                                                     */
/* Path honesty: completing a Path step advances the sequence. It does */
/* not recompute finance inputs — score motion is usually flat. We     */
/* short-circuit already-done steps and never regenerate the whole     */
/* path after a single step.                                           */
/* ------------------------------------------------------------------ */

import {
  buildScoreImpact,
  impactToSnapshot,
  type ScoreImpact,
} from '@/lib/planner/impact'
import { scoreFromBudget } from '@/lib/planner/score-bridge'
import type { PathSnapshot } from '@/lib/planner/types'
import { usePlannerStore } from '@/store/planner'

function snapshotScore() {
  const s = usePlannerStore.getState()
  return scoreFromBudget({
    transactions: s.transactions,
    accounts: s.accounts,
    bills: s.bills,
    holdings: s.holdings,
    netWorthItems: s.netWorthItems,
    savingsGoal: s.savingsGoal,
    readinessProfile: s.readinessProfile,
  })
}

/**
 * Resolved ratio (done + skipped over non-REASSESS steps) — same
 * semantics as canon lib/path.ts pathCompletionRatio, projected onto
 * the planner's PathSnapshot. Display it as "resolved", never
 * "complete": skipped steps count toward this number.
 */
function pathProgressRatio(path: PathSnapshot): number {
  const steps = path.steps.filter((s) => s.reasonCode !== 'REASSESS')
  if (steps.length === 0) {
    if (path.steps.length === 0) return 1
    const done = path.steps.filter((s) => s.status !== 'pending').length
    return done / path.steps.length
  }
  const done = steps.filter((s) => s.status !== 'pending').length
  return done / steps.length
}

function nextPendingTitle(
  path: PathSnapshot | null,
  completedId: string,
): string {
  if (!path) return 'Open Plan when you want the next protective step.'
  const next = path.steps.find(
    (s) => s.id !== completedId && s.status === 'pending',
  )
  if (!next) {
    return 'Path steps complete. Reassess when life inputs change — not yet is not no.'
  }
  return `Next: ${next.title}`
}

export function withScoreImpact(
  reason: string,
  action: () => void | { ok: boolean; error?: string },
  opts?: { regeneratePath?: boolean },
): { ok: boolean; error?: string; impact: ScoreImpact | null } {
  const before = snapshotScore()
  const result = action()
  const failed =
    result && typeof result === 'object' && 'ok' in result && result.ok === false
  if (failed) {
    return {
      ok: false,
      error: (result as { error?: string }).error,
      impact: null,
    }
  }

  if (opts?.regeneratePath) {
    const s = usePlannerStore.getState()
    if (s.path) s.regeneratePath()
  }

  const after = snapshotScore()
  const impact = buildScoreImpact(before, after, reason)
  usePlannerStore.getState().setLastImpact(impactToSnapshot(impact))
  return { ok: true, impact }
}

export function payBillWithImpact(billId: string, accountId?: string) {
  return withScoreImpact(
    'Bill paid',
    () => usePlannerStore.getState().payBill(billId, accountId),
    // Bill pay can clear runway/DTI constraints — regenerate path sequence
    { regeneratePath: true },
  )
}

/**
 * Mark a Path step done/skipped with honest impact.
 * Prefer status "done" from UI; skip should not celebrate progress.
 */
export function completePathStepWithImpact(
  stepId: string,
  status: 'done' | 'skipped' = 'done',
): { ok: boolean; impact: ScoreImpact | null } {
  const beforePath = usePlannerStore.getState().path
  if (!beforePath) return { ok: false, impact: null }

  const step = beforePath.steps.find((s) => s.id === stepId)
  if (!step) return { ok: false, impact: null }

  const prior = step.status
  if (prior === 'done' || prior === 'skipped') {
    // Already complete — no store write, no toast noise
    return { ok: true, impact: null }
  }

  const beforeRatio = pathProgressRatio(beforePath)
  const before = snapshotScore()

  usePlannerStore.getState().completePathStep(stepId, status)
  // Do NOT regeneratePath here — that rebuilds steps and wipes completion.

  const afterPath = usePlannerStore.getState().path
  const afterRatio = afterPath ? pathProgressRatio(afterPath) : beforeRatio
  const after = snapshotScore()

  const reason =
    status === 'done' ? 'Path step completed' : 'Path step skipped'
  let impact = buildScoreImpact(before, after, reason)

  // Enrich with path progress (production honesty contract)
  impact = {
    ...impact,
    pathProgress: { before: beforeRatio, after: afterRatio },
    stepTitle: step.title,
    alreadyDone: false,
  }

  // Progress-first copy when score is flat (Path is not a scorer)
  if (status === 'done' && Math.abs(impact.delta) < 0.5) {
    const pct = Math.round(afterRatio * 100)
    const progressMoved = Math.abs(afterRatio - beforeRatio) > 0.001
    if (progressMoved) {
      impact = {
        ...impact,
        headline:
          pct >= 100 ? 'Path steps complete' : 'Step locked in',
        detail:
          pct >= 100
            ? `“${step.title}” · Protective homework on this path is clear. ${nextPendingTitle(afterPath, stepId)}`
            : `“${step.title}” · Path ${pct}% complete. ${nextPendingTitle(afterPath, stepId)}`,
        nextHint: nextPendingTitle(afterPath, stepId),
      }
    }
  }

  if (status === 'skipped') {
    impact = {
      ...impact,
      headline: 'Step skipped — path stays truthful',
      detail: `“${step.title}” marked skipped. No readiness claim for avoidance.`,
      nextHint: nextPendingTitle(afterPath, stepId),
    }
  }

  usePlannerStore.getState().setLastImpact(impactToSnapshot(impact))
  return { ok: true, impact }
}

export function addCheckinWithImpact(stress: number, note?: string) {
  return withScoreImpact('Daily check-in', () => {
    usePlannerStore.getState().addCheckin(stress, note)
  })
}
