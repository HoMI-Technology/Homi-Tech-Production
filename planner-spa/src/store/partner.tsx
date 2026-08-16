import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Partner Mode state — persisted to localStorage (homi-partner-v1)    */
/* Owns ONLY the alignment-conversation checklist + last visit stamp.  */
/* Scoring state lives in @/store/readiness — never duplicated here.   */
/* ------------------------------------------------------------------ */

export const PARTNER_STORAGE_KEY = 'homi-partner-v1'

/** The alignment conversation has exactly five prompts (module spec §4). */
export const CONVERSATION_PROMPT_COUNT = 5

/** The partner's own mini-read inputs (Two full reads section). */
export type PartnerInputs = {
  creditScore: number
  timeHorizonMonths: number
  lifeStability: number
  confidenceLevel: number
  fomoLevel: number
}

export const DEFAULT_PARTNER_INPUTS: PartnerInputs = {
  creditScore: 720,
  timeHorizonMonths: 9,
  lifeStability: 7,
  confidenceLevel: 7,
  fomoLevel: 4,
}

export type PartnerState = {
  conversationChecks: boolean[]
  lastVisited: string // ISO timestamp of the last time /partner was opened
  partnerInputs: PartnerInputs
}

const DEFAULT_STATE: PartnerState = {
  conversationChecks: Array.from({ length: CONVERSATION_PROMPT_COUNT }, () => false),
  lastVisited: '',
  partnerInputs: DEFAULT_PARTNER_INPUTS,
}

/** Merge-over-defaults with corrupt-JSON fallback (mirrors store/readiness). */
function loadState(): PartnerState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(PARTNER_STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<PartnerState>
    return {
      conversationChecks: Array.from({ length: CONVERSATION_PROMPT_COUNT }, (_, i) =>
        Boolean(Array.isArray(parsed.conversationChecks) ? parsed.conversationChecks[i] : false),
      ),
      lastVisited: typeof parsed.lastVisited === 'string' ? parsed.lastVisited : '',
      partnerInputs: { ...DEFAULT_PARTNER_INPUTS, ...(parsed.partnerInputs ?? {}) },
    }
  } catch {
    return DEFAULT_STATE
  }
}

function persist(state: PartnerState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — state stays in memory */
  }
}

type PartnerContextValue = {
  checks: boolean[]
  lastVisited: string
  partnerInputs: PartnerInputs
  toggleCheck: (index: number) => void
  /** Stamps lastVisited (ISO) — called once when the partner page mounts. */
  markVisited: () => void
  updatePartnerInputs: (patch: Partial<PartnerInputs>) => void
}

const PartnerContext = createContext<PartnerContextValue | null>(null)

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PartnerState>(loadState)

  const toggleCheck = useCallback((index: number) => {
    setState((prev) => {
      if (index < 0 || index >= CONVERSATION_PROMPT_COUNT) return prev
      const conversationChecks = prev.conversationChecks.map((c, i) => (i === index ? !c : c))
      const next = { ...prev, conversationChecks }
      persist(next)
      return next
    })
  }, [])

  const markVisited = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, lastVisited: new Date().toISOString() }
      persist(next)
      return next
    })
  }, [])

  const updatePartnerInputs = useCallback((patch: Partial<PartnerInputs>) => {
    setState((prev) => {
      const next = { ...prev, partnerInputs: { ...prev.partnerInputs, ...patch } }
      persist(next)
      return next
    })
  }, [])

  const value = useMemo<PartnerContextValue>(
    () => ({
      checks: state.conversationChecks,
      lastVisited: state.lastVisited,
      partnerInputs: state.partnerInputs,
      toggleCheck,
      markVisited,
      updatePartnerInputs,
    }),
    [state, toggleCheck, markVisited, updatePartnerInputs],
  )

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>
}

export function usePartner(): PartnerContextValue {
  const ctx = useContext(PartnerContext)
  if (!ctx) throw new Error('usePartner must be used within <PartnerProvider>')
  return ctx
}
