/**
 * Rule-based HōMI Companion — deterministic fallback voice from production
 * lib/advisor/fallback.ts, wired to live budget finance context.
 * Your homie, not your banker. Never financial advice.
 */

export interface CompanionFinanceContext {
  monthlyIncome: number;
  netCashFlow: number;
  savingsRate: number;
  runwayMonths: number | null;
  dti: number;
  liquidSavings: number;
  netWorth: number;
  portfolioValue: number;
  pathVerdict?: string | null;
  pathBinding?: string | null;
  pathNextStep?: string | null;
  pathCompletionPct?: number | null;
}

export interface CompanionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
}

function has(message: string, ...needles: string[]): boolean {
  const m = message.toLowerCase();
  return needles.some((n) => m.includes(n));
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtRunway(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return "∞";
  return `${m.toFixed(1)} months`;
}

export function greeting(): string {
  return (
    "Hey. I'm HōMI — your homie for this decision, not your banker and not a hype man. " +
    "Ask about your cash flow, runway, portfolio, path, or whether you're ready. " +
    "I'll tell you the truth, even when it's \"not yet.\""
  );
}

function readiness(ctx: CompanionFinanceContext): string {
  const runway = fmtRunway(ctx.runwayMonths);
  const parts: string[] = [];

  if (ctx.pathVerdict === "READY") {
    parts.push(
      `Your live finance path reads READY. Cash flow ${fmtMoney(ctx.netCashFlow)}, runway ${runway}, DTI ${ctx.dti.toFixed(0)}%, savings rate ${ctx.savingsRate.toFixed(0)}%.`,
    );
    parts.push(
      "That doesn't mean close your eyes and sign — it means the math isn't blocking you. Move deliberately.",
    );
  } else if (
    (ctx.runwayMonths != null && ctx.runwayMonths < 1) ||
    ctx.dti > 50 ||
    ctx.netCashFlow < 0
  ) {
    parts.push(
      `Straight answer: not yet. Cash flow ${fmtMoney(ctx.netCashFlow)}, runway ${runway}, DTI ${ctx.dti.toFixed(0)}%.`,
    );
    if (ctx.pathBinding) {
      parts.push(`Binding constraint: ${ctx.pathBinding}. Everything else waits behind it.`);
    } else {
      parts.push("Fix the protective gate first — runway, cash flow, or debt load.");
    }
  } else {
    parts.push(
      `You're in the middle band. Surplus ${fmtMoney(ctx.netCashFlow)}, runway ${runway}, portfolio ${fmtMoney(ctx.portfolioValue)}, net worth ${fmtMoney(ctx.netWorth)}.`,
    );
    if (ctx.pathNextStep) {
      parts.push(`Next protective step: ${ctx.pathNextStep}.`);
    }
    parts.push("Ready in some ways, not in others — pretending otherwise is how people regret the timing.");
  }

  return parts.join(" ");
}

function moneyPicture(ctx: CompanionFinanceContext): string {
  return (
    `Your live picture: income ~${fmtMoney(ctx.monthlyIncome)}, cash flow ${fmtMoney(ctx.netCashFlow)}, ` +
    `savings rate ${ctx.savingsRate.toFixed(0)}%, runway ${fmtRunway(ctx.runwayMonths)}, DTI ${ctx.dti.toFixed(0)}%, ` +
    `liquid cash ${fmtMoney(ctx.liquidSavings)}, portfolio ${fmtMoney(ctx.portfolioValue)}, net worth ${fmtMoney(ctx.netWorth)}. ` +
    `These come from your ledger, banks, and holdings — not placeholder defaults.`
  );
}

function portfolioTalk(ctx: CompanionFinanceContext): string {
  return (
    `Portfolio is marked at ${fmtMoney(ctx.portfolioValue)}. ` +
    `That's part of net worth (${fmtMoney(ctx.netWorth)}) but not the same as liquid runway (${fmtRunway(ctx.runwayMonths)}). ` +
    `Don't confuse mark-to-market gains with cash you can spend next month. Educational marks only — not a recommendation to buy or sell.`
  );
}

function pathTalk(ctx: CompanionFinanceContext): string {
  if (!ctx.pathVerdict) {
    return "Open the Plan tab and generate Path to Ready — it sequences protective next steps from your live numbers.";
  }
  const pct =
    ctx.pathCompletionPct != null
      ? ` ${ctx.pathCompletionPct}% of steps complete.`
      : "";
  return (
    `Path verdict: ${ctx.pathVerdict}.${pct} ` +
    (ctx.pathBinding ? `Binding: ${ctx.pathBinding}. ` : "") +
    (ctx.pathNextStep ? `Next step: ${ctx.pathNextStep}. ` : "") +
    "One constraint at a time — protection first, not a checklist wall."
  );
}

function fomo(): string {
  return (
    "That urgency — is it from inside you, or a listing countdown, a friend's new place, a headline? " +
    "Real readiness doesn't have a deadline. Manufactured urgency always does. " +
    "Give yourself 30 quiet days. If it still feels right after that, the numbers will tell you whether the math agrees."
  );
}

function notAdvice(): string {
  return (
    "I can't recommend specific products, rates, brokers, or trades — that crosses into advice, and that's not what I'm here for. " +
    "What I can do is show whether YOUR cash flow, runway, and debt load support the decision you're weighing."
  );
}

/**
 * Deterministic companion reply from message + live finance context.
 */
export function buildCompanionReply(
  message: string,
  ctx: CompanionFinanceContext | null,
): string {
  const m = message.trim();
  if (!m) return greeting();

  if (has(m, "hi", "hello", "hey", "sup") && m.length < 24) {
    return greeting();
  }

  if (has(m, "thank", "thanks", "appreciate")) {
    return "Anytime. This decision is a big one — glad to sit with you through it. What's actually on your mind?";
  }

  if (
    has(
      m,
      "mortgage rate",
      "interest rate",
      "which lender",
      "recommend a",
      "best loan",
      "should i buy stock",
      "buy bitcoin",
      "which etf",
    )
  ) {
    return notAdvice();
  }

  if (
    has(m, "fomo", "rushing", "rush", "pressure", "everyone else", "talk me out", "talk me into")
  ) {
    return fomo();
  }

  if (!ctx) {
    return (
      "I don't have your numbers loaded yet. Use the Overview and Wealth tabs, then come back — " +
      "I won't invent a picture from defaults."
    );
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
      "not yet",
      "verdict",
    )
  ) {
    return readiness(ctx);
  }

  if (
    has(
      m,
      "cash flow",
      "runway",
      "dti",
      "debt",
      "savings rate",
      "income",
      "net worth",
      "numbers",
      "money",
      "finance",
    )
  ) {
    return moneyPicture(ctx);
  }

  if (has(m, "portfolio", "holding", "stock", "etf", "invest", "broker")) {
    return portfolioTalk(ctx);
  }

  if (has(m, "path", "next step", "what should i do", "plan", "milestone")) {
    return pathTalk(ctx);
  }

  if (has(m, "monte", "simulate", "simulation", "probability", "projection")) {
    return (
      "Open Plan → Monte Carlo for a seeded savings trajectory (P10 / P50 / P90 bands). " +
      "Decision Rehearsal compares buy-now vs wait on a 5-year net position. Educational models only."
    );
  }

  // Default reflective with live numbers
  const weak =
    ctx.runwayMonths != null && ctx.runwayMonths < 3
      ? "runway"
      : ctx.dti > 36
        ? "debt-to-income"
        : ctx.savingsRate < 10
          ? "savings rate"
          : "cash flow discipline";

  return (
    `From your live numbers, I'd focus the conversation on ${weak}. ` +
    `Surplus ${fmtMoney(ctx.netCashFlow)}, runway ${fmtRunway(ctx.runwayMonths)}, DTI ${ctx.dti.toFixed(0)}%. ` +
    `What's actually going on — the math, the pressure, or the timeline?`
  );
}
