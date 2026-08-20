/**
 * Gentle Interrupter — softly pauses a long user monologue with a chime and
 * a short insight. Never lectures; never advice. Chime playback lives in
 * `lib/advisor/voice.ts` (`playGentleChime`).
 */

import type { GentleInterruptDecision } from "@/types/companion";
import type { EmotionalMirrorReading } from "@/types/companion";

const LONG_MONOLOGUE_CHARS = 420;
const LONG_MONOLOGUE_WORDS = 80;

export interface InterruptContext {
  /** Live or final transcript so far. */
  transcript: string;
  /** ms the user has been speaking this turn. */
  speakingMs: number;
  /** Optional emotional read — tone shifts can warrant a soft pause. */
  emotional?: EmotionalMirrorReading;
  /** True when HōMI already has a grounded insight ready from context. */
  insightReady?: boolean;
  /** Short educational insight (not advice) to offer after the chime. */
  insightText?: string;
}

/**
 * Decide whether Homie should gently interrupt. Defaults to no — silence and
 * listening are preferred unless the user is clearly looping or drowning.
 */
export function decideGentleInterrupt(ctx: InterruptContext): GentleInterruptDecision {
  const words = ctx.transcript.trim().split(/\s+/).filter(Boolean).length;
  const chars = ctx.transcript.trim().length;

  if (ctx.insightReady && ctx.insightText && (words >= 40 || ctx.speakingMs >= 12_000)) {
    return {
      shouldInterrupt: true,
      reason: "insight_ready",
      insight: ctx.insightText,
    };
  }

  if (chars >= LONG_MONOLOGUE_CHARS || words >= LONG_MONOLOGUE_WORDS || ctx.speakingMs >= 25_000) {
    return {
      shouldInterrupt: true,
      reason: "long_monologue",
      insight:
        ctx.insightText ??
        "Can I pause you for a second? There's one thing in what you just said that deserves its own breath.",
    };
  }

  if (
    ctx.emotional &&
    (ctx.emotional.tone === "anxious" || ctx.emotional.tone === "frustrated") &&
    ctx.emotional.confidence >= 0.7 &&
    words >= 35
  ) {
    return {
      shouldInterrupt: true,
      reason: "tone_shift",
      insight:
        ctx.insightText ??
        "I'm going to gently pause us here — the feeling under your words is doing a lot of work.",
    };
  }

  return { shouldInterrupt: false, reason: "none" };
}
