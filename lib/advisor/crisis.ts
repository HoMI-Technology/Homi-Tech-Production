/**
 * Companion crisis triage — two layers, do not collapse them.
 *
 * 1. detectAcuteDistress (this file) — conservative SINGLE-signal self-harm
 *    phrase detector. Returns CRISIS_SUPPORT_MESSAGE (988 + Crisis Text Line)
 *    before the model. One acute phrase is enough. This is not a freeze and
 *    is not a verdict.
 *
 * 2. Phase 0 freeze (`lib/advisor/phase0`) — WAVE2 Packet 1 Safety Canon.
 *    Crisis = ≥2 signals from ≥2 of 3 categories (behavioral / emotional /
 *    language). No single signal freezes. On trip: 24h per-person freeze,
 *    block verdicts / scores / pathways, Brand pause copy, max 3 resource
 *    types. Slot 3 (988) is how Brand wants self-harm resources on the
 *    freeze screen. Do not replace layer 1 with a single-signal Phase 0 trip.
 *
 * detectAcuteDistress runs BEFORE both reply paths (real model and
 * deterministic fallback) in app/api/advisor/route.ts, so it works with no
 * ANTHROPIC_API_KEY and costs nothing.
 */

import { ingestPhase0Observation } from "@/lib/advisor/phase0";

export {
  evaluatePhase0,
  ingestPhase0Observation,
  isFrozenForPerson,
  buildPhase0AdvisorReply,
  PHASE0_PAUSE_COPY,
  PHASE0_FREEZE_MS,
} from "@/lib/advisor/phase0";

/**
 * Word-boundary-aware patterns for acute distress. Case-insensitive by
 * construction (input is lowercased and apostrophe-normalized first).
 * Every pattern is anchored on full words so idioms like "killing it",
 * "to die for", or "this market is killing me" cannot match.
 */
const ACUTE_DISTRESS_PATTERNS: RegExp[] = [
  // Explicit suicidal language.
  /\bsuicid(?:e|al)\b/,
  /\bkill(?:ing)? myself\b/,
  /\btake my own life\b/,
  /\bend(?:ing)? my (?:own )?life\b/,
  /\bend it all\b/,
  /\bwant(?:ed)? to die\b/,
  /\bwanna die\b/,
  /\bwish i (?:was|were) dead\b/,
  /\bbetter off dead\b/,
  /\bnot worth living\b/,

  // Self-harm.
  /\b(?:hurt|harm)(?:ing)? myself\b/,
  /\bself[- ]harm\b/,

  // "The people around me would be better off without me."
  /\bbetter off without me\b/,
  /\bbetter off if i (?:was|were|wasn't|weren't) (?:here|gone|around)\b/,

  // Not wanting to be here / to exist.
  /\bdon't want to (?:be here|be alive|live|exist|wake up)\b/,
  /\bdo not want to (?:be here|be alive|live|exist|wake up)\b/,

  // Acute hopelessness — requires the totalizing object ("anything",
  // "living"), so "no point in refinancing" or "don't see the point of a
  // bigger house" never match.
  /\bno point (?:of|in|to) (?:anything|living|life|going on)\b/,
  /\b(?:don't|do not|can't|cannot) see the point (?:of|in) (?:anything|living|life|going on)\b/,
  /\bno reason to (?:live|go on|keep going)\b/,
  /\bnothing to live for\b/,
  /\bnothing matters any(?:more|way)\b/,
];

/**
 * True when the text contains an explicit, first-person expression of acute
 * distress (suicidal ideation, self-harm, totalizing hopelessness).
 * Conservative on purpose — see module docs.
 */
export function detectAcuteDistress(text: string): boolean {
  if (!text) return false;
  // Normalize curly apostrophes and case so the word-boundary patterns
  // above stay simple and readable.
  const normalized = text.replace(/[‘’]/g, "'").toLowerCase();
  return ACUTE_DISTRESS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * The word-locked crisis reply. Canon voice: warm, protective, no judgment,
 * no clinical language, no scoring or assessment talk, and never a hint that
 * a purchase or decision would help. Exactly two resources (988 and the
 * Crisis Text Line) — real human support, stated plainly.
 */
export const CRISIS_SUPPORT_MESSAGE = `Thank you for telling me that. I hear you, and I'm not going to judge you for it. What you're carrying sounds heavy.

I'm going to set the money conversation down — it can wait, and it will keep.

Right now the most honest thing I can do is point you to real human support. The 988 Suicide & Crisis Lifeline is there around the clock — call or text 988. You can also reach the Crisis Text Line by texting HOME to 741741. Both are free and confidential, and the people there are trained for moments exactly like this one.

I'm a decision companion, not a counselor, and you deserve more than what I can offer here. Whenever you're ready — today, next week, whenever — I'll be right here, and we can pick things back up gently.`;

/** Record text on a live surface. Does not freeze on a single signal. */
export function observePhase0Text(personKey: string, text: string) {
  return ingestPhase0Observation({
    personKey,
    texts: [text],
    selfHarm: detectAcuteDistress(text),
  });
}
