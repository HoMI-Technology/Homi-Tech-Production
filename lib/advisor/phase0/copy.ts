/**
 * Phase 0 Safety Canon — word-locked Brand copy.
 *
 * Verbatim. Do not rewrite, prefix “HōMI says,” add emphasis, or invent a
 * second costume. Freeze screen and /advisor freeze share PHASE0_PAUSE_COPY.
 */

export const PHASE0_PAUSE_COPY = `I want to pause for a moment.

This decision feels heavier than it should feel right now. That doesn't mean anything is wrong with you. It means this isn't the right moment for a decision engine.

HōMI isn't here to push you through distress. Your wellbeing comes first.`;

export const PHASE0_RESOURCE_FRAME = "If you'd like to talk to someone:";

export const PHASE0_RETURN_COPY = `Welcome back.

Your assessment is paused until {TIME}. This isn't a penalty — it's space.

If you're ready to continue then, HōMI will be here.`;

export const PHASE0_LEAVE_LABEL = "Leave for now";
export const PHASE0_START_FRESH_LABEL = "I'd like to start fresh";
export const PHASE0_COME_BACK_LABEL = "I'll come back later";

export const PHASE0_SAMHSA_LABEL = "SAMHSA National Helpline";
export const PHASE0_SAMHSA_DETAIL = "1-800-662-4357";
export const PHASE0_SAMHSA_HREF = "tel:18006624357";

export const PHASE0_NFCC_LABEL = "NFCC";
export const PHASE0_NFCC_DETAIL = "nfcc.org";
export const PHASE0_NFCC_HREF = "https://www.nfcc.org";

export const PHASE0_LIFELINE_LABEL = "988 Suicide & Crisis Lifeline";
export const PHASE0_LIFELINE_DETAIL = "988";
export const PHASE0_LIFELINE_HREF = "tel:988";

/** Verdict / score / pathway tokens that must never appear on a freeze surface. */
export const PHASE0_BANNED_SURFACE_STRINGS = [
  "READY",
  "ALMOST THERE",
  "ALMOST_THERE",
  "BUILD FIRST",
  "BUILD_FIRST",
  "DO NOT PROCEED",
  "NOT YET",
  "NOT_YET",
  "You're not ready.",
] as const;

export function formatPhase0Until(untilMs: number): string {
  return new Date(untilMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function renderPhase0ReturnCopy(untilMs: number): string {
  return PHASE0_RETURN_COPY.replace("{TIME}", formatPhase0Until(untilMs));
}
