/**
 * Impact Bus v1 — transient, Path-only completion feedback.
 *
 * Honesty contract:
 * - Path completion never calls computeScore and never reads or stores any
 *   HōMI-Score value. Path is not a scorer; the toast must not invent motion.
 * - The bus is not a second Path store, not a durable ledger, not a server
 *   receipt, and not evidence of remote persistence. The existing Path store
 *   (lib/readiness/store.ts) stays authoritative; the bus only describes the
 *   transition that just happened, same-tab, best-effort, latest-only.
 * - v1 wraps exactly one transition: pending → done. Skip stays on the raw
 *   store flow and never produces an impact.
 * - sessionStorage and CustomEvent.detail are untrusted input. Invalid
 *   payloads fail closed: removed, never displayed, never logged raw.
 *
 * Forbidden imports (v1): demo, cfm, finance, signals, scoring, react, and
 * the readiness barrel (it re-exports this module — circular).
 */

import { impactBus } from "@/lib/flags";
import { completePathStep, loadReadinessPath } from "./store";
import {
  summarizePathResolution,
  type PathResolutionSummary,
  type PathStatusCounts,
} from "./progress";
import type { PathMode, PathReasonCode, PathStep, ReadinessPath } from "./path";

// ---------------------------------------------------------------------------
// Transport constants
// ---------------------------------------------------------------------------

export const IMPACT_EVENT_NAME = "homi:impact:v1";
export const LAST_IMPACT_KEY = "homi:last-impact:v1";
/** Pre-versioned key from the first draft of this feature — cleared, never read. */
export const LEGACY_LAST_IMPACT_KEY = "homi:last-impact";
/** Stored payloads older than this never hydrate (protects remounts + /demo). */
export const IMPACT_HYDRATE_TTL_MS = 8_000;

// Validation bounds — payloads are generated, so these are generous ceilings,
// not UX limits. Anything beyond them is corrupt or forged input.
const MAX_ID_LENGTH = 256;
const MAX_TITLE_LENGTH = 200;
const MAX_STEP_COUNT = 50;
/** Client clocks skew; accept payloads stamped slightly in the future. */
const FUTURE_SKEW_TOLERANCE_MS = 2_000;
/** Ratios are derived exactly from counts — tolerance only absorbs float noise. */
const RATIO_TOLERANCE = 0.001;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface PathTransitionMeta {
  stepId: string;
  reasonCode: PathReasonCode;
  /** True only when no step of any category was done or skipped before this. */
  wasFirstResolution: boolean;
}

export interface PathStepImpact {
  v: 1;
  actionKind: "path_step_done";
  impactId: string;
  at: string;

  pathId: string;
  pathMode: PathMode;
  stepId: string;
  reasonCode: PathReasonCode;

  stepTitle?: string;
  nextActionableTitle?: string;
  reassessmentTitle?: string;

  before: PathResolutionSummary;
  after: PathResolutionSummary;
}

export type PathStepNoopReason = "no_path" | "step_not_found" | "already_done" | "already_skipped";

export interface PathStepNoop {
  kind: "noop";
  path: ReadinessPath | null;
  reason: PathStepNoopReason;
}

export type CompletePathStepWithImpactResult =
  | {
      kind: "completed_notified";
      path: ReadinessPath;
      transition: PathTransitionMeta;
      impact: PathStepImpact;
    }
  | {
      kind: "completed_silent";
      path: ReadinessPath;
      transition: PathTransitionMeta;
      reason: "reassessment";
    }
  | PathStepNoop;

export type CompletePathStepGuardedResult =
  | {
      kind: "completed";
      path: ReadinessPath;
      transition: PathTransitionMeta;
    }
  | PathStepNoop;

// ---------------------------------------------------------------------------
// Runtime validation — session/event payloads are untrusted
// ---------------------------------------------------------------------------

// Record<PathReasonCode, true> so adding a reason code is a compile error here.
const REASON_CODE_SET: Record<PathReasonCode, true> = {
  RUNWAY_UNDER_1_MONTH: true,
  DTI_OVER_50: true,
  HOUSING_RATIO_OVER_45: true,
  CREDIT_UNDER_620: true,
  PILLAR_FINANCIAL: true,
  PILLAR_EMOTIONAL: true,
  PILLAR_TIMING: true,
  NEGATIVE_CASHFLOW: true,
  PARTNER_ALIGNMENT: true,
  REASSESS: true,
  MAINTENANCE: true,
  READY_CELEBRATE: true,
};

const PATH_MODE_SET: Record<PathMode, true> = {
  build: true,
  ready_optional: true,
};

function isReasonCode(value: unknown): value is PathReasonCode {
  return typeof value === "string" && value in REASON_CODE_SET;
}

function isPathMode(value: unknown): value is PathMode {
  return typeof value === "string" && value in PATH_MODE_SET;
}

function boundedId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_ID_LENGTH) return null;
  return trimmed;
}

/** Optional bounded title: undefined passes, anything else must be sane. */
function boundedOptionalTitle(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) return null;
  return trimmed;
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_STEP_COUNT
  );
}

function parseCounts(raw: unknown): PathStatusCounts | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const c = raw as Partial<PathStatusCounts>;
  if (!isCount(c.total) || !isCount(c.done) || !isCount(c.skipped) || !isCount(c.pending)) {
    return null;
  }
  if (c.total !== c.done + c.skipped + c.pending) return null;
  return { total: c.total, done: c.done, skipped: c.skipped, pending: c.pending };
}

function ratioMatches(actual: unknown, expected: number): actual is number {
  return (
    typeof actual === "number" &&
    Number.isFinite(actual) &&
    actual >= 0 &&
    actual <= 1 &&
    Math.abs(actual - expected) <= RATIO_TOLERANCE
  );
}

function parseSummary(raw: unknown): PathResolutionSummary | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const s = raw as Partial<PathResolutionSummary>;
  const actionable = parseCounts(s.actionable);
  const reassessment = parseCounts(s.reassessment);
  if (!actionable || !reassessment) return null;
  const expectedCompleted = actionable.total > 0 ? actionable.done / actionable.total : 0;
  const expectedResolved =
    actionable.total > 0 ? (actionable.done + actionable.skipped) / actionable.total : 0;
  if (!ratioMatches(s.completedRatio, expectedCompleted)) return null;
  if (!ratioMatches(s.resolvedRatio, expectedResolved)) return null;
  return {
    actionable,
    reassessment,
    completedRatio: s.completedRatio,
    resolvedRatio: s.resolvedRatio,
  };
}

/**
 * Full runtime guard for untrusted payloads (sessionStorage hydration,
 * CustomEvent.detail, and defense-in-depth on our own publications).
 * Returns a clean copy or null — never throws, never logs the raw payload.
 */
export function parsePathStepImpact(raw: unknown): PathStepImpact | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Partial<PathStepImpact>;

  if (p.v !== 1) return null;
  if (p.actionKind !== "path_step_done") return null;

  const impactId = boundedId(p.impactId);
  const pathId = boundedId(p.pathId);
  const stepId = boundedId(p.stepId);
  if (!impactId || !pathId || !stepId) return null;

  if (typeof p.at !== "string") return null;
  const atMs = Date.parse(p.at);
  if (!Number.isFinite(atMs)) return null;

  if (!isPathMode(p.pathMode)) return null;
  if (!isReasonCode(p.reasonCode)) return null;

  const stepTitle = boundedOptionalTitle(p.stepTitle);
  const nextActionableTitle = boundedOptionalTitle(p.nextActionableTitle);
  const reassessmentTitle = boundedOptionalTitle(p.reassessmentTitle);
  if (stepTitle === null || nextActionableTitle === null || reassessmentTitle === null) {
    return null;
  }

  const before = parseSummary(p.before);
  const after = parseSummary(p.after);
  if (!before || !after) return null;

  return {
    v: 1,
    actionKind: "path_step_done",
    impactId,
    at: p.at,
    pathId,
    pathMode: p.pathMode,
    stepId,
    reasonCode: p.reasonCode,
    ...(stepTitle !== undefined ? { stepTitle } : {}),
    ...(nextActionableTitle !== undefined ? { nextActionableTitle } : {}),
    ...(reassessmentTitle !== undefined ? { reassessmentTitle } : {}),
    before,
    after,
  };
}

/** Fresh = stamped within the hydrate TTL and at most slightly future-dated. */
export function isFreshPathImpact(impact: PathStepImpact, nowMs: number = Date.now()): boolean {
  const age = nowMs - Date.parse(impact.at);
  return age >= -FUTURE_SKEW_TOLERANCE_MS && age < IMPACT_HYDRATE_TTL_MS;
}

// ---------------------------------------------------------------------------
// Transient transport — same-tab, latest-only, consume-once
// ---------------------------------------------------------------------------

/**
 * Publish an impact: store (best effort) then dispatch (best effort). Either
 * half failing must never undo the Path transition that already persisted.
 */
export function publishPathImpact(impact: PathStepImpact): void {
  if (typeof window === "undefined") return;
  if (!parsePathStepImpact(impact)) return;
  try {
    window.sessionStorage.setItem(LAST_IMPACT_KEY, JSON.stringify(impact));
  } catch {
    // Storage denied (private mode / quota) — the event below still delivers.
  }
  try {
    window.dispatchEvent(new CustomEvent(IMPACT_EVENT_NAME, { detail: impact }));
  } catch {
    // No listener recourse — transport is best effort by contract.
  }
}

/** Remove both the v1 key and the legacy pre-versioned key. */
export function clearStoredPathImpact(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LAST_IMPACT_KEY);
  } catch {
    // ignore
  }
  try {
    window.sessionStorage.removeItem(LEGACY_LAST_IMPACT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Atomically consume the stored impact: the key is removed BEFORE the value
 * is returned, so a remount can never replay the same payload. Invalid or
 * stale payloads are removed and swallowed.
 */
export function consumeStoredPathImpact(now: Date = new Date()): PathStepImpact | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(LAST_IMPACT_KEY);
  } catch {
    return null;
  }
  clearStoredPathImpact();
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const impact = parsePathStepImpact(parsed);
  if (!impact) return null;
  if (!isFreshPathImpact(impact, now.getTime())) return null;
  return impact;
}

// ---------------------------------------------------------------------------
// Transition — the only wrapped move is pending → done
// ---------------------------------------------------------------------------

function truncateTitle(title: string): string {
  return title.length > MAX_TITLE_LENGTH ? title.slice(0, MAX_TITLE_LENGTH) : title;
}

function buildImpactId(path: ReadinessPath, step: PathStep, at: string): string {
  return `path_step:${path.id}:${step.id}:${step.completedAt ?? at}`;
}

interface InternalTransition {
  kind: "completed";
  path: ReadinessPath;
  step: PathStep;
  before: PathResolutionSummary;
  after: PathResolutionSummary;
  transition: PathTransitionMeta;
}

function runPathStepTransition(stepId: string): InternalTransition | PathStepNoop {
  const beforePath = loadReadinessPath();
  if (!beforePath) return { kind: "noop", path: null, reason: "no_path" };

  const step = beforePath.steps.find((s) => s.id === stepId);
  if (!step) return { kind: "noop", path: beforePath, reason: "step_not_found" };

  const prior = step.status ?? "pending";
  if (prior === "done") return { kind: "noop", path: beforePath, reason: "already_done" };
  if (prior === "skipped") {
    return { kind: "noop", path: beforePath, reason: "already_skipped" };
  }

  const before = summarizePathResolution(beforePath);
  const wasFirstResolution = beforePath.steps.every((s) => (s.status ?? "pending") === "pending");

  const afterPath = completePathStep(stepId, "done");
  if (!afterPath) {
    // Store contract violated between load and write — never report success.
    return { kind: "noop", path: null, reason: "no_path" };
  }

  const afterStep = afterPath.steps.find((s) => s.id === stepId) ?? step;
  return {
    kind: "completed",
    path: afterPath,
    step: afterStep,
    before,
    after: summarizePathResolution(afterPath),
    transition: {
      stepId,
      reasonCode: afterStep.reasonCode,
      wasFirstResolution,
    },
  };
}

/**
 * Mark a Path step done and, for actionable steps, build a transient progress
 * impact. Reassessment completions are real transitions but stay silent (no
 * toast). Already-done / already-skipped / missing steps no-op with zero
 * store writes, zero events, zero second completedAt stamps.
 *
 * The caller cannot pass a status — v1 makes every other transition
 * unrepresentable.
 *
 * Publication is additionally gated on the impactBus flag: flag off means no
 * storage write and no event, while the guarded transition semantics stay
 * identical (see completePathStepGuarded).
 */
export function completePathStepWithImpact(stepId: string): CompletePathStepWithImpactResult {
  const t = runPathStepTransition(stepId);
  if (t.kind === "noop") return t;

  if (t.step.reasonCode === "REASSESS") {
    return {
      kind: "completed_silent",
      path: t.path,
      transition: t.transition,
      reason: "reassessment",
    };
  }

  const at = new Date().toISOString();
  const nextActionable = t.path.steps.find(
    (s) => s.reasonCode !== "REASSESS" && (s.status ?? "pending") === "pending",
  );
  const pendingReassess = t.path.steps.find(
    (s) => s.reasonCode === "REASSESS" && (s.status ?? "pending") === "pending",
  );

  const impact: PathStepImpact = {
    v: 1,
    actionKind: "path_step_done",
    impactId: buildImpactId(t.path, t.step, at),
    at,
    pathId: t.path.id,
    pathMode: t.path.mode,
    stepId: t.step.id,
    reasonCode: t.step.reasonCode,
    stepTitle: truncateTitle(t.step.title),
    ...(nextActionable ? { nextActionableTitle: truncateTitle(nextActionable.title) } : {}),
    ...(pendingReassess ? { reassessmentTitle: truncateTitle(pendingReassess.title) } : {}),
    before: t.before,
    after: t.after,
  };

  if (impactBus) publishPathImpact(impact);

  return {
    kind: "completed_notified",
    path: t.path,
    transition: t.transition,
    impact,
  };
}

/**
 * Flag-off manual completion: the same guarded pending → done transition with
 * duplicate protection and truthful first-resolution metadata, but no impact
 * object, no storage, no event — a narrow instrumentation/idempotency
 * correction, not a flag-controlled UX change. First valid completions behave
 * exactly as on main (one completePathStep call, one persistence push).
 */
export function completePathStepGuarded(stepId: string): CompletePathStepGuardedResult {
  const t = runPathStepTransition(stepId);
  if (t.kind === "noop") return t;
  return { kind: "completed", path: t.path, transition: t.transition };
}

// ---------------------------------------------------------------------------
// Toast copy — Path semantics only, never score semantics
// ---------------------------------------------------------------------------

/**
 * Decision table (PR #127):
 * - ready_optional → maintenance language, never "more ready".
 * - actionable pending → intermediate progress + next step.
 * - actionable skipped, none pending → "Path reviewed", skips stay visible.
 * - reassessment outstanding → protective steps done, Path not claimed done.
 * - everything done → Path steps complete.
 * Persistence honesty: "marked complete" describes the app transition; the
 * store is local-first with background LWW sync, so never "locked in",
 * "saved everywhere", or "synced".
 */
export function pathImpactToastCopy(impact: PathStepImpact): {
  title: string;
  body: string;
} {
  const a = impact.after.actionable;
  const r = impact.after.reassessment;
  const stepBit = impact.stepTitle ? `“${impact.stepTitle}” · ` : "";

  if (impact.pathMode === "ready_optional") {
    return {
      title: "Maintenance step complete",
      body: `${stepBit}Optional maintenance is marked complete. Reassess when your real inputs change.`,
    };
  }

  if (a.pending > 0) {
    const nextBit = impact.nextActionableTitle ? ` Next: ${impact.nextActionableTitle}.` : "";
    const skippedBit = a.skipped > 0 ? ` ${a.skipped} skipped.` : "";
    return {
      title: "Step marked complete",
      body: `${stepBit}${a.done} of ${a.total} protective steps marked complete.${nextBit}${skippedBit}`,
    };
  }

  if (a.skipped > 0) {
    const reassessBit = r.pending > 0 ? " Reassess when your real inputs change." : "";
    return {
      title: "Path reviewed",
      body: `${a.done} complete · ${a.skipped} skipped. Revisit skipped steps before treating the Path as complete.${reassessBit}`,
    };
  }

  if (r.pending > 0 || r.skipped > 0) {
    return {
      title: "Protective steps complete",
      body: "Your protective steps are marked complete. Reassess when your real inputs change.",
    };
  }

  return {
    title: "Path steps complete",
    body: "Every step on this Path is marked complete. Reassess again whenever the underlying inputs change.",
  };
}
