/**
 * Client-side persistence for the last assessment result.
 * SSR-safe (typeof window guards), try/catch guarded, JSON-safe.
 * Anonymous users get a local copy so /results and /plan work without auth.
 */

import type { AssessmentInputs, AssessmentResult } from "@/lib/scoring";
import type { VerdictKey } from "@/lib/brand";
import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";

const STORAGE_KEY = "homi:last-assessment";

/**
 * Sidebar mirror key. The canonical constant is LATEST_VERDICT_KEY in
 * components/layout/SidebarDecisionState.tsx; it is repeated as a literal here
 * on purpose — that module is "use client", and importing one of its exports
 * into this storage layer would hand any server render path a client reference
 * proxy instead of a string. __tests__/assessment-storage.test.ts pins the two
 * spellings together so they cannot drift.
 */
const SIDEBAR_VERDICT_KEY = "homi-latest-verdict";

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
  /** Option 1: Emotional Truth omitted. Not a zeroed ring. */
  emotionalSkipped?: boolean;
}

/**
 * Mirrors the verdict + score of a stored assessment onto the sidebar's key so
 * the signed-in rail (components/layout/SidebarDecisionState.tsx, read-only by
 * construction) reflects the latest result. This is the canonical write path:
 * every save route — full assessment, onboarding replay — goes
 * through saveLocalResult and therefore through here. Packet B: kind
 * "shadow" is not a score and must never be written here.
 *
 * Its own try/catch on purpose, separate from the full-payload write: the
 * mirror is a few dozen bytes and can still land when the whole assessment blob
 * trips a storage quota.
 */
export function writeSidebarVerdict(data: StoredAssessment): void {
  if (typeof window === "undefined") return;
  try {
    const { verdict, score } = data.result;
    // NaN would stringify to null and leave the reader on a stale payload.
    if (!verdict || !Number.isFinite(score)) return;
    window.localStorage.setItem(
      SIDEBAR_VERDICT_KEY,
      JSON.stringify({
        verdict,
        score: Math.round(score),
        // 0 = held as of today. This surface only knows about the result it is
        // saving; the dashboard derives the real streak from server history
        // (lib/dashboard/insight verdictHeldDays).
        heldDays: 0,
        // The reader renders this string verbatim, so mirror the label, never
        // the enum — "HOME_BUYING" in the rail eyebrow is not shippable.
        decisionType: data.decisionType ? DECISION_TYPE_LABELS[data.decisionType] : null,
      }),
    );
  } catch {
    // Storage full, disabled, or private mode — the sidebar degrades to its
    // "Assess to begin" empty state. Never fatal.
  }
}

/**
 * Packet B neutralize. Takes `string` on purpose — not a type predicate —
 * so a reject/empty-state return does not narrow `kind` to `"full"` and
 * make later leftover-shadow checks look unintentional to tsc (TS2367).
 */
export function isShadowAssessmentKind(kind: string): boolean {
  return kind === "shadow";
}

/** True when a stored payload is a leftover score-shaped shadow read. */
export function isScoreShapedShadow(
  stored: StoredAssessment | null | undefined,
): stored is StoredAssessment {
  return !!stored && isShadowAssessmentKind(stored.kind);
}

function discardScoreShapedShadowFromDevice(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(SIDEBAR_VERDICT_KEY);
  } catch {
    // ignore
  }
}

/** Persists the last assessment result to localStorage. No-op on the server or on failure. */
export function saveLocalResult(data: StoredAssessment): void {
  if (typeof window === "undefined") return;
  // Packet B: never persist a shadow read as a score / band / verdict.
  if (isScoreShapedShadow(data)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full, disabled, or private mode — fail silently. Not fatal.
  }
  writeSidebarVerdict(data);
}

/** Loads the last assessment result from localStorage. Returns null on the server, absence, or parse failure. */
export function loadLocalResult(): StoredAssessment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAssessment;
    if (!parsed || typeof parsed !== "object" || !parsed.inputs || !parsed.result) return null;
    if (isScoreShapedShadow(parsed)) {
      discardScoreShapedShadowFromDevice();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Attaches the server-side assessments.id to the currently stored result once
 * the background POST to /api/assessments resolves. No-op if nothing is
 * stored yet (e.g. anonymous guest with no local result).
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
