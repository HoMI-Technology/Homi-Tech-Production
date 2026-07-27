/**
 * Path funnel analytics — occurrence-style events only.
 * Never pass scores, free-text PII, or raw assessment answers.
 * Verdict keys (READY | …) are allowed as coarse enums (matches verdict_shown).
 */

import { track } from "@/lib/analytics";
import type { PathMode } from "./path";
import type { Verdict as ScoringVerdict } from "@/lib/scoring";
import type { PathHabitStage, PathHabitSurface } from "./habit";

export type PathFunnelSource =
  | "results_auto"
  | "results_manual"
  | "path_page"
  | "scenario"
  | "dashboard_nudge"
  | "household"
  | "unknown";

/**
 * Habit funnel (ordered for admin dashboards):
 * verdict_shown (existing) → path_generated → path_habit_impression →
 * path_page_viewed → path_start_step_clicked → path_first_step_done
 */
export const PATH_HABIT_FUNNEL_EVENTS = [
  "path_generated",
  "path_habit_impression",
  "path_page_viewed",
  "path_start_step_clicked",
  "path_first_step_done",
] as const;

/** Funnel: assessment result shown → path offered → generated → saved → calendar → first step */
export const PATH_FUNNEL_EVENTS = {
  pathOffered: "path_offered",
  pathGenerated: "path_generated",
  pathSaved: "path_saved",
  pathCalendarCommitted: "path_calendar_committed",
  pathStepDone: "path_step_done",
  pathStepSkipped: "path_step_skipped",
  pathStepEvidence: "path_step_evidence",
  pathFirstStepNudge: "path_first_step_nudge",
  pathFirstStepDone: "path_first_step_done",
  pathExported: "path_exported",
  pathVersioned: "path_versioned",
  pathAutoCompleted: "path_auto_completed",
  preflightRun: "preflight_run",
  householdInviteSent: "household_invite_sent",
  householdJoined: "household_joined",
  pathPricingExposure: "path_pricing_exposure",
  pathHabitImpression: "path_habit_impression",
  pathPageViewed: "path_page_viewed",
  pathStartStepClicked: "path_start_step_clicked",
  pathReturnVisit: "path_return_visit",
} as const;

export function trackPathOffered(props: {
  source: PathFunnelSource;
  verdict: ScoringVerdict | string;
  hardStopCount: number;
}): void {
  track(PATH_FUNNEL_EVENTS.pathOffered, {
    source: props.source,
    verdict: String(props.verdict),
    hard_stop_count: props.hardStopCount,
  });
}

export function trackPathGenerated(props: {
  source: PathFunnelSource;
  verdict: string;
  mode: PathMode | string;
  stepCount: number;
  auto?: number;
}): void {
  track(PATH_FUNNEL_EVENTS.pathGenerated, {
    source: props.source,
    verdict: props.verdict,
    mode: props.mode,
    step_count: props.stepCount,
    auto: props.auto ?? 0,
  });
}

export function trackPathSaved(props: {
  source: PathFunnelSource;
  stepCount: number;
}): void {
  track(PATH_FUNNEL_EVENTS.pathSaved, {
    source: props.source,
    step_count: props.stepCount,
  });
}

export function trackPathCalendarCommitted(props: {
  inserted: number;
  verdict: string;
}): void {
  track(PATH_FUNNEL_EVENTS.pathCalendarCommitted, {
    inserted: props.inserted,
    verdict: props.verdict,
  });
}

export function trackPathStepDone(props: {
  reasonCode: string;
  evidence: string;
  firstStep: number;
}): void {
  track(PATH_FUNNEL_EVENTS.pathStepDone, {
    reason_code: props.reasonCode,
    evidence: props.evidence,
    first_step: props.firstStep,
  });
  if (props.firstStep === 1) {
    track(PATH_FUNNEL_EVENTS.pathFirstStepDone, {
      reason_code: props.reasonCode,
    });
  }
}

export function trackPathFirstStepNudge(props: { ageHours: number }): void {
  track(PATH_FUNNEL_EVENTS.pathFirstStepNudge, {
    age_hours: props.ageHours,
  });
}

export function trackPathExported(props: { format: string }): void {
  track(PATH_FUNNEL_EVENTS.pathExported, { format: props.format });
}

export function trackPathPricingExposure(props: {
  experiment: string;
  variant: string;
}): void {
  track(PATH_FUNNEL_EVENTS.pathPricingExposure, {
    experiment: props.experiment,
    variant: props.variant,
  });
}

/** Dashboard / results / path — user saw the habit surface. */
export function trackPathHabitImpression(props: {
  surface: PathHabitSurface;
  stage: PathHabitStage;
  verdict?: string;
}): void {
  track(PATH_FUNNEL_EVENTS.pathHabitImpression, {
    surface: props.surface,
    stage: props.stage,
    ...(props.verdict ? { verdict: props.verdict } : {}),
  });
}

/** Full /path page open. */
export function trackPathPageViewed(props: {
  stage: PathHabitStage;
  pendingSteps: number;
  mode: PathMode | string;
}): void {
  track(PATH_FUNNEL_EVENTS.pathPageViewed, {
    stage: props.stage,
    pending_steps: props.pendingSteps,
    mode: String(props.mode),
  });
}

/** User clicked Start step / Open tool from a habit surface. */
export function trackPathStartStepClicked(props: {
  surface: PathHabitSurface;
  reasonCode: string;
}): void {
  track(PATH_FUNNEL_EVENTS.pathStartStepClicked, {
    surface: props.surface,
    reason_code: props.reasonCode,
  });
}

/** Incomplete path revisited after ≥1 day. */
export function trackPathReturnVisit(props: {
  stage: PathHabitStage;
  ageDays: number;
}): void {
  track(PATH_FUNNEL_EVENTS.pathReturnVisit, {
    stage: props.stage,
    age_days: props.ageDays,
  });
}
