/**
 * Phase 0 named signals. Three categories only: behavioral / emotional / language.
 *
 * No invented numeric floors. Stress Capacity / Fear-to-Desire stay unarmed
 * until a canon number already exists in the repo (none does). Self-reported
 * instability is a named language-shaped emotional signal.
 *
 * Resource flags (financial-stress, self-harm) are not a fourth category.
 */

export const PHASE0_CATEGORIES = ["behavioral", "emotional", "language"] as const;
export type Phase0Category = (typeof PHASE0_CATEGORIES)[number];

export const PHASE0_SIGNAL_IDS = [
  "rapid_answer_oscillation",
  "abandonment_restart_loop",
  "override_attempt",
  "extreme_time_pressure",
  "self_reported_instability",
  "catastrophic_framing",
  "hopelessness",
  "urgency_with_despair",
] as const;

export type Phase0SignalId = (typeof PHASE0_SIGNAL_IDS)[number];

export const PHASE0_SIGNAL_CATEGORY: Record<Phase0SignalId, Phase0Category> = {
  rapid_answer_oscillation: "behavioral",
  abandonment_restart_loop: "behavioral",
  override_attempt: "behavioral",
  extreme_time_pressure: "behavioral",
  self_reported_instability: "emotional",
  catastrophic_framing: "language",
  hopelessness: "language",
  urgency_with_despair: "language",
};

export interface Phase0TextHit {
  id: Phase0SignalId;
  category: Phase0Category;
  financialStress: boolean;
  selfHarm: boolean;
}

function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").toLowerCase();
}

const TIME_PRESSURE_PATTERNS: RegExp[] = [
  /\bi have to (?:decide|buy|close) (?:today|now|tonight|this week)\b/,
  /\bneed to (?:decide|buy|close) (?:today|now|tonight|right now)\b/,
  /\brunning out of time to (?:decide|buy|close)\b/,
  /\bno time left to decide\b/,
  /\bdeadline is (?:today|tomorrow)\b/,
];

const INSTABILITY_PATTERNS: RegExp[] = [
  /\bmy life is (?:unstable|falling apart|spiraling)\b/,
  /\bi(?:'m| am) (?:falling apart|spiraling|unraveling|not stable)\b/,
  /\bi can't hold it together\b/,
  /\beverything is falling apart\b/,
  /\bi feel unstable\b/,
];

const CATASTROPHIC_PATTERNS: RegExp[] = [
  /\b(?:my )?life is (?:over|ruined|destroyed)\b/,
  /\beverything is (?:ruined|destroyed|over)\b/,
  /\bruined forever\b/,
  /\bi(?:'ll| will) lose everything\b/,
  /\bdisaster if i\b/,
];

const HOPELESSNESS_PATTERNS: RegExp[] = [
  /\bhopeless\b/,
  /\bno way out\b/,
  /\bnothing will (?:ever )?get better\b/,
  /\bnever (?:get|be) better\b/,
  /\bi (?:just )?give up\b/,
  /\bwhat's the point of (?:anything|living|life|going on)\b/,
];

const URGENCY_PATTERNS: RegExp[] = [
  /\bhave to (?:decide|choose|do this) (?:today|now|tonight)\b/,
  /\brunning out of time\b/,
  /\bcan't wait\b/,
  /\bright now or\b/,
];

const DESPAIR_PATTERNS: RegExp[] = [
  /\bi can't (?:take|do) this\b/,
  /\bit's too much\b/,
  /\bi(?:'m| am) drowning\b/,
  /\bfalling apart\b/,
  /\bhopeless\b/,
  /\bi can't go on\b/,
];

const FINANCIAL_STRESS_PATTERNS: RegExp[] = [
  /\bdrowning in (?:debt|bills)\b/,
  /\bcan't (?:pay|afford) (?:rent|the mortgage|my bills)\b/,
  /\bfinancial(?:ly)? (?:ruined|crisis|collapse)\b/,
  /\bbroke and (?:scared|desperate|drowning)\b/,
];

function anyMatch(normalized: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(normalized));
}

/**
 * Passive text scan. Returns named hits only — never a freeze decision.
 * One phrase can contribute at most one named signal per id.
 */
export function scanPhase0Text(text: string): Phase0TextHit[] {
  if (!text.trim()) return [];
  const normalized = normalize(text);
  const hits: Phase0TextHit[] = [];
  const financialStress = anyMatch(normalized, FINANCIAL_STRESS_PATTERNS);

  function push(id: Phase0SignalId) {
    if (hits.some((hit) => hit.id === id)) return;
    hits.push({
      id,
      category: PHASE0_SIGNAL_CATEGORY[id],
      financialStress,
      selfHarm: false,
    });
  }

  if (anyMatch(normalized, TIME_PRESSURE_PATTERNS)) push("extreme_time_pressure");
  if (anyMatch(normalized, INSTABILITY_PATTERNS)) push("self_reported_instability");
  if (anyMatch(normalized, CATASTROPHIC_PATTERNS)) push("catastrophic_framing");
  if (anyMatch(normalized, HOPELESSNESS_PATTERNS)) push("hopelessness");
  if (anyMatch(normalized, URGENCY_PATTERNS) && anyMatch(normalized, DESPAIR_PATTERNS)) {
    push("urgency_with_despair");
  }

  return hits.map((hit) => ({
    ...hit,
    financialStress: hit.financialStress || financialStress,
  }));
}

export function scanPhase0Texts(texts: readonly string[]): Phase0TextHit[] {
  const byId = new Map<Phase0SignalId, Phase0TextHit>();
  let financialStress = false;
  for (const text of texts) {
    financialStress = financialStress || anyMatch(normalize(text), FINANCIAL_STRESS_PATTERNS);
    for (const hit of scanPhase0Text(text)) {
      byId.set(hit.id, hit);
    }
  }
  return [...byId.values()].map((hit) => ({
    ...hit,
    financialStress: hit.financialStress || financialStress,
  }));
}

export function financialStressFromTexts(texts: readonly string[]): boolean {
  return texts.some((text) => text && anyMatch(normalize(text), FINANCIAL_STRESS_PATTERNS));
}
