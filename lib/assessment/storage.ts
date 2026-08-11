/**
 * Client-side persistence for the last assessment result.
 * SSR-safe (typeof window guards), try/catch guarded, JSON-safe.
 * Anonymous users get a local copy so /results and /plan work without auth.
 */

import type { AssessmentInputs, AssessmentResult } from "@/lib/scoring";
import type { VerdictKey } from "@/lib/brand";
import type { DecisionType } from "@/lib/assessment/types";

const STORAGE_KEY = "homi:last-assessment";

export type AssessmentKind = "full" | "shadow";

/** Local record of a "deciding anyway" verdict override. Never changes score/verdict. */
export interface StoredOverride {
  at: string;
  acknowledgedHardStops: boolean;
}

/** Snapshot of the assessment that was current immediately before this one was saved. */
export interface PreviousScoreSnapshot {
  score: number;
  verdict: VerdictKey;
  completedAt: string;
  /**
   * Raw pillar totals of the previous result — powers the "why did this
   * change" explanation. Optional: snapshots saved before this field existed
   * only carry the composite, and the explanation degrades honestly.
   */
  pillars?: {
    financial: number;
    emotional: number;
    timing: number;
  };
}

/** Server-generated insight strings (Plans.md 6.3) — never recompute on the client. */
export interface StoredInsights {
  keyInsight: string;
  nextSteps: string[];
}

export interface StoredAssessment {
  inputs: AssessmentInputs;
  result: AssessmentResult;
  completedAt: string;
  kind: AssessmentKind;
  /** Decision vertical that produced this result — required for honest retry/replay. */
  decisionType?: DecisionType;
  /** Server-side assessments.id, attached once the background save resolves (signed-in users only). */
  serverId?: string;
  /** Present once the user has confirmed "I'm deciding anyway" for this result. */
  override?: StoredOverride;
  /** The score/verdict that was stored immediately before this result overwrote it, if any. */
  previous?: PreviousScoreSnapshot;
  /**
   * Insight copy produced with the score on the server (or backfilled via
   * /api/scoring). Optional for pre-6.3 local payloads — UI must not crash.
   */
  insights?: StoredInsights;
}

/** Persists the last assessment result to localStorage. No-op on the server or on failure. */
export function saveLocalResult(data: StoredAssessment): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
}

/** Loads the last assessment result from localStorage. Returns null on the server, absence, or parse failure. */
export function loadLocalResult(): StoredAssessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAssessment;
    if (!parsed || typeof parsed !== "object" || !parsed.inputs || !parsed.result) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Clears the stored assessment result. No-op on the server or on failure. */
export function clearLocalResult(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
}

/**
 * Attaches the server-side assessments.id to the currently stored result once
 * the background POST to /api/assessments resolves. No-op if nothing is
 * stored yet (e.g. anonymous shadow score with no local result).
 */
export function attachServerId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadLocalResult();
    if (!current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, serverId: id }));
  } catch {
    // Not fatal — override POST simply falls back to local-only recording.
  }
}

/**
 * Records that the user chose to proceed despite the verdict ("I'm deciding
 * anyway"). Purely additive — never mutates inputs/result/score. No-op on
 * the server, on failure, or if nothing is stored yet.
 */
export function saveOverride(override: StoredOverride): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadLocalResult();
    if (!current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, override }));
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
}

/** Loads the recorded override for the current stored result, if any. */
export function loadOverride(): StoredOverride | null {
  return loadLocalResult()?.override ?? null;
}
