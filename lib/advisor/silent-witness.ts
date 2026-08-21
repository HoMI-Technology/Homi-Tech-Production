/**
 * Silent Witness — sometimes HōMI says nothing. Presence is the behavior.
 */

import type { SilentWitnessDecision } from "@/types/companion";
import type { EmotionalMirrorReading } from "@/types/companion";

export interface SilentWitnessContext {
  /** User explicitly asked HōMI to just sit with them / be quiet. */
  askedForSilence?: boolean;
  /** Last assistant message was a hard truth (NOT YET, hard stop, etc.). */
  afterHardTruth?: boolean;
  /** Emotional read suggests the user is mid-feeling, not mid-question. */
  emotional?: EmotionalMirrorReading;
  /** User utterance is purely expressive (no question mark / ask). */
  utterance: string;
  /**
   * Stochastic presence: 0–1 roll from caller (injectable for tests).
   * When >= threshold and other cues allow, remain silent.
   */
  presenceRoll?: number;
}

const SILENCE_ASK =
  /\b(just sit|be (here|quiet|with me)|don't (say|talk)|no advice|silence|witness)\b/i;

/**
 * Decide whether this turn should be presence-only (no spoken / chat reply).
 */
export function decideSilentWitness(ctx: SilentWitnessContext): SilentWitnessDecision {
  const text = ctx.utterance.trim();
  if (!text) {
    return { remainSilent: true, reason: "presence" };
  }

  if (ctx.askedForSilence || SILENCE_ASK.test(text)) {
    return { remainSilent: true, reason: "presence" };
  }

  if (ctx.afterHardTruth && !/\?/.test(text) && text.split(/\s+/).length < 24) {
    return { remainSilent: true, reason: "after_hard_truth" };
  }

  // Occasional pure presence (~12% when roll provided and utterance is short).
  const roll = ctx.presenceRoll;
  if (
    typeof roll === "number" &&
    roll >= 0.88 &&
    text.split(/\s+/).length <= 12 &&
    !/\?/.test(text)
  ) {
    return { remainSilent: true, reason: "presence" };
  }

  // Mid-feeling without a question — soft presence cue, but only when the
  // caller injected a high presence roll (keeps Emotional Mirror as default).
  const processing =
    ctx.emotional &&
    (ctx.emotional.tone === "anxious" || ctx.emotional.tone === "frustrated") &&
    !/\?/.test(text) &&
    !/\b(what|how|should|can|will|why)\b/i.test(text);

  if (processing && typeof roll === "number" && roll >= 0.7) {
    return { remainSilent: true, reason: "user_processing" };
  }

  return { remainSilent: false, reason: "none" };
}
