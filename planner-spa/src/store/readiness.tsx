import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { AssessmentInputs, ScoreResult, VerdictKey } from '@/lib/score'
import { clamp, computeScore } from '@/lib/score'
import {
  debtToIncome,
  runwayMonths,
  savingsRate,
  useBudget,
} from '@/store/budget'
import type { Goal } from '@/store/budget'

/* ------------------------------------------------------------------ */
/* Manual ("From you") inputs — persisted to localStorage              */
/* ------------------------------------------------------------------ */

export type ManualInputs = {
  creditScore: number
  monthlyHousingRatio?: number
  timeHorizonMonths: number
  lifeStability: number
  confidenceLevel: number
  partnerAlignment: number | null // null = "I'm doing this solo" → redistribution
  fomoLevel: number
}

export const READINESS_STORAGE_KEY = 'homi-readiness-v1'

/** First-visit defaults (design/readiness.md §5). */
export const DEFAULT_MANUAL_INPUTS: ManualInputs = {
  creditScore: 720, // Good
  monthlyHousingRatio: undefined,
  timeHorizonMonths: 9,
  lifeStability: 7,
  confidenceLevel: 7,
  partnerAlignment: 7,
  fomoLevel: 4,
}

/* ------------------------------------------------------------------ */
/* Versioned re-checks — score history (M1/M8)                         */
/* ------------------------------------------------------------------ */

export type ScoreSnapshot = {
  at: string // ISO timestamp
  score: number
  verdict: VerdictKey
  engine: 'v1'
}

/** Persisted blob shape: { manual, history } inside `homi-readiness-v1`. */
type PersistedReadiness = {
  manual: ManualInputs
  history: ScoreSnapshot[]
}

/** Append a snapshot when the score moves by at least this much. */
const SCORE_DELTA_TRIGGER = 1.0
/** …or when this much time has passed since the last snapshot. */
const RESNAPSHOT_AFTER_MS = 86_400_000 // 24h
/** Keep the most recent N re-checks. */
const HISTORY_CAP = 60

function persistReadiness(state: PersistedReadiness): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(READINESS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

function sanitizeHistory(value: unknown): ScoreSnapshot[] {
  if (!Array.isArray(value)) return []
  const clean: ScoreSnapshot[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const e = entry as Partial<ScoreSnapshot>
    if (typeof e.at !== 'string' || Number.isNaN(Date.parse(e.at))) continue
    if (typeof e.score !== 'number' || !Number.isFinite(e.score)) continue
    if (typeof e.verdict !== 'string') continue
    clean.push({ at: e.at, score: e.score, verdict: e.verdict as VerdictKey, engine: 'v1' })
  }
  return clean.slice(-HISTORY_CAP)
}

/**
 * Load + migrate. The original `homi-readiness-v1` blob was the bare
 * ManualInputs object (flat shape); the versioned shape wraps it as
 * { manual, history }. A flat blob loads cleanly and is re-wrapped on
 * the next persist.
 */
function loadPersisted(): PersistedReadiness {
  const fallback: PersistedReadiness = { manual: DEFAULT_MANUAL_INPUTS, history: [] }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(READINESS_STORAGE_KEY)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return fallback
    // New wrapped shape
    if ('manual' in parsed) {
      const wrapped = parsed as { manual?: Partial<ManualInputs>; history?: unknown }
      return {
        manual: { ...DEFAULT_MANUAL_INPUTS, ...wrapped.manual },
        history: sanitizeHistory(wrapped.history),
      }
    }
    // Legacy flat shape → wrap it (persisted in the new shape on next write)
    return {
      manual: { ...DEFAULT_MANUAL_INPUTS, ...(parsed as Partial<ManualInputs>) },
      history: [],
    }
  } catch {
    return fallback
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

type ReadinessContextValue = {
  manual: ManualInputs
  updateManual: (patch: Partial<ManualInputs>) => void
  history: ScoreSnapshot[]
}

const ReadinessContext = createContext<ReadinessContextValue | null>(null)

export function ReadinessProvider({ children }: { children: ReactNode }) {
  const [persisted, setPersisted] = useState<PersistedReadiness>(loadPersisted)
  const { manual, history } = persisted

  const updateManual = useCallback((patch: Partial<ManualInputs>) => {
    setPersisted((prev) => {
      const next = { ...prev, manual: { ...prev.manual, ...patch } }
      persistReadiness(next)
      return next
    })
  }, [])

  // Live result, computed here so re-checks are recorded from any view
  // (ReadinessProvider sits inside BudgetProvider in App.tsx).
  const derived = useBudgetDerived()
  const result = useMemo(() => computeScore(mergeInputs(manual, derived)), [manual, derived])

  // Versioned re-checks: append a snapshot when the score moves ≥1.0,
  // a new verdict is reached, or 24h passed since the last snapshot.
  useEffect(() => {
    const last = history[history.length - 1]
    const now = Date.now()
    const shouldAppend =
      !last ||
      Math.abs(result.score - last.score) >= SCORE_DELTA_TRIGGER ||
      last.verdict !== result.verdict ||
      now - Date.parse(last.at) >= RESNAPSHOT_AFTER_MS
    if (!shouldAppend) return
    const snapshot: ScoreSnapshot = {
      at: new Date(now).toISOString(),
      score: result.score,
      verdict: result.verdict,
      engine: 'v1',
    }
    const next: PersistedReadiness = {
      manual,
      history: [...history, snapshot].slice(-HISTORY_CAP),
    }
    persistReadiness(next)
    setPersisted(next)
  }, [result, manual, history])

  const value = useMemo(
    () => ({ manual, updateManual, history }),
    [manual, updateManual, history],
  )
  return <ReadinessContext.Provider value={value}>{children}</ReadinessContext.Provider>
}

export function useReadinessManual(): ReadinessContextValue {
  const ctx = useContext(ReadinessContext)
  if (!ctx) throw new Error('useReadinessManual must be used within <ReadinessProvider>')
  return ctx
}

/** Versioned re-checks, oldest → newest. */
export function useScoreHistory(): ScoreSnapshot[] {
  const ctx = useContext(ReadinessContext)
  if (!ctx) throw new Error('useScoreHistory must be used within <ReadinessProvider>')
  return ctx.history
}

/* ------------------------------------------------------------------ */
/* Budget-derived inputs (live from the ledger)                        */
/* ------------------------------------------------------------------ */

export type BudgetDerived = {
  debtToIncomeRatio: number
  savingsRate: number
  emergencyFundMonths: number
  downPaymentProgress: number
  hasHouseGoal: boolean
  houseGoal?: Goal
}

function findHouseGoal(goals: Goal[]): Goal | undefined {
  return (
    goals.find((g) => g.id === 'goal-house') ??
    goals.find((g) => /house|down.?payment/i.test(g.name))
  )
}

/** The four engine inputs computed live from the budget store (current month). */
export function useBudgetDerived(): BudgetDerived {
  const { state } = useBudget()
  return useMemo(() => {
    const houseGoal = findHouseGoal(state.goals)
    const runway = runwayMonths(state)
    return {
      debtToIncomeRatio: debtToIncome(state, 0),
      savingsRate: savingsRate(state, 0),
      // clamped 0–120; Infinity / no-outflow → 120
      emergencyFundMonths: clamp(runway === Infinity ? 120 : runway, 0, 120),
      downPaymentProgress:
        houseGoal && houseGoal.target > 0 ? clamp(houseGoal.saved / houseGoal.target, 0, 1) : 0,
      hasHouseGoal: Boolean(houseGoal),
      houseGoal,
    }
  }, [state])
}

/* ------------------------------------------------------------------ */
/* Merged assessment inputs + memoized result                          */
/* ------------------------------------------------------------------ */

/** Full 13-field AssessmentInputs: manual inputs merged with budget-derived values. */
function mergeInputs(manual: ManualInputs, derived: BudgetDerived): AssessmentInputs {
  return {
    debtToIncomeRatio: derived.debtToIncomeRatio,
    downPaymentPercent: derived.downPaymentProgress,
    emergencyFundMonths: derived.emergencyFundMonths,
    creditScore: manual.creditScore,
    lifeStability: manual.lifeStability,
    confidenceLevel: manual.confidenceLevel,
    partnerAlignment: manual.partnerAlignment,
    fomoLevel: manual.fomoLevel,
    timeHorizonMonths: manual.timeHorizonMonths,
    savingsRate: derived.savingsRate,
    downPaymentProgress: derived.downPaymentProgress,
    monthlyHousingRatio: manual.monthlyHousingRatio,
  }
}

/** Full 13-field AssessmentInputs, memoized on manual + ledger state. */
export function useAssessmentInputs(): AssessmentInputs {
  const { manual } = useReadinessManual()
  const derived = useBudgetDerived()
  return useMemo<AssessmentInputs>(() => mergeInputs(manual, derived), [manual, derived])
}

/** computeScore(inputs), memoized — recomputes on any ledger or slider change. */
export function useAssessmentResult(): ScoreResult {
  const inputs = useAssessmentInputs()
  return useMemo(() => computeScore(inputs), [inputs])
}
