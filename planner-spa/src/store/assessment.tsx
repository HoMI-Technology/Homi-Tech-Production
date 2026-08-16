// =============================================================================
// store/assessment.tsx — local persistence for the canonical assessment flows.
// Adapted from canon lib/assessment/draft.ts + storage.ts + shadow-draft.ts.
// Local-only: versioned envelopes, SSR-safe guards, corrupt-JSON fallback,
// merge-over-defaults. No server calls.
// =============================================================================

import { useSyncExternalStore } from 'react'
import type { AssessmentInputs, ScoreResult } from '@/lib/score'
import type { ResponseValue } from '@/components/assessment/bank'

/* ------------------------------------------------------------------ */
/* Full assessment draft — `homi-assessment-draft-v1`                  */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_DRAFT_KEY = 'homi-assessment-draft-v1'
export const ASSESSMENT_DRAFT_VERSION = 1

export interface AssessmentDraft {
  responses: Record<string, ResponseValue>
  index: number
  updatedAt?: string
}

interface DraftEnvelope {
  version: number
  responses: Record<string, ResponseValue>
  index: number
  updatedAt: string
}

export function clampDraftIndex(index: number, maxIndexInclusive: number): number {
  if (!Number.isFinite(index)) return 0
  const max = Math.max(0, maxIndexInclusive)
  return Math.min(Math.max(0, Math.floor(index)), max)
}

/** Keep only well-formed response values (merge-over-defaults: default is {}). */
function sanitizeResponses(value: unknown): Record<string, ResponseValue> {
  if (!value || typeof value !== 'object') return {}
  const clean: Record<string, ResponseValue> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string') clean[k] = v
    else if (typeof v === 'number' && Number.isFinite(v)) clean[k] = v
  }
  return clean
}

export function draftLooksStarted(draft: Pick<AssessmentDraft, 'responses' | 'index'>): boolean {
  if (draft.index > 0) return true
  return Object.keys(draft.responses).length > 0
}

export function saveAssessmentDraft(draft: AssessmentDraft): void {
  if (typeof window === 'undefined') return
  try {
    const envelope: DraftEnvelope = {
      version: ASSESSMENT_DRAFT_VERSION,
      responses: draft.responses,
      index: draft.index,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify(envelope))
  } catch {
    // Storage full or disabled — not fatal.
  }
}

export function loadAssessmentDraft(maxStepIndex = 48): AssessmentDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ASSESSMENT_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== ASSESSMENT_DRAFT_VERSION) return null
    if (typeof parsed.index !== 'number') return null

    const draft: AssessmentDraft = {
      responses: sanitizeResponses(parsed.responses),
      index: clampDraftIndex(parsed.index, maxStepIndex),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    }
    if (!draftLooksStarted(draft)) return null
    return draft
  } catch {
    // Corrupt JSON / unreadable storage → start clean.
    return null
  }
}

export function clearAssessmentDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ASSESSMENT_DRAFT_KEY)
  } catch {
    // Ignore.
  }
}

/* ------------------------------------------------------------------ */
/* Completed result — `homi-assessment-result-v1` (canon storage.ts)   */
/* ------------------------------------------------------------------ */

export const ASSESSMENT_RESULT_KEY = 'homi-assessment-result-v1'

export type AssessmentKind = 'full' | 'shadow'

/** Snapshot of the result that was current immediately before this one was saved. */
export interface PreviousScoreSnapshot {
  score: number
  verdict: string
  completedAt: string
}

export interface StoredAssessment {
  inputs: AssessmentInputs
  result: ScoreResult
  completedAt: string
  kind: AssessmentKind
  previous?: PreviousScoreSnapshot
}

export function saveAssessmentResult(data: StoredAssessment): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ASSESSMENT_RESULT_KEY, JSON.stringify(data))
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
}

export function loadAssessmentResult(): StoredAssessment | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ASSESSMENT_RESULT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAssessment
    if (!parsed || typeof parsed !== 'object' || !parsed.inputs || !parsed.result) return null
    return parsed
  } catch {
    return null
  }
}

export function clearAssessmentResult(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ASSESSMENT_RESULT_KEY)
  } catch {
    // Ignore.
  }
}

/** Subscribe helper so the hook re-reads when another tab writes storage. */
function subscribeStorage(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', onChange)
  return () => window.removeEventListener('storage', onChange)
}

/** The last completed assessment result (full or shadow), or null. */
export function useStoredAssessmentResult(): StoredAssessment | null {
  return useSyncExternalStore(
    subscribeStorage,
    loadAssessmentResult,
    () => null,
  )
}

/* ------------------------------------------------------------------ */
/* Shadow Score draft — `homi-shadow-draft-v1` (canon shadow-draft.ts) */
/* ------------------------------------------------------------------ */

export const SHADOW_DRAFT_KEY = 'homi-shadow-draft-v1'
export const SHADOW_DRAFT_VERSION = 1

export type ShadowCreditBand = 'excellent' | 'good' | 'fair' | 'poor'

export interface ShadowDraftForm {
  monthlyGrossIncome: number | null
  monthlyDebtPayments: number | null
  emergencyFundChoice: 'lt1' | '1to3' | '3to6' | '6plus' | null
  creditBand: ShadowCreditBand | null
  confidenceLevel: number
  fomoLevel: number
  timeHorizonChoice: 'lt3' | '3to6' | '6to12' | '12plus' | null
}

export const INITIAL_SHADOW_FORM: ShadowDraftForm = {
  monthlyGrossIncome: null,
  monthlyDebtPayments: null,
  emergencyFundChoice: null,
  creditBand: null,
  confidenceLevel: 5,
  fomoLevel: 5,
  timeHorizonChoice: null,
}

export interface ShadowDraft {
  form: ShadowDraftForm
  index: number
  updatedAt?: string
}

interface ShadowEnvelope {
  version: number
  form: ShadowDraftForm
  index: number
  updatedAt: string
}

/** Merge-over-defaults: partial stored form lands on top of the initial form. */
function normalizeShadowForm(partial: Partial<ShadowDraftForm> | null | undefined): ShadowDraftForm {
  return { ...INITIAL_SHADOW_FORM, ...(partial ?? {}) }
}

export function shadowDraftLooksStarted(form: ShadowDraftForm, index: number): boolean {
  if (index > 0) return true
  return (
    form.monthlyGrossIncome !== null ||
    form.monthlyDebtPayments !== null ||
    form.emergencyFundChoice !== null ||
    form.creditBand !== null ||
    form.timeHorizonChoice !== null ||
    form.confidenceLevel !== INITIAL_SHADOW_FORM.confidenceLevel ||
    form.fomoLevel !== INITIAL_SHADOW_FORM.fomoLevel
  )
}

export function saveShadowDraft(form: ShadowDraftForm, index: number): void {
  if (typeof window === 'undefined') return
  try {
    const envelope: ShadowEnvelope = {
      version: SHADOW_DRAFT_VERSION,
      form,
      index,
      updatedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(SHADOW_DRAFT_KEY, JSON.stringify(envelope))
  } catch {
    // ignore
  }
}

export function loadShadowDraft(maxStepIndex = 5): ShadowDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SHADOW_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ShadowEnvelope> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.version !== SHADOW_DRAFT_VERSION) return null
    if (!parsed.form || typeof parsed.index !== 'number') return null

    const form = normalizeShadowForm(parsed.form)
    const index = clampDraftIndex(parsed.index, maxStepIndex)
    if (!shadowDraftLooksStarted(form, index)) return null

    return {
      form,
      index,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
    }
  } catch {
    return null
  }
}

export function clearShadowDraft(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SHADOW_DRAFT_KEY)
  } catch {
    // ignore
  }
}
