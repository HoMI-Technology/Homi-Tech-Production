/**
 * Deterministic rule-based Companion — used when ANTHROPIC_API_KEY is
 * absent or the model call fails. Not a lesser experience by design: a
 * well-written fallback that inspects the user's message and their real
 * assessment context, and answers in HōMI's voice. Your homie, not your
 * banker. Short honest sentences. Never financial advice. Willing to say
 * "not yet."
 */

import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { AdvisorPersona } from "@/lib/advisor/personas";

export interface AdvisorAssessmentContext {
  score: number;
  verdict: VerdictKey;
  pillars: {
    financial: number;
    emotional: number;
    timing: number;
  };
  hardStops: string[];
  /** Days since the assessment was completed — the freshness the Companion discloses. */
  ageDays?: number | null;
  /** The score this result replaced, when one exists — the seed of "what changed". */
  previousScore?: number | null;
}

export interface SpendingCategorySnapshot {
  name: string;
  amount: number;
  pctOfIncome: number;
  trend: "up" | "down" | "flat";
}

export interface IncomeVsSpendingPoint {
  month: string;
  income: number;
  spending: number;
}

export interface FinanceSignal {
  id: string;
  severity: "emerald" | "yellow" | "amber" | "crimson";
  title: string;
  body: string;
}

export interface FinanceNudge {
  id: string;
  type: string;
  message: string;
  action?: { label: string; href: string };
}

export interface FinanceGoalSnapshot {
  name: string;
  target: number;
  saved: number;
  pct: number;
  dueDate?: string;
}

export interface RecentTransactionSnapshot {
  date: string;
  description: string;
  amount: number;
  category: string;
  type: "income" | "expense";
}

export interface ReadinessInputsSnapshot {
  dti: number;
  savingsRate: number;
  /** Null when the source cannot compute runway — never coerce to 0. */
  runwayMonths: number | null;
  downPaymentProgressPct: number;
  creditScore?: number;
}

/**
 * The user's live money picture, derived from the Finance Command dashboard
 * (lib/finance/store or the transaction ledger). Only ever built when the user
 * has actually saved finance data — never from placeholder defaults. All figures
 * are monthly USD unless noted.
 *
 * Expanded for the v2 ledger-backed dashboard so agents can see category-level
 * spending, signals, goals, and recent transactions.
 */
export interface AdvisorFinanceContext {
  monthlyIncome: number;
  /** Income minus expenses minus debt payments. */
  netCashFlow: number;
  /** Percentage of gross monthly income. */
  savingsRate: number;
  /** Months of liquid savings covering outflow; null when outflow is zero. */
  runwayMonths: number | null;
  /** Debt-to-income ratio as a percentage. */
  dti: number;
  /**
   * Cash on hand. Null when the source cannot know it — the v1 ledger sees goal
   * balances, not accounts, so a user with no emergency-reserve goal is unknown
   * rather than broke.
   */
  liquidSavings: number | null;
  /**
   * What the user owes. Null when the source cannot know — the v1 ledger has
   * no liability transaction type, so it reports unknown rather than zero.
   */
  totalDebt: number | null;
  /**
   * Assets minus liabilities. Null when the source cannot compute it (see
   * totalDebt). Consumers must render "unknown" rather than a figure — this
   * value reaches both the Companion prompt and the dashboard's Net worth tile.
   */
  netWorth: number | null;
  /** Days since the user last saved finance data; null when unknown. */
  ageDays?: number | null;

  // --- v2 ledger-backed dashboard fields (all optional for gradual rollout) ---
  /** Top spending categories by amount, capped for prompt size. */
  topSpendingCategories?: SpendingCategorySnapshot[];
  /** Last 6 months of income vs spending, monthly USD. */
  incomeVsSpendingSeries?: IncomeVsSpendingPoint[];
  /** Active actionable signals (DTI high, runway low, etc.). */
  activeSignals?: FinanceSignal[];
  /** Behavioral nudges tied to current signals. */
  nudges?: FinanceNudge[];
  /** Active savings goals with progress. */
  goals?: FinanceGoalSnapshot[];
  /** Recent high-signal transactions, capped for prompt size. */
  recentTransactions?: RecentTransactionSnapshot[];
  /** Readiness bridge inputs derived from the ledger. */
  readinessInputs?: ReadinessInputsSnapshot;
}

/**
 * The user's credit picture from the /credit page — self-reported, like the
 * finance context. Only built when the user has actually saved credit data.
 */
export interface AdvisorCreditContext {
  score: number;
  /** Utilization percentage (0–100+). */
  utilization: number;
  onTimeStreakMonths: number;
  /** Days since last save; null when unknown. */
  ageDays?: number | null;
}

interface FallbackInput {
  message: string;
  assessment?: AdvisorAssessmentContext | null;
}

function weakestPillar(pillars: AdvisorAssessmentContext["pillars"]): {
  key: "financial" | "emotional" | "timing";
  name: string;
  value: number;
} {
  const entries: Array<{ key: "financial" | "emotional" | "timing"; name: string; value: number }> =
    [
      { key: "financial", name: "Financial Reality", value: pillars.financial },
      { key: "emotional", name: "Emotional Truth", value: pillars.emotional },
      { key: "timing", name: "Perfect Timing", value: pillars.timing },
    ];
  return entries.sort((a, b) => a.value - b.value)[0];
}

function strongestPillar(pillars: AdvisorAssessmentContext["pillars"]): {
  key: "financial" | "emotional" | "timing";
  name: string;
  value: number;
} {
  const entries: Array<{ key: "financial" | "emotional" | "timing"; name: string; value: number }> =
    [
      { key: "financial", name: "Financial Reality", value: pillars.financial },
      { key: "emotional", name: "Emotional Truth", value: pillars.emotional },
      { key: "timing", name: "Perfect Timing", value: pillars.timing },
    ];
  return entries.sort((a, b) => b.value - a.value)[0];
}

function has(message: string, ...needles: string[]): boolean {
  const m = message.toLowerCase();
  return needles.some((n) => m.includes(n));
}

// ---------------------------------------------------------------------------
// Response builders — each handles one intent. Ordered by specificity;
// the router below tries them roughly most-specific-first.
// ---------------------------------------------------------------------------

function noAssessmentYet(): string {
  return (
    "I don't have your numbers yet, so I can't give you a real read — I won't guess. " +
    "Take the assessment at /assessment first — that's the HōMI measurement path when you're signed in. " +
    "Come back after and I'll talk with your actual numbers, not generic advice."
  );
}

function readinessQuestion(ctx: AdvisorAssessmentContext): string {
  const meta = VERDICT_META[ctx.verdict];
  const weak = weakestPillar(ctx.pillars);
  const strong = strongestPillar(ctx.pillars);

  if (ctx.verdict === "READY") {
    return (
      `Your score is ${ctx.score}. The verdict is READY. ${meta.line} ` +
      `${strong.name} is your strongest signal at ${strong.value}/100, and honestly, nothing here is holding you back. ` +
      `That doesn't mean close your eyes and sign — it means the math and the feeling agree. Move deliberately, not blindly.`
    );
  }

  if (ctx.hardStops.length > 0) {
    return (
      `Straight answer: not yet. Your score is ${ctx.score}, but a red-line condition is active, so the verdict is NOT YET regardless of the number. ` +
      `That's not me being harsh — it's the one place HōMI refuses to soften the truth. ` +
      `Fix that first: ${ctx.hardStops[0]}. Everything else waits behind it.`
    );
  }

  return (
    `Your score is ${ctx.score} — verdict: ${meta.label}. ${meta.line} ` +
    `${strong.name} is carrying you at ${strong.value}/100. ${weak.name} is the drag, at ${weak.value}/100. ` +
    `That gap is the answer to "am I ready" — you're ready in some ways and not in others, and pretending otherwise is how people end up regretting the timing, not the home.`
  );
}

function weakestPillarQuestion(ctx: AdvisorAssessmentContext): string {
  const weak = weakestPillar(ctx.pillars);
  const byKey: Record<string, string> = {
    financial:
      "That's the money math — debt load, down payment, emergency runway, credit. It's the most fixable pillar, honestly. Small, boring, consistent moves close this gap faster than people expect.",
    emotional:
      "That's the honesty pillar — are you actually settled on this, or is someone or something pushing you? Numbers can't fix this one. Only time and honest reflection can.",
    timing:
      "That's your runway and pace — how long until you're actually ready to act, and whether your savings are moving fast enough to get there. This one responds to patience more than effort.",
  };
  return (
    `${weak.name} is your weakest signal, at ${weak.value}/100. ${byKey[weak.key]} ` +
    `I'm not going to tell you it's fine when it's not — this is the pillar to focus on next.`
  );
}

function shouldIBuyQuestion(ctx?: AdvisorAssessmentContext | null): string {
  const base =
    "I can't tell you whether to buy — that's not my job, and anyone who tells you it is doesn't have your interests in mind. " +
    "What I can do is show you the three things that actually matter: can you afford it (Financial Reality), do you really want it and not just want to want it (Emotional Truth), and is now actually the right moment or just a convenient one (Perfect Timing).";

  if (!ctx) {
    return `${base} Take the assessment at /assessment and I'll walk through your actual numbers instead of talking in the abstract.`;
  }

  const weak = weakestPillar(ctx.pillars);
  return (
    `${base} Right now your numbers say ${ctx.score}, verdict ${VERDICT_META[ctx.verdict].label}, with ${weak.name} as the pillar dragging you down at ${weak.value}/100. ` +
    `That's information, not a decision. The decision is still yours.`
  );
}

function pressureFomo(ctx?: AdvisorAssessmentContext | null): string {
  const base =
    "That urgency you're feeling — is it coming from inside you, or from a listing agent's countdown timer, a friend's new place, or a market headline? " +
    "Real readiness doesn't have a deadline. Manufactured urgency always does. " +
    "Give yourself a real cooling-off window: 30 days, no new listings, no group chats about it. If it still feels right after that, it probably is.";

  if (ctx && ctx.hardStops.length === 0 && ctx.verdict !== "READY") {
    return (
      `${base} Your current verdict is ${VERDICT_META[ctx.verdict].label} — which means the pressure you're feeling isn't backed up by your numbers yet. ` +
      `That mismatch is exactly what FOMO feels like from the inside.`
    );
  }
  return base;
}

function notYetProtection(ctx: AdvisorAssessmentContext): string {
  if (ctx.hardStops.length > 0) {
    return (
      `NOT YET isn't a rejection — it's a guardrail. Here's specifically what tripped it: ${ctx.hardStops.join(" ")} ` +
      `That condition exists because it's historically where people get hurt financially, not because of some arbitrary rule. ` +
      `Clear it, and the verdict moves. I'll be here when it does.`
    );
  }
  return (
    "NOT YET means the math and the feeling aren't both there yet — not that they never will be. " +
    "It's the verdict that protects you from a decision you can't undo. Ready isn't a feeling. It's a fact, and right now the facts say wait."
  );
}

function greeting(): string {
  return (
    "Hey. I'm HōMI — think of me as your homie for this decision, not your banker and not a hype man. " +
    "Ask me anything about your readiness, your numbers, or what's actually going on in your head about this. " +
    "I'll tell you the truth, even when it's \"not yet.\""
  );
}

function gratitudeOrSmalltalk(): string {
  return "Anytime. This decision is a big one — glad to sit with you through it. What's actually on your mind?";
}

function defaultReflective(ctx?: AdvisorAssessmentContext | null): string {
  if (ctx) {
    const weak = weakestPillar(ctx.pillars);
    return (
      `Tell me more about what's on your mind. From your numbers, ${weak.name} is the pillar I'd focus the conversation on — ` +
      `but I'm listening, not lecturing. What's actually going on?`
    );
  }
  return (
    "I hear you. I don't have your assessment yet, so I'm working without your real numbers right now — " +
    "take the assessment at /assessment when you're ready and I can speak to your actual situation instead of in general terms."
  );
}

/**
 * Builds a fallback reply from the latest user message and optional
 * assessment context. Deterministic, no external calls.
 */
export function buildFallbackReply(input: FallbackInput): string {
  const { message, assessment } = input;
  const m = message.trim();

  if (!m) {
    return greeting();
  }

  if (has(m, "hi", "hello", "hey", "sup", "yo ")) {
    if (m.length < 20) return greeting();
  }

  if (has(m, "thank", "thanks", "appreciate")) {
    return gratitudeOrSmalltalk();
  }

  if (
    has(
      m,
      "not yet",
      "why not yet",
      "protect",
      "hard stop",
      "red line",
      "redline",
      "why can't i",
      "why cant i",
    )
  ) {
    if (assessment) return notYetProtection(assessment);
    return noAssessmentYet();
  }

  if (
    has(
      m,
      "ready",
      "am i ready",
      "should i wait",
      "how close",
      "how am i doing",
      "where do i stand",
    )
  ) {
    if (assessment) return readinessQuestion(assessment);
    return noAssessmentYet();
  }

  if (has(m, "weak", "weakest", "worst", "hurting me", "dragging", "holding me back")) {
    if (assessment) return weakestPillarQuestion(assessment);
    return noAssessmentYet();
  }

  if (
    has(
      m,
      "should i buy",
      "should i purchase",
      "is this a good idea",
      "good decision",
      "make the move",
      "pull the trigger",
    )
  ) {
    return shouldIBuyQuestion(assessment);
  }

  if (
    has(
      m,
      "fomo",
      "everyone else",
      "rushing",
      "rush",
      "pressure",
      "deadline",
      "prices are going up",
      "talk me out of",
      "talk me into",
    )
  ) {
    return pressureFomo(assessment);
  }

  if (
    has(
      m,
      "mortgage rate",
      "interest rate",
      "which lender",
      "which bank",
      "recommend a",
      "best loan",
    )
  ) {
    return (
      "I can't recommend specific lenders, products, or rates — that crosses into financial advice, and that's not what I'm here for. " +
      "What I can help with is whether YOU are ready to be shopping for that rate in the first place. Want me to walk through your numbers instead?"
    );
  }

  if (assessment) {
    return defaultReflective(assessment);
  }

  return defaultReflective(null);
}

// ---------------------------------------------------------------------------
// Persona voices — deterministic recasting of the same intent-routed content
// above. Each persona reuses buildFallbackReply for the substance (so the
// facts, numbers, and hard stops never drift between personas) and adds a
// distinct lead-in that reframes how the answer opens: Reality Check leads
// with numbers, Gut Check leads with the emotion in the room, Timing Advisor
// leads with horizon/pace, Finance Planner leads by pointing at a calculator.
// Homie is the unmodified default voice.
// ---------------------------------------------------------------------------

function realityCheckLeadIn(assessment?: AdvisorAssessmentContext | null): string {
  if (!assessment) {
    return "Numbers first, always — and right now I don't have yours. ";
  }
  const weak = weakestPillar(assessment.pillars);
  return `Numbers first: ${assessment.score}/100 overall, ${weak.name} lowest at ${weak.value}/100. `;
}

function gutCheckLeadIn(assessment?: AdvisorAssessmentContext | null): string {
  if (assessment && assessment.pillars.emotional < 60) {
    return "Before the numbers — how does this actually sit with you? That unease is data too. ";
  }
  return "Before anything else: what does this feel like in your body right now, not just on paper? ";
}

function timingAdvisorLeadIn(assessment?: AdvisorAssessmentContext | null): string {
  if (assessment) {
    return `Thinking in horizon and pace, not certainty: your Perfect Timing signal sits at ${assessment.pillars.timing}/100. `;
  }
  return "Thinking in horizon and pace, not certainty: timing is rarely a single right moment, it's a window. ";
}

function financePlannerLeadIn(message: string): string {
  const m = message.toLowerCase();
  if (has(m, "rent", "buy"))
    return "Pull up the Rent vs. Buy calculator alongside this — the math will sharpen what I'm about to say. ";
  if (has(m, "afford", "price", "housing payment"))
    return "Run this through the Affordability calculator for exact numbers — here's the shape of it: ";
  if (has(m, "runway", "emergency", "savings"))
    return "Check the Emergency Runway calculator for your precise number — here's the general read: ";
  if (has(m, "fire", "retire"))
    return "The FIRE calculator will give you an exact target — for now: ";
  return "Calculator-backed, not guesswork: ";
}

/**
 * Persona-flavored fallback reply. Delegates to buildFallbackReply for
 * substance, then applies a persona-specific lead-in. Homie is a pure
 * pass-through (the default voice already lives in buildFallbackReply).
 */
export function buildPersonaFallbackReply(
  input: FallbackInput & { persona?: AdvisorPersona | null },
): string {
  const { persona, ...rest } = input;
  const base = buildFallbackReply(rest);

  switch (persona) {
    case "reality":
      return `${realityCheckLeadIn(rest.assessment)}${base}`;
    case "gut":
      return `${gutCheckLeadIn(rest.assessment)}${base}`;
    case "timing":
      return `${timingAdvisorLeadIn(rest.assessment)}${base}`;
    case "planner":
      return `${financePlannerLeadIn(rest.message)}${base}`;
    case "homie":
    default:
      return base;
  }
}
