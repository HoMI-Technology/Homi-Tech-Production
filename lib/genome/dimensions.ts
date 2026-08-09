/**
 * HōMI Behavioral Genome — 9 decision-psychology dimensions.
 * Each dimension has 2 questions (agree <-> disagree, 1-7 slider).
 * Some questions are reverse-scored so scale-gaming is harder and the
 * dimension score reflects the underlying trait rather than one phrasing.
 *
 * Scoring: for each question, raw slider is 1-7. If reversed, effective = 8 - raw.
 * Dimension score (0-100) = average(effective) mapped from [1,7] to [0,100]:
 *   ((avg - 1) / 6) * 100
 */

export interface GenomeQuestion {
  id: string;
  dimensionKey: DimensionKey;
  prompt: string;
  reversed: boolean;
  leftLabel: string; // slider = 1
  rightLabel: string; // slider = 7
}

export type DimensionKey =
  | "loss_aversion"
  | "time_perception"
  | "confidence_calibration"
  | "volatility_tolerance"
  | "regret_asymmetry"
  | "narrative_dependence"
  | "social_reference"
  | "outcome_attribution"
  | "agency_perception";

export interface GenomeDimension {
  key: DimensionKey;
  name: string;
  description: string;
  lowMeaning: string;
  highMeaning: string;
  skew: string; // how this dimension skews decisions
}

export const DIMENSIONS: GenomeDimension[] = [
  {
    key: "loss_aversion",
    name: "Loss Aversion",
    description: "How much more a potential loss weighs on you compared to an equivalent gain.",
    lowMeaning: "You weigh losses and gains fairly evenly — you can act without over-hedging.",
    highMeaning:
      "Losses feel far heavier than equivalent gains, which can freeze you at the exact moment a decision needs a clear yes or no.",
    skew: "Can lead to over-insuring against downside, holding losing positions too long, or refusing good deals out of fear of a worse one.",
  },
  {
    key: "time_perception",
    name: "Time Perception",
    description: "How you trade off a smaller reward now against a larger reward later.",
    lowMeaning: "You default to the future — patient, willing to wait for a better outcome.",
    highMeaning:
      "You weight the present heavily, which can make long-horizon commitments (like a mortgage) feel abstract until they are not.",
    skew: "Can lead to underestimating how a 30-year decision will feel in year three, or discounting future costs to make today's number look better.",
  },
  {
    key: "confidence_calibration",
    name: "Confidence Calibration",
    description: "How well your stated confidence matches your actual track record.",
    lowMeaning: "You tend to underestimate yourself — accurate but sometimes overly cautious.",
    highMeaning:
      "Your confidence tends to run ahead of your evidence, which can mean skipping the diligence a big decision deserves.",
    skew: "Can lead to under-researching a major purchase because it 'feels' obviously right, or dismissing warning signs as noise.",
  },
  {
    key: "volatility_tolerance",
    name: "Volatility Tolerance",
    description: "How steady you stay when a plan's value swings in the short term.",
    lowMeaning: "Short-term swings unsettle you quickly, even when the long-term plan is sound.",
    highMeaning: "You can hold steady through volatility without changing the underlying plan.",
    skew: "Low tolerance can trigger panic-selling or abandoning a sound plan after one bad month; very high tolerance can mask real risk that deserves attention.",
  },
  {
    key: "regret_asymmetry",
    name: "Regret Asymmetry",
    description:
      "Whether you fear regretting an action (buying) more than regretting inaction (not buying).",
    lowMeaning: "Regret of inaction weighs more — missing out bothers you more than a misstep.",
    highMeaning:
      "Regret of action weighs more — you fear a bad decision more than a missed opportunity, which can tip you toward excess caution.",
    skew: "Can lead to either chasing decisions to avoid missing out, or stalling indefinitely to avoid the risk of being wrong.",
  },
  {
    key: "narrative_dependence",
    name: "Narrative Dependence",
    description:
      "How much a compelling story (versus the underlying numbers) drives your decisions.",
    lowMeaning: "You anchor to numbers first and treat the story as context, not evidence.",
    highMeaning:
      "A good story — a hot market, a friend's success, a compelling pitch — can outweigh what the numbers actually say.",
    skew: "Can lead to buying into momentum or a persuasive narrative before the underlying financial reality has been checked.",
  },
  {
    key: "social_reference",
    name: "Social Reference",
    description: "How much your decisions are calibrated against what peers are doing.",
    lowMeaning: "You set your own benchmark and are largely unmoved by what others are doing.",
    highMeaning:
      "Peer timing and peer choices weigh heavily — if others are buying, waiting can feel like falling behind.",
    skew: "Can lead to decisions timed to social comparison rather than personal readiness — 'everyone else is doing it' as false urgency.",
  },
  {
    key: "outcome_attribution",
    name: "Outcome Attribution",
    description:
      "Whether you attribute outcomes to your own decisions or to external circumstances.",
    lowMeaning: "You attribute outcomes mostly to circumstances outside your control.",
    highMeaning:
      "You attribute outcomes mostly to your own choices, for better and worse — useful for learning, risky if it produces overconfidence after a lucky win.",
    skew: "Can lead to over-crediting a good outcome to skill (repeating risk) or over-blaming yourself for a bad outcome that was mostly bad luck.",
  },
  {
    key: "agency_perception",
    name: "Agency Perception",
    description: "How much control you feel you have over a major decision's outcome.",
    lowMeaning: "You feel decisions largely happen to you — the market, the timing, other people.",
    highMeaning:
      "You feel strong personal agency — that your choices meaningfully shape the outcome.",
    skew: "Low agency can produce passivity or waiting for a 'sign'; very high agency can understate real external risk factors outside your control.",
  },
];

export const QUESTIONS: GenomeQuestion[] = [
  // Loss Aversion
  {
    id: "la_1",
    dimensionKey: "loss_aversion",
    prompt: "Losing money I already have bothers me more than missing out on money I never had.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "la_2",
    dimensionKey: "loss_aversion",
    prompt: "I can walk away from a sunk cost without it eating at me.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Time Perception
  {
    id: "tp_1",
    dimensionKey: "time_perception",
    prompt: "I would rather have a smaller amount today than wait a year for more.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "tp_2",
    dimensionKey: "time_perception",
    prompt: "I regularly think in terms of where I want to be in 10+ years.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Confidence Calibration
  {
    id: "cc_1",
    dimensionKey: "confidence_calibration",
    prompt: "When I decide something is right, I rarely feel the need to double-check it.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "cc_2",
    dimensionKey: "confidence_calibration",
    prompt:
      "Looking back, my confidence at the time usually matched how things actually turned out.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Volatility Tolerance
  {
    id: "vt_1",
    dimensionKey: "volatility_tolerance",
    prompt: "A sudden drop in a plan's value makes me want to change course immediately.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "vt_2",
    dimensionKey: "volatility_tolerance",
    prompt: "I can watch a number swing in the short term without it changing my plan.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Regret Asymmetry
  {
    id: "ra_1",
    dimensionKey: "regret_asymmetry",
    prompt: "I would rather try and fail than always wonder 'what if.'",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "ra_2",
    dimensionKey: "regret_asymmetry",
    prompt:
      "The fear of making the wrong call weighs on me more than the fear of missing a chance.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Narrative Dependence
  {
    id: "nd_1",
    dimensionKey: "narrative_dependence",
    prompt:
      "A compelling story about where things are headed can change my mind faster than a spreadsheet.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "nd_2",
    dimensionKey: "narrative_dependence",
    prompt: "Before I act on a trend, I check the underlying numbers myself.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Social Reference
  {
    id: "sr_1",
    dimensionKey: "social_reference",
    prompt: "Seeing peers make a move makes me feel like I should be moving too.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "sr_2",
    dimensionKey: "social_reference",
    prompt: "My timing on big decisions is set by my own situation, not by what others are doing.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Outcome Attribution
  {
    id: "oa_1",
    dimensionKey: "outcome_attribution",
    prompt: "When something goes well for me financially, it's usually because of a choice I made.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "oa_2",
    dimensionKey: "outcome_attribution",
    prompt: "When something goes badly, I usually chalk it up to circumstances outside my control.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  // Agency Perception
  {
    id: "ap_1",
    dimensionKey: "agency_perception",
    prompt: "I feel like my choices meaningfully shape how my finances turn out.",
    reversed: false,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
  {
    id: "ap_2",
    dimensionKey: "agency_perception",
    prompt: "Big financial outcomes mostly happen to me rather than because of me.",
    reversed: true,
    leftLabel: "Disagree",
    rightLabel: "Agree",
  },
];

export type GenomeAnswers = Record<string, number>; // questionId -> 1-7

export interface DimensionScore {
  key: DimensionKey;
  name: string;
  score: number; // 0-100
}

export function scoreGenome(answers: GenomeAnswers): DimensionScore[] {
  return DIMENSIONS.map((dim) => {
    const questions = QUESTIONS.filter((q) => q.dimensionKey === dim.key);
    const effectiveValues = questions.map((q) => {
      const raw = answers[q.id] ?? 4;
      return q.reversed ? 8 - raw : raw;
    });
    const avg = effectiveValues.reduce((s, v) => s + v, 0) / effectiveValues.length;
    const score = Math.round(((avg - 1) / 6) * 100);
    return { key: dim.key, name: dim.name, score: Math.max(0, Math.min(100, score)) };
  });
}
