/**
 * Deterministic fallback letter builder for the Temporal Twin — used when
 * ANTHROPIC_API_KEY is absent or the model call fails. Writes as the user's
 * future self, addressing present-day them, grounded in their real scores.
 * Not a lesser experience by design: distinct composition per
 * verdict x horizon (12 combinations), personalized with their numbers.
 */

import { VERDICT_META, type VerdictKey } from "@/lib/brand";

export type Horizon = "5" | "10" | "retirement";

export interface TwinAssessmentContext {
  score: number;
  verdict: VerdictKey;
  weakestPillar: { name: string; pct: number };
  hardStops: string[];
}

export interface TwinFallbackInput {
  horizon: Horizon;
  fear?: string;
  assessment: TwinAssessmentContext;
}

function horizonLabel(horizon: Horizon): string {
  if (horizon === "5") return "five years from now";
  if (horizon === "10") return "ten years from now";
  return "the year I retired";
}

function horizonSignature(horizon: Horizon): string {
  if (horizon === "5")
    return "Five years is short enough that I remember this exact moment like it was last week.";
  if (horizon === "10")
    return "Ten years does something strange to memory — long enough to change everything, short enough that I still recognize your handwriting in the choices you're about to make.";
  return "I'm writing from the other side of the working years, where the decisions stop being about growth and start being about what you get to keep.";
}

function fearLine(fear: string | undefined, horizon: Horizon): string {
  if (!fear || !fear.trim()) return "";
  const clean = fear.trim();
  const timeWord = horizon === "retirement" ? "all these years" : `these ${horizon} years`;
  return ` You told me you were afraid of ${clean.toLowerCase().replace(/\.$/, "")}. I want you to know I carried that fear with you through ${timeWord}, and I can tell you exactly what became of it.`;
}

// ---------------------------------------------------------------------------
// Verdict-specific voice blocks — each returns the emotional core of the
// letter body, composed with horizon framing and numbers.
// ---------------------------------------------------------------------------

function readyBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === "retirement"
      ? "The house stopped being a decision a long time ago. It became the quiet backdrop to everything else you built. That's what readiness buys you — not excitement, just room."
      : "The house isn't the headline of my life, and that's exactly the point. It became furniture — load-bearing, unremarkable, mine. That's what an 80-plus score actually feels like from the inside: not triumph, just quiet certainty that compounds.";
  return (
    `Back then, your score was ${ctx.score} — READY, with ${ctx.weakestPillar.name} as your only soft spot at ${ctx.weakestPillar.pct}%. ` +
    `Everything else lined up, and I remember you double-checking that, almost disappointed there wasn't a catch. There wasn't. ` +
    `${closing}`
  );
}

function almostBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === "retirement"
      ? "Looking back, the gap you were staring at was smaller than it felt. It closed itself, mostly through time doing what time does."
      : "The gap closed faster than you expected, mostly because you stopped staring at it and just kept doing the boring, consistent things.";
  return (
    `You were at ${ctx.score} — ALMOST THERE — with ${ctx.weakestPillar.name} sitting at ${ctx.weakestPillar.pct}%, the one place the picture wasn't finished yet. ` +
    `I know it felt like standing at a door that was open three-quarters of the way. ${closing} ` +
    `The waiting wasn't wasted time. It was the last few reps before the thing that mattered.`
  );
}

function buildFirstBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === "retirement"
      ? "The building years don't show up in any highlight reel, but they're the years I'd protect first if I had to choose."
      : "I won't pretend the building phase was fun. It wasn't. But it was load-bearing in a way the purchase itself never could have been.";
  return (
    `Your score was ${ctx.score} — BUILD FIRST — and ${ctx.weakestPillar.name} was the honest reason why, sitting at just ${ctx.weakestPillar.pct}%. ` +
    `That verdict wasn't a rejection. It was a blueprint, and you followed it more faithfully than I think you gave yourself credit for at the time. ` +
    `${closing}`
  );
}

function notYetBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const hardStopLine =
    ctx.hardStops.length > 0
      ? ` The specific thing that stopped you — ${ctx.hardStops[0]} — turned out to be exactly the kind of thing worth stopping for.`
      : "";
  const closing =
    horizon === "retirement"
      ? "I've had decades to sit with that NOT YET, and I've never once resented it. It was the version of protection that only shows its value in hindsight."
      : "I know NOT YET felt like a door closing. It wasn't. It was a hand on your shoulder, and I'm grateful for it every time I think back to that year.";
  return (
    `Your score read ${ctx.score} — NOT YET — with ${ctx.weakestPillar.name} at ${ctx.weakestPillar.pct}%, the clearest signal in the room.${hardStopLine} ` +
    `${closing}`
  );
}

const BODY_BUILDERS: Record<VerdictKey, (ctx: TwinAssessmentContext, horizon: Horizon) => string> =
  {
    READY: readyBody,
    ALMOST_THERE: almostBody,
    BUILD_FIRST: buildFirstBody,
    NOT_YET: notYetBody,
  };

function askLine(verdict: VerdictKey, horizon: Horizon): string {
  const asks: Record<VerdictKey, string> = {
    READY:
      "So here's my one ask of you: move deliberately, not blindly. Read every page before you sign it, even the boring ones. Certainty is not the same as haste.",
    ALMOST_THERE:
      "So here's my one ask of you: don't rush the last stretch just because the finish line is visible. Close the specific gap you already know about, on purpose, before you act.",
    BUILD_FIRST:
      "So here's my one ask of you: pick the one number you can actually move this month, and move it. Not all of them — one. The rest will follow faster than you think.",
    NOT_YET:
      "So here's my one ask of you: don't treat this NOT YET as a verdict on your worth. Treat it as information, write down today's number, and check it again in ninety days — not out of anxiety, just honesty.",
  };
  const horizonNote =
    horizon === "retirement"
      ? " I know it's strange to hear that from someone this far down the road, but it mattered then and it matters now."
      : "";
  return `${asks[verdict]}${horizonNote}`;
}

function salutation(horizon: Horizon): string {
  if (horizon === "retirement") return "A letter from the you who made it to retirement";
  return `A letter from you, ${horizonLabel(horizon)}`;
}

export interface TwinLetter {
  salutation: string;
  paragraphs: string[];
}

/**
 * Builds a full fallback letter: salutation + 3-4 paragraphs, ~250-350
 * words, ending with a single concrete ask. Deterministic, no external
 * calls, distinct per verdict x horizon combination (composition, not
 * template-per-combination, but the resulting text differs meaningfully
 * across all 12 pairs).
 */
export function buildFallbackLetter(input: TwinFallbackInput): TwinLetter {
  const { horizon, fear, assessment } = input;
  const meta = VERDICT_META[assessment.verdict];
  const body = BODY_BUILDERS[assessment.verdict](assessment, horizon);
  const fearAddendum = fearLine(fear, horizon);

  const opening = `Hi. It's me — you, from ${horizonLabel(horizon)}. ${horizonSignature(horizon)}`;
  const middle = `${body}${fearAddendum}`;
  const reflection = `"${meta.line}" That's still true from here, by the way. It doesn't stop being true just because time passes — it just gets easier to see clearly.`;
  const ask = askLine(assessment.verdict, horizon);

  return {
    salutation: salutation(horizon),
    paragraphs: [opening, middle, reflection, ask],
  };
}
