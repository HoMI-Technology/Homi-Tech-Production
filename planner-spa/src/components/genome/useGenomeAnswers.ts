import { useCallback, useState } from 'react'
import type { GenomeAnswers } from '@/lib/genome'

/* ------------------------------------------------------------------ */
/* Genome answers — persisted to localStorage (homi-genome-v1).        */
/* Merge-over-defaults load with corrupt-JSON fallback, mirroring the  */
/* readiness / partner stores. Values are sanitized to integers 1–7.   */
/* ------------------------------------------------------------------ */

export const GENOME_STORAGE_KEY = 'homi-genome-v1'

function sanitize(value: unknown): GenomeAnswers {
  if (!value || typeof value !== 'object') return {}
  const out: GenomeAnswers = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    const v = Math.round(raw)
    if (v < 1 || v > 7) continue
    out[key] = v
  }
  return out
}

function loadAnswers(): GenomeAnswers {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(GENOME_STORAGE_KEY)
    if (!raw) return {}
    return sanitize(JSON.parse(raw))
  } catch {
    return {}
  }
}

function persist(answers: GenomeAnswers): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(GENOME_STORAGE_KEY, JSON.stringify(answers))
  } catch {
    /* storage unavailable — answers stay in memory */
  }
}

/** Genome answer state: questionId -> 1–7, persisted on every change. */
export function useGenomeAnswers() {
  const [answers, setAnswers] = useState<GenomeAnswers>(loadAnswers)

  const setAnswer = useCallback((questionId: string, value: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value }
      persist(next)
      return next
    })
  }, [])

  const resetAnswers = useCallback(() => {
    setAnswers(() => {
      persist({})
      return {}
    })
  }, [])

  return { answers, setAnswer, resetAnswers }
}
