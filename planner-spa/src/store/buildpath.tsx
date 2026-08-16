import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  liquidSavings,
  monthExpenses,
  monthIncome,
  netCashFlow,
  runwayMonths,
  useBudget,
} from '@/store/budget'
import { useAssessmentResult, useReadinessManual, useScoreHistory } from '@/store/readiness'
import {
  archivePathVersion,
  assessmentFromScore,
  buildReadinessPath,
  completeStepWithEvidence,
  evidenceBasedAutoComplete,
  ledgerDayStamp,
  mergeStepStatuses,
  normalizeReadinessPath,
  pathStepsSignature,
  setPathStepStatus,
  type PathAssessment,
  type PathFinanceSnapshot,
  type ReadinessPath,
} from '@/lib/path'

/* ------------------------------------------------------------------ */
/* Build Path store — canonical Path-to-Ready engine state.            */
/*                                                                     */
/* The canon generator (src/lib/path.ts) re-derives the path LIVE from  */
/* the scoring engine + ledger on every change; this store persists the  */
/* current path (homi-buildpath-v1), carries step completion across     */
/* regenerations, runs evidence-based auto-complete, and archives prior */
/* paths via canon versions.ts (capped local history, no server sync).  */
/*                                                                     */
/* Legacy keys kept: checklist (M5 clarity) and checks (M8 cadence      */
/* fallback). The old done/dismissed module-id lists are retired —      */
/* module ids do not map to canon step ids.                             */
/* ------------------------------------------------------------------ */

export const BUILDPATH_STORAGE_KEY = 'homi-buildpath-v1'

export type BuildPathState = {
  /** Current canon-generated path (steps carry status + evidence). */
  path: ReadinessPath | null
  /** Step-content signature the user last acknowledged ("Your path changed"). */
  ackedSignature: string | null
  /** Clarity-checklist item ids that are checked off. */
  checklist: string[]
  /**
   * Bearing-check timestamps (ISO, newest first, max 10 kept).
   * Fallback to the readiness store's score history (see CadenceCard).
   */
  checks: string[]
}

const DEFAULT_STATE: BuildPathState = {
  path: null,
  ackedSignature: null,
  checklist: [],
  checks: [],
}

const MAX_CHECKS = 10

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

function persist(state: BuildPathState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(BUILDPATH_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full / unavailable — state stays in memory */
  }
}

/**
 * Merge-over-defaults load with corrupt-JSON fallback. The legacy shape
 * ({ done, dismissed, checklist, checks }) loads as checklist/checks only —
 * old module marks do not map to canon steps, so the path starts fresh.
 */
function loadState(): BuildPathState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(BUILDPATH_STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<BuildPathState>
    return {
      path: normalizeReadinessPath(parsed.path ?? null),
      ackedSignature:
        typeof parsed.ackedSignature === 'string' ? parsed.ackedSignature : null,
      checklist: isStringArray(parsed.checklist) ? parsed.checklist : [],
      checks: isStringArray(parsed.checks) ? parsed.checks : [],
    }
  } catch {
    return DEFAULT_STATE
  }
}

/**
 * Same path, ignoring ephemeral ids/createdAt: steps content + statuses +
 * evidence + score anchor. Used to avoid no-op persists on every rebuild.
 */
function pathEquivalent(a: ReadinessPath | null, b: ReadinessPath): boolean {
  if (!a) return false
  if (pathStepsSignature(a) !== pathStepsSignature(b)) return false
  if (a.score !== b.score || a.bindingConstraint !== b.bindingConstraint) return false
  if (a.assessmentCompletedAt !== b.assessmentCompletedAt) return false
  return a.steps.every(
    (s, i) =>
      s.status === b.steps[i].status &&
      s.completedAt === b.steps[i].completedAt &&
      s.notes === b.steps[i].notes,
  )
}

/* ------------------------------------------------------------------ */
/* Provider + hook                                                     */
/* ------------------------------------------------------------------ */

export type BuildPathContextValue = {
  state: BuildPathState
  /** Live path: persisted once reconciled, fresh generation on first paint. */
  path: ReadinessPath
  /** Canon AssessmentResult adapter over the live ScoreResult. */
  assess: PathAssessment
  /** Finance snapshot fed to the engine (null when the ledger is empty). */
  finance: PathFinanceSnapshot | null
  /** True when regeneration altered the steps since the last ack. */
  pathChanged: boolean
  ackPathChange: () => void
  markDone: (id: string) => void
  undoDone: (id: string) => void
  dismiss: (id: string) => void
  undismiss: (id: string) => void
  reset: () => void
  toggleChecklist: (id: string) => void
  recordCheck: () => void
}

const BuildPathContext = createContext<BuildPathContextValue | null>(null)

export function BuildPathProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BuildPathState>(loadState)

  const { state: budgetState } = useBudget()
  const result = useAssessmentResult()
  const { manual } = useReadinessManual()
  const history = useScoreHistory()

  /* Canon: pass finance only when the user has saved finance data. */
  const finance = useMemo<PathFinanceSnapshot | null>(() => {
    const monthlyIncome = monthIncome(budgetState, 0)
    const monthlyExpenses = monthExpenses(budgetState, 0)
    const liquid = liquidSavings(budgetState)
    if (monthlyIncome + monthlyExpenses + budgetState.monthlyDebtPayments <= 0 && liquid <= 0) {
      return null
    }
    const runwayRaw = runwayMonths(budgetState)
    return {
      netCashFlow: netCashFlow(budgetState, 0),
      runwayMonths: Number.isFinite(runwayRaw) ? Math.round(runwayRaw * 100) / 100 : null,
      monthlyExpenses,
      liquidSavings: liquid,
      monthlyDebtPayments: budgetState.monthlyDebtPayments,
      monthlyIncome,
    }
  }, [budgetState])

  const assess = useMemo<PathAssessment>(
    () =>
      assessmentFromScore(result, {
        singleRedistribution: manual.partnerAlignment === null,
      }),
    [result, manual.partnerAlignment],
  )

  const assessmentCompletedAt = history.length > 0 ? history[history.length - 1].at : null

  /* The canon generator — re-run live on any ledger/slider change. */
  const fresh = useMemo(
    () => buildReadinessPath(assess, { finance, assessmentCompletedAt }),
    [assess, finance, assessmentCompletedAt],
  )

  /*
   * Reconcile the persisted path with the fresh generation:
   * carry completion across regeneration (matched by content), then run
   * canon evidence-based auto-complete. Archive the prior path only when
   * regeneration actually alters the steps (canon versions.ts, capped).
   */
  useEffect(() => {
    setState((prev) => {
      const merged = mergeStepStatuses(fresh, prev.path)
      const { path: nextPath } = evidenceBasedAutoComplete(merged, assess, finance)
      if (pathEquivalent(prev.path, nextPath)) return prev
      const regenerated =
        prev.path != null && pathStepsSignature(prev.path) !== pathStepsSignature(nextPath)
      if (regenerated && prev.path) archivePathVersion(prev.path)
      const next: BuildPathState = {
        ...prev,
        path: nextPath,
        // First-ever path: nothing to flag as "changed".
        ackedSignature: prev.path ? prev.ackedSignature : pathStepsSignature(nextPath),
      }
      persist(next)
      return next
    })
  }, [fresh, assess, finance])

  const path = state.path ?? fresh
  const pathChanged =
    state.path != null &&
    state.ackedSignature != null &&
    pathStepsSignature(state.path) !== state.ackedSignature

  const mutatePath = useCallback((fn: (p: ReadinessPath) => ReadinessPath) => {
    setState((prev) => {
      if (!prev.path) return prev
      const next = { ...prev, path: fn(prev.path) }
      persist(next)
      return next
    })
  }, [])

  const markDone = useCallback(
    (id: string) => {
      const now = new Date()
      mutatePath((p) =>
        completeStepWithEvidence(p, id, 'done', {
          kind: 'manual',
          detail: `marked done by you ${ledgerDayStamp(now)}`,
          at: now.toISOString(),
        }),
      )
    },
    [mutatePath],
  )

  const undoDone = useCallback(
    (id: string) => {
      mutatePath((p) => setPathStepStatus(p, id, 'pending'))
    },
    [mutatePath],
  )

  /* "Hide this step" → canon skipped (resolved, but never "complete"). */
  const dismiss = useCallback(
    (id: string) => {
      const now = new Date()
      mutatePath((p) =>
        completeStepWithEvidence(p, id, 'skipped', {
          kind: 'manual',
          detail: `set aside by you ${ledgerDayStamp(now)}`,
          at: now.toISOString(),
        }),
      )
    },
    [mutatePath],
  )

  const undismiss = useCallback(
    (id: string) => {
      mutatePath((p) => setPathStepStatus(p, id, 'pending'))
    },
    [mutatePath],
  )

  const ackPathChange = useCallback(() => {
    setState((prev) => {
      if (!prev.path) return prev
      const next = { ...prev, ackedSignature: pathStepsSignature(prev.path) }
      persist(next)
      return next
    })
  }, [])

  /* Reset marks + checks: steps back to pending, checklist/checks cleared. */
  const reset = useCallback(() => {
    setState((prev) => {
      const cleanPath: ReadinessPath | null = prev.path
        ? {
            ...prev.path,
            steps: prev.path.steps.map((s) => ({
              ...s,
              status: 'pending' as const,
              completedAt: null,
              notes: s.notes.split('\n\n[evidence:')[0],
            })),
          }
        : null
      const next: BuildPathState = { ...prev, path: cleanPath, checklist: [], checks: [] }
      persist(next)
      return next
    })
  }, [])

  const toggleChecklist = useCallback((id: string) => {
    setState((prev) => {
      const next = {
        ...prev,
        checklist: prev.checklist.includes(id)
          ? prev.checklist.filter((x) => x !== id)
          : [...prev.checklist, id],
      }
      persist(next)
      return next
    })
  }, [])

  const recordCheck = useCallback(() => {
    setState((prev) => {
      const next = {
        ...prev,
        checks: [new Date().toISOString(), ...prev.checks].slice(0, MAX_CHECKS),
      }
      persist(next)
      return next
    })
  }, [])

  const value = useMemo<BuildPathContextValue>(
    () => ({
      state,
      path,
      assess,
      finance,
      pathChanged,
      ackPathChange,
      markDone,
      undoDone,
      dismiss,
      undismiss,
      reset,
      toggleChecklist,
      recordCheck,
    }),
    [
      state,
      path,
      assess,
      finance,
      pathChanged,
      ackPathChange,
      markDone,
      undoDone,
      dismiss,
      undismiss,
      reset,
      toggleChecklist,
      recordCheck,
    ],
  )

  return <BuildPathContext.Provider value={value}>{children}</BuildPathContext.Provider>
}

export function useBuildPath(): BuildPathContextValue {
  const ctx = useContext(BuildPathContext)
  if (!ctx) throw new Error('useBuildPath must be used within <BuildPathProvider>')
  return ctx
}
