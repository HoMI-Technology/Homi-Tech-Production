/* ------------------------------------------------------------------ */
/* Companion intelligence — deterministic Trinity debate + Temporal    */
/* Twin letters. Verbatim port of GitHub canon                          */
/* lib/trinity/fallback.ts + lib/twin/fallback.ts (source of truth).   */
/* No LLM calls — this IS the deterministic fallback layer, presented  */
/* honestly. Pure module, no side effects.                             */
/*                                                                     */
/* Local adaptations (field access only — copy is verbatim):           */
/*  - canon AssessmentResult.financial.total → our ScoreResult         */
/*    .pillars.financial.total (normalized to /100 for the copy)       */
/*  - canon hardStops: string[] messages → our HardStopKey[] mapped    */
/*    through HARD_STOP_MESSAGES                                       */
/* ------------------------------------------------------------------ */

import { HARD_STOP_MESSAGES, VERDICT_META } from '@/lib/score'
import type { ScoreResult, VerdictKey } from '@/lib/score'

/* ============================ TRINITY ============================== */
/* Port of canon lib/trinity/fallback.ts                               */

export interface TrinityPillars {
  financial: number
  emotional: number
  timing: number
}

export interface TrinityAssessmentContext {
  score: number
  verdict: VerdictKey
  pillars: TrinityPillars
  hardStops: string[]
}

export interface TrinityResult {
  advocate: string
  skeptic: string
  arbiter: string
  alignment: string
}

function pillarEntries(pillars: TrinityPillars) {
  return [
    { key: 'financial' as const, name: 'Financial Reality', value: pillars.financial },
    { key: 'emotional' as const, name: 'Emotional Truth', value: pillars.emotional },
    { key: 'timing' as const, name: 'Perfect Timing', value: pillars.timing },
  ]
}

function weakestPillar(pillars: TrinityPillars) {
  return pillarEntries(pillars).sort((a, b) => a.value - b.value)[0]
}

function strongestPillar(pillars: TrinityPillars) {
  return pillarEntries(pillars).sort((a, b) => b.value - a.value)[0]
}

// ---------------------------------------------------------------------------
// The Advocate — strongest honest case FOR moving forward.
// ---------------------------------------------------------------------------

function buildAdvocate(ctx: TrinityAssessmentContext): string {
  const strong = strongestPillar(ctx.pillars)

  if (ctx.verdict === 'READY') {
    return (
      `The numbers are not close — they are settled. A score of ${ctx.score} puts you in READY territory, and ${strong.name} ` +
      `at ${strong.value}/100 is carrying the case without needing help from the other two pillars. This is what "all three rings align" ` +
      `actually looks like on paper: not one strong signal covering for two weak ones, but a genuinely full picture. ` +
      `The risk of waiting longer isn't caution anymore, it's just delay. You built this readiness on purpose, over time — trust the work you already did.`
    )
  }

  if (ctx.verdict === 'ALMOST_THERE') {
    return (
      `Your score of ${ctx.score} is real progress, not a near-miss to feel bad about. ${strong.name} is doing serious work at ${strong.value}/100, ` +
      `and the honest read is that you are closer to READY than to anywhere else on the map. ${VERDICT_META[ctx.verdict].line} The case for moving forward soon is that the gap ` +
      `remaining is small and specific, not systemic — this isn't a "start over" situation, it's a "finish the last stretch" one. Momentum has value too; ` +
      `don't discount how far you've already come chasing a perfect number that may cost more in waiting than it gains in certainty.`
    )
  }

  if (ctx.verdict === 'BUILD_FIRST') {
    return (
      `Even at ${ctx.score}, there is a real case here: ${strong.name} at ${strong.value}/100 shows you're not starting from zero — one pillar is already ` +
      `doing the work of a much higher score. BUILD FIRST is a verdict about sequencing, not disqualification. The strongest argument for moving forward is that ` +
      `you now know exactly which lever to pull, which is more clarity than most people ever get before a decision this size. A focused, time-boxed push on the ` +
      `weak pillar could change this verdict faster than it feels like right now.`
    )
  }

  // NOT_YET
  if (ctx.hardStops.length > 0) {
    return (
      `I'll make the honest case I can: even with an active protective condition, ${strong.name} at ${strong.value}/100 shows there is a real foundation here, ` +
      `not nothing. The strongest argument for forward motion isn't "buy now" — it's "start the clock on fixing the specific thing that tripped the hard stop." ` +
      `That is progress, even if it doesn't look like the finish line yet. The case for moving is a case for starting the fix today, not for pretending the ` +
      `stop isn't real.`
    )
  }
  return (
    `At ${ctx.score}, the strongest honest thing I can say is that ${strong.name} at ${strong.value}/100 proves you're capable of building real strength in a ` +
    `pillar — you've done it once, you can do it in the others. The case for moving forward is really a case for momentum: you now have proof that the number ` +
    `moves when you put in deliberate effort. That is not the same as buying today, but it is real and worth naming.`
  )
}

// ---------------------------------------------------------------------------
// The Skeptic — strongest honest case for waiting.
// ---------------------------------------------------------------------------

function buildSkeptic(ctx: TrinityAssessmentContext): string {
  const weak = weakestPillar(ctx.pillars)

  if (ctx.hardStops.length > 0) {
    const stopText = ctx.hardStops.join(' ')
    return (
      `I'm not here to manufacture doubt — there's a real one already on the table. ${stopText} That is not my opinion, it's a red-line condition that exists ` +
      `because it's historically where buyers get financially hurt. The case for waiting isn't hesitation, it's arithmetic: this specific condition doesn't ` +
      `resolve itself just because the rest of the picture looks fine. Until it clears, every other strong number is standing on a foundation with a real crack in it.`
    )
  }

  if (ctx.verdict === 'READY') {
    return (
      `Even inside a READY verdict, ${weak.name} at ${weak.value}/100 is the softest part of an otherwise strong picture, and it deserves a second look before you ` +
      `sign anything. My honest case for pausing isn't that you're unready — the numbers say you are. It's that "ready by the numbers" and "ready in every sense" ` +
      `aren't automatically the same thing, and the one pillar still trailing is worth a deliberate, unhurried check before this becomes irreversible.`
    )
  }

  if (ctx.verdict === 'ALMOST_THERE') {
    return (
      `${weak.name} at ${weak.value}/100 is the honest reason this isn't a READY yet, and it's not a small gap dressed up to look bigger — it's the specific thing ` +
      `standing between where you are and where you want to be. The case for waiting is straightforward: close that gap on purpose, with a plan, rather than closing ` +
      `it by accident under the pressure of a deal you don't want to lose. A few more months of deliberate work here changes the entire risk profile of this decision.`
    )
  }

  if (ctx.verdict === 'BUILD_FIRST') {
    return (
      `${weak.name} at ${weak.value}/100 is dragging the whole score down, and a BUILD FIRST verdict exists precisely so you don't buy against that weakness and ` +
      `find out the hard way what it costs. The case for waiting is that this pillar responds to time and deliberate effort — pushing forward now trades a fixable ` +
      `problem for a much harder one you'll be living inside of. Patience here isn't fear, it's sequencing the decision correctly.`
    )
  }

  // NOT_YET without hard stops
  return (
    `At ${ctx.score}, ${weak.name} at ${weak.value}/100 isn't the only soft spot — the whole picture is telling the same story from different angles. The case for ` +
    `waiting is that NOT YET here isn't one weak pillar dragging down two strong ones; it's a genuinely early-stage picture. Building now, deliberately, costs far ` +
    `less than unwinding a decision made on an incomplete foundation.`
  )
}

// ---------------------------------------------------------------------------
// The Arbiter — synthesis + what would change the answer.
// ---------------------------------------------------------------------------

function buildArbiter(ctx: TrinityAssessmentContext): { text: string; agrees: boolean } {
  const weak = weakestPillar(ctx.pillars)
  const strong = strongestPillar(ctx.pillars)

  if (ctx.verdict === 'READY') {
    return {
      agrees: true,
      text:
        `Both cases are honest, and they don't actually contradict each other. The Advocate is right that ${strong.name} shows real, settled strength. The ` +
        `Skeptic is right that ${weak.name} at ${weak.value}/100 deserves one more look, not because it's weak by any real measure, but because thoroughness ` +
        `costs you nothing here. My synthesis: the verdict is READY and the numbers support it without needing a hard stop to overrule them. What would change ` +
        `this answer is a sudden shift in ${weak.name.toLowerCase()} — a new debt, a life change, a change of heart. Barring that, this reads as a genuinely settled decision.`,
    }
  }

  if (ctx.verdict === 'ALMOST_THERE') {
    return {
      agrees: true,
      text:
        `The Advocate and the Skeptic are both looking at the same gap and reading it differently — momentum versus caution. Both readings are defensible, which ` +
        `is exactly what ALMOST THERE means: you are not being told no, you are being told "not quite, and here is precisely why." My synthesis: ${weak.name} at ` +
        `${weak.value}/100 is the single lever that would move this to READY. What would change the answer is closing that specific gap — not waiting passively, ` +
        `but working it deliberately. The verdict and the numbers agree with each other here.`,
    }
  }

  if (ctx.verdict === 'BUILD_FIRST') {
    return {
      agrees: true,
      text:
        `The Advocate's optimism about ${strong.name} is earned, but the Skeptic's caution about ${weak.name} at ${weak.value}/100 is the more load-bearing point ` +
        `right now. My synthesis: BUILD FIRST is the correct read of this data — not a soft no, but a sequencing instruction. What would change this answer is a ` +
        `real, sustained movement in ${weak.name.toLowerCase()}, not a single good month but a pattern. Track that number specifically over the next few checkpoints; ` +
        `it is the one thing standing between here and the next verdict tier.`,
    }
  }

  // NOT_YET
  if (ctx.hardStops.length > 0) {
    return {
      agrees: true,
      text:
        `There isn't much daylight between the Advocate and the Skeptic here, because a hard stop doesn't leave much room for competing interpretations. The ` +
        `Advocate is right that there's a foundation worth building on; the Skeptic is right that the specific protective condition is the actual answer to ` +
        `"why not now." My synthesis: the verdict is NOT YET because the data says so, plainly. What would change this answer is clearing the specific hard-stop ` +
        `condition — nothing else moves the needle until that happens, and once it does, this conversation is worth having again from scratch.`,
    }
  }
  return {
    agrees: true,
    text:
      `The Advocate's case for momentum is real but early; the Skeptic's case for waiting is the stronger read of where the numbers actually sit today. My ` +
      `synthesis: NOT YET is the honest verdict, and it's not a permanent one — it's a snapshot. What would change this answer is deliberate progress on ` +
      `${weak.name.toLowerCase()} specifically, tracked over real time, not wishful thinking. Come back to this exact exercise once that number has moved.`,
  }
}

export function buildFallbackTrinity(ctx: TrinityAssessmentContext): TrinityResult {
  const advocate = buildAdvocate(ctx)
  const skeptic = buildSkeptic(ctx)
  const { text: arbiter, agrees } = buildArbiter(ctx)
  const meta = VERDICT_META[ctx.verdict]

  const alignment = agrees
    ? `The Arbiter agrees with the numeric verdict: ${meta.label}.`
    : `The Arbiter's synthesis differs from the numeric verdict of ${meta.label} — treat that tension itself as a signal worth sitting with.`

  return { advocate, skeptic, arbiter, alignment }
}

/**
 * Local adaptation: build the canon TrinityAssessmentContext from our
 * ScoreResult. Pillar totals are normalized to the /100 scale the canon
 * copy speaks in (our raw pillar maxes are 35/35/30).
 */
export function trinityContextFromResult(result: ScoreResult): TrinityAssessmentContext {
  const pct = (key: keyof ScoreResult['pillars']) =>
    Math.round((result.pillars[key].total / result.pillars[key].max) * 100)
  return {
    score: result.score,
    verdict: result.verdict,
    pillars: { financial: pct('financial'), emotional: pct('emotional'), timing: pct('timing') },
    hardStops: result.hardStops.map((key) => HARD_STOP_MESSAGES[key]),
  }
}

/** The Trinity debate for a live ScoreResult — deterministic, no LLM. */
export function buildTrinity(result: ScoreResult): TrinityResult {
  return buildFallbackTrinity(trinityContextFromResult(result))
}

/* ========================= TEMPORAL TWIN =========================== */
/* Port of canon lib/twin/fallback.ts                                  */

export type Horizon = '5' | '10' | 'retirement'

export interface TwinAssessmentContext {
  score: number
  verdict: VerdictKey
  weakestPillar: { name: string; pct: number }
  hardStops: string[]
}

export interface TwinFallbackInput {
  horizon: Horizon
  fear?: string
  assessment: TwinAssessmentContext
}

function horizonLabel(horizon: Horizon): string {
  if (horizon === '5') return 'five years from now'
  if (horizon === '10') return 'ten years from now'
  return 'the year I retired'
}

function horizonSignature(horizon: Horizon): string {
  if (horizon === '5')
    return 'Five years is short enough that I remember this exact moment like it was last week.'
  if (horizon === '10')
    return 'Ten years does something strange to memory — long enough to change everything, short enough that I still recognize your handwriting in the choices you\'re about to make.'
  return "I'm writing from the other side of the working years, where the decisions stop being about growth and start being about what you get to keep."
}

function fearLine(fear: string | undefined, horizon: Horizon): string {
  if (!fear || !fear.trim()) return ''
  const clean = fear.trim()
  const timeWord = horizon === 'retirement' ? 'all these years' : `these ${horizon} years`
  return ` You told me you were afraid of ${clean.toLowerCase().replace(/\.$/, '')}. I want you to know I carried that fear with you through ${timeWord}, and I can tell you exactly what became of it.`
}

// ---------------------------------------------------------------------------
// Verdict-specific voice blocks — each returns the emotional core of the
// letter body, composed with horizon framing and numbers.
// ---------------------------------------------------------------------------

function readyBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === 'retirement'
      ? "The house stopped being a decision a long time ago. It became the quiet backdrop to everything else you built. That's what readiness buys you — not excitement, just room."
      : "The house isn't the headline of my life, and that's exactly the point. It became furniture — load-bearing, unremarkable, mine. That's what an 80-plus score actually feels like from the inside: not triumph, just quiet certainty that compounds."
  return (
    `Back then, your score was ${ctx.score} — READY, with ${ctx.weakestPillar.name} as your only soft spot at ${ctx.weakestPillar.pct}%. ` +
    `Everything else lined up, and I remember you double-checking that, almost disappointed there wasn't a catch. There wasn't. ` +
    `${closing}`
  )
}

function almostBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === 'retirement'
      ? 'Looking back, the gap you were staring at was smaller than it felt. It closed itself, mostly through time doing what time does.'
      : 'The gap closed faster than you expected, mostly because you stopped staring at it and just kept doing the boring, consistent things.'
  return (
    `You were at ${ctx.score} — ALMOST THERE — with ${ctx.weakestPillar.name} sitting at ${ctx.weakestPillar.pct}%, the one place the picture wasn't finished yet. ` +
    `I know it felt like standing at a door that was open three-quarters of the way. ${closing} ` +
    `The waiting wasn't wasted time. It was the last few reps before the thing that mattered.`
  )
}

function buildFirstBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const closing =
    horizon === 'retirement'
      ? "The building years don't show up in any highlight reel, but they're the years I'd protect first if I had to choose."
      : "I won't pretend the building phase was fun. It wasn't. But it was load-bearing in a way the purchase itself never could have been."
  return (
    `Your score was ${ctx.score} — BUILD FIRST — and ${ctx.weakestPillar.name} was the honest reason why, sitting at just ${ctx.weakestPillar.pct}%. ` +
    `That verdict wasn't a rejection. It was a blueprint, and you followed it more faithfully than I think you gave yourself credit for at the time. ` +
    `${closing}`
  )
}

function notYetBody(ctx: TwinAssessmentContext, horizon: Horizon): string {
  const hardStopLine =
    ctx.hardStops.length > 0
      ? ` The specific thing that stopped you — ${ctx.hardStops[0]} — turned out to be exactly the kind of thing worth stopping for.`
      : ''
  const closing =
    horizon === 'retirement'
      ? "I've had decades to sit with that NOT YET, and I've never once resented it. It was the version of protection that only shows its value in hindsight."
      : "I know NOT YET felt like a door closing. It wasn't. It was a hand on your shoulder, and I'm grateful for it every time I think back to that year."
  return (
    `Your score read ${ctx.score} — NOT YET — with ${ctx.weakestPillar.name} at ${ctx.weakestPillar.pct}%, the clearest signal in the room.${hardStopLine} ` +
    `${closing}`
  )
}

const BODY_BUILDERS: Record<VerdictKey, (ctx: TwinAssessmentContext, horizon: Horizon) => string> =
  {
    READY: readyBody,
    ALMOST_THERE: almostBody,
    BUILD_FIRST: buildFirstBody,
    NOT_YET: notYetBody,
  }

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
  }
  const horizonNote =
    horizon === 'retirement'
      ? " I know it's strange to hear that from someone this far down the road, but it mattered then and it matters now."
      : ''
  return `${asks[verdict]}${horizonNote}`
}

function salutation(horizon: Horizon): string {
  if (horizon === 'retirement') return 'A letter from the you who made it to retirement'
  return `A letter from you, ${horizonLabel(horizon)}`
}

export interface TwinLetter {
  salutation: string
  paragraphs: string[]
}

/**
 * Builds a full fallback letter: salutation + 3-4 paragraphs, ~250-350
 * words, ending with a single concrete ask. Deterministic, no external
 * calls, distinct per verdict x horizon combination (composition, not
 * template-per-combination, but the resulting text differs meaningfully
 * across all 12 pairs).
 */
export function buildFallbackLetter(input: TwinFallbackInput): TwinLetter {
  const { horizon, fear, assessment } = input
  const meta = VERDICT_META[assessment.verdict]
  const body = BODY_BUILDERS[assessment.verdict](assessment, horizon)
  const fearAddendum = fearLine(fear, horizon)

  const opening = `Hi. It's me — you, from ${horizonLabel(horizon)}. ${horizonSignature(horizon)}`
  const middle = `${body}${fearAddendum}`
  const reflection = `"${meta.line}" That's still true from here, by the way. It doesn't stop being true just because time passes — it just gets easier to see clearly.`
  const ask = askLine(assessment.verdict, horizon)

  return {
    salutation: salutation(horizon),
    paragraphs: [opening, middle, reflection, ask],
  }
}

/**
 * Local adaptation: band the user's timeHorizonMonths into the canon's
 * 5 / 10 / retirement horizon buckets.
 */
export function horizonFromMonths(timeHorizonMonths: number): Horizon {
  if (timeHorizonMonths <= 60) return '5'
  if (timeHorizonMonths <= 120) return '10'
  return 'retirement'
}

/** Display label for the banded horizon (card heading use). */
export function horizonDisplayLabel(horizon: Horizon): string {
  if (horizon === '5') return 'five years'
  if (horizon === '10') return 'ten years'
  return 'retirement'
}

/** Local adaptation: build the canon TwinAssessmentContext from our ScoreResult. */
export function twinContextFromResult(result: ScoreResult): TwinAssessmentContext {
  const entries = [
    { name: 'Financial Reality', pct: result.pillars.financial.total / result.pillars.financial.max },
    { name: 'Emotional Truth', pct: result.pillars.emotional.total / result.pillars.emotional.max },
    { name: 'Perfect Timing', pct: result.pillars.timing.total / result.pillars.timing.max },
  ].sort((a, b) => a.pct - b.pct)
  const weakest = entries[0]
  return {
    score: result.score,
    verdict: result.verdict,
    weakestPillar: { name: weakest.name, pct: Math.round(weakest.pct * 100) },
    hardStops: result.hardStops.map((key) => HARD_STOP_MESSAGES[key]),
  }
}

/** The Temporal Twin letter for a live ScoreResult — deterministic, no LLM. */
export function buildTwinLetter(
  result: ScoreResult,
  timeHorizonMonths: number,
  fear?: string,
): TwinLetter {
  return buildFallbackLetter({
    horizon: horizonFromMonths(timeHorizonMonths),
    fear,
    assessment: twinContextFromResult(result),
  })
}
