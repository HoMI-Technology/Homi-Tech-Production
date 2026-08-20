/**
 * Emotional Mirror — reads voice/transcript cues and reflects emotional state
 * in companion voice. Heuristic only: never diagnoses, never therapy language.
 */

import type { EmotionalMirrorReading, EmotionalTone } from "@/types/companion";

const TONE_PATTERNS: Array<{
  tone: EmotionalTone;
  patterns: RegExp[];
  reflection: string;
}> = [
  {
    tone: "anxious",
    patterns: [
      /\b(worried|anxious|panic|scared|afraid|stress(ed)?|overwhelm(ed)?)\b/i,
      /\b(what if|can't sleep|spiral(ing)?)\b/i,
    ],
    reflection:
      "I can hear the tension in what you're carrying. Naming it doesn't make it worse — it just makes it visible.",
  },
  {
    tone: "frustrated",
    patterns: [
      /\b(frustrated|annoyed|angry|fed up|stuck|unfair|ridiculous)\b/i,
      /\b(nothing works|so tired of|again)\b/i,
    ],
    reflection:
      "There's real friction in your words. We can sit with that without rushing past it.",
  },
  {
    tone: "hopeful",
    patterns: [
      /\b(hope(ful)?|excited|optimistic|looking forward|finally|ready to)\b/i,
      /\b(good news|feels possible|turning a corner)\b/i,
    ],
    reflection:
      "There's lift in how you're talking about this. Hope is data too — we'll keep it honest.",
  },
  {
    tone: "uncertain",
    patterns: [
      /\b(not sure|unsure|confused|don't know|maybe|unclear|torn)\b/i,
      /\b(on the fence|either way|hard to tell)\b/i,
    ],
    reflection:
      "Uncertainty is showing up clearly. We don't have to force a clean answer today.",
  },
  {
    tone: "calm",
    patterns: [/\b(calm|okay|alright|steady|clear|settled|peaceful)\b/i],
    reflection: "Your tone sounds grounded. We can move carefully from here.",
  },
];

/**
 * Infer an emotional register from transcript text (and optional speech rate).
 * `speechRateWpm` — if provided, very fast speech nudges toward anxious;
 * very slow toward uncertain. Never overrides strong lexical signals.
 */
export function readEmotionalMirror(
  transcript: string,
  speechRateWpm?: number,
): EmotionalMirrorReading {
  const text = transcript.trim();
  const signals: string[] = [];

  if (!text) {
    return {
      tone: "steady",
      confidence: 0.2,
      reflection: "I'm here with you — take the pace you need.",
      signals: ["empty"],
    };
  }

  for (const entry of TONE_PATTERNS) {
    for (const re of entry.patterns) {
      if (re.test(text)) {
        signals.push(entry.tone);
        let confidence = 0.55 + Math.min(0.35, signals.length * 0.1);
        if (speechRateWpm != null) {
          if (entry.tone === "anxious" && speechRateWpm > 170) confidence = Math.min(0.95, confidence + 0.1);
          if (entry.tone === "uncertain" && speechRateWpm < 90) confidence = Math.min(0.95, confidence + 0.08);
        }
        return {
          tone: entry.tone,
          confidence,
          reflection: entry.reflection,
          signals,
        };
      }
    }
  }

  if (speechRateWpm != null && speechRateWpm > 180) {
    return {
      tone: "anxious",
      confidence: 0.4,
      reflection:
        "Your words are coming quickly — that often means something important is pressing. We can slow down together.",
      signals: ["fast_speech"],
    };
  }

  return {
    tone: "steady",
    confidence: 0.35,
    reflection: "I'm listening. Your pace feels steady enough to stay present with.",
    signals: ["default"],
  };
}
