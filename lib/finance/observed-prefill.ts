/**
 * Observed DTI / runway suggestions from the Money picture.
 *
 * Two inputs share this module (one confirm path):
 *   1. Linked Plaid Inc transactions (`observeLinkedPrefill`)
 *   2. Money Dashboard ledger (`observeDashboardPrefill`)
 *
 * Suggestions only. User reviews and confirms. Confirm writes self_report.
 * Transfers are stored as income by amount sign on main (`syncItemToLedger`),
 * so the Plaid classifier is heuristic and `canVerify` stays false.
 *
 * Live question IDs this module may suggest (docs/MEASURE_ACT_W1.md):
 * fin_income, fin_debt_payments, fin_savings_total, fin_down_payment,
 * plus nearest fin_emergency_fund choice from runway. Expenses have no
 * question ID. Never invent fin_expenses or a second income ID. Never
 * prefill Emotional Truth, Perfect Timing, credit, or fin_dti_ratio when
 * income+debt exist.
 */

/** Live 45-q IDs that Money may prefill. Do not add invented slugs. */
export const DASHBOARD_PREFILL_QUESTION_IDS = [
  "fin_income",
  "fin_debt_payments",
  "fin_savings_total",
  "fin_down_payment",
] as const;

/** Live choice ID picked from runway (expenses are the denominator only). */
export const DASHBOARD_PREFILL_CHOICE_IDS = ["fin_emergency_fund"] as const;

export type DashboardPrefillQuestionId = (typeof DASHBOARD_PREFILL_QUESTION_IDS)[number];
export type DashboardPrefillChoiceId = (typeof DASHBOARD_PREFILL_CHOICE_IDS)[number];

/** Live fin_emergency_fund option values from the question bank. Not new IDs. */
export type EmergencyFundQuestionChoice = "6_plus" | "4_5" | "2_3" | "1" | "none";

/** Live fin_down_payment option values from the question bank. Not new IDs. */
export type DownPaymentQuestionChoice =
  | "20_plus"
  | "15_19"
  | "10_14"
  | "5_9"
  | "3_4"
  | "less_3";

export interface MoneyPictureAmounts {
  /** Monthly gross income already stored. Null = unknown — do not invent. */
  monthlyIncome: number | null;
  monthlyDebtPayments: number | null;
  liquidSavings: number | null;
  /** Runway / EF denominator only. No question ID. */
  monthlyExpenses: number | null;
  runwayMonths: number | null;
  /** DP earmark dollars. Needs a home target to become a %. */
  earmarkedDownPayment: number | null;
  /** Home-goal target dollars. Required to map an earmark onto fin_down_payment. */
  homeTarget: number | null;
}

export interface QuestionPrefillSuggestions {
  fin_income: number | null;
  fin_debt_payments: number | null;
  fin_savings_total: number | null;
  fin_emergency_fund: EmergencyFundQuestionChoice | null;
  fin_down_payment: DownPaymentQuestionChoice | null;
}

export const NEVER_PREFILL_QUESTION_PREFIXES = ["emo_", "tim_"] as const;
export const NEVER_PREFILL_QUESTION_IDS = [
  "fin_credit_score",
  "car_fin_credit_score",
  "fin_dti_ratio",
  "fin_income_stability",
  "fin_expenses",
] as const;

export const OBSERVED_PREFILL_MIN_DAYS = 30;

export const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT"]);
export const INCOME_CATEGORIES = new Set(["INCOME"]);
export const OBLIGATION_CATEGORIES = new Set(["LOAN_PAYMENTS"]);

export interface ObservedTxn {
  amount: number;
  pending?: boolean | null;
  txnDate?: string | null;
  category?: string | null;
}

export interface ObservedAccount {
  type?: string | null;
  currentBalance?: number | null;
  availableBalance?: number | null;
}

export interface ObservedPrefillSuggestion {
  lookbackDays: number;
  transactionCount: number;
  spanDays: number;
  monthlyInflows: number;
  monthlyObligations: number;
  monthlySpend: number;
  liquidBalances: number;
  suggestedDti: number | null;
  suggestedRunwayMonths: number | null;
  transferClassificationSafe: boolean;
  /** Always false this packet — heuristic classifier must not flip verified. */
  canVerify: boolean;
  reason: string | null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isTransferCategory(category: string | null | undefined): boolean {
  return Boolean(category && TRANSFER_CATEGORIES.has(category));
}

function isIncomeCategory(category: string | null | undefined): boolean {
  return Boolean(category && INCOME_CATEGORIES.has(category));
}

function isObligationCategory(category: string | null | undefined): boolean {
  return Boolean(category && OBLIGATION_CATEGORIES.has(category));
}

function settledPosted(rows: ObservedTxn[]): ObservedTxn[] {
  return rows.filter((row) => !row.pending && Number.isFinite(Number(row.amount)));
}

function spanDays(rows: ObservedTxn[]): number {
  const dates = rows
    .map((row) => row.txnDate)
    .filter((d): d is string => typeof d === "string" && d.length >= 10)
    .sort();
  if (dates.length === 0) return 0;
  const first = Date.parse(`${dates[0]}T00:00:00Z`);
  const last = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(1, Math.round((last - first) / 86_400_000) + 1);
}

export function liquidDepositoryBalances(accounts: ObservedAccount[]): number {
  let sum = 0;
  for (const account of accounts) {
    if (account.type !== "depository") continue;
    const value = account.availableBalance ?? account.currentBalance ?? 0;
    if (Number.isFinite(value)) sum += value;
  }
  return round2(sum);
}

export function runwayMonthsFromLiquid(input: {
  liquidBalances: number;
  earmarkedDownPayment: number;
  monthlySpend: number;
}): number | null {
  if (input.monthlySpend <= 0) return null;
  const usable = input.liquidBalances - Math.max(0, input.earmarkedDownPayment);
  return round4(usable / input.monthlySpend);
}

/**
 * Build a suggestion from already-mirrored Plaid Inc transactions.
 * Does not mark verified — confirmation is a separate user action.
 */
export function observeLinkedPrefill(
  rows: ObservedTxn[],
  accounts: ObservedAccount[],
  earmarkedDownPayment = 0,
): ObservedPrefillSuggestion {
  const settled = settledPosted(rows);
  const span = spanDays(settled);
  const transferClassificationSafe = settled.every(
    (row) => typeof row.category === "string" && row.category.trim().length > 0,
  );

  let inflow = 0;
  let obligations = 0;
  let spend = 0;
  for (const row of settled) {
    const amount = Number(row.amount);
    if (isTransferCategory(row.category)) continue;
    // Plaid: positive = money out, negative = money in.
    if (amount < 0) {
      if (isIncomeCategory(row.category)) inflow += -amount;
    } else if (amount > 0) {
      if (isObligationCategory(row.category)) obligations += amount;
      else spend += amount;
    }
  }

  const monthFactor = 30 / Math.max(span, 1);
  const monthlyInflows = round2(inflow * monthFactor);
  const monthlyObligations = round2(obligations * monthFactor);
  const monthlySpend = round2(spend * monthFactor);
  const liquidBalances = liquidDepositoryBalances(accounts);
  const suggestedDti =
    monthlyInflows > 0 ? round4(Math.min(1, monthlyObligations / monthlyInflows)) : null;
  const suggestedRunwayMonths = runwayMonthsFromLiquid({
    liquidBalances,
    earmarkedDownPayment,
    monthlySpend,
  });

  let reason: string | null =
    "Linked observations stay self-report. Transfers are written as income by sign, so this classifier will not mark DTI verified.";
  if (settled.length === 0) {
    reason = "No settled linked transactions yet.";
  } else if (span < OBSERVED_PREFILL_MIN_DAYS) {
    reason = `Need at least ${OBSERVED_PREFILL_MIN_DAYS} days of linked transactions.`;
  } else if (!transferClassificationSafe) {
    reason = "Some transactions have no category, so transfers cannot be excluded safely.";
  } else if (suggestedDti === null) {
    reason = "No classified income — transfers are not treated as income.";
  }
  const canVerify = false;

  return {
    lookbackDays: span,
    transactionCount: settled.length,
    spanDays: span,
    monthlyInflows,
    monthlyObligations,
    monthlySpend,
    liquidBalances,
    suggestedDti,
    suggestedRunwayMonths,
    transferClassificationSafe,
    canVerify,
    reason,
  };
}

function finitePositive(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

function finiteNonNegative(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Map stored runway months onto the live fin_emergency_fund choices.
 * Expenses are the denominator already baked into runwayMonths — this
 * does not create a fin_expenses answer.
 */
export function emergencyFundChoiceFromRunwayMonths(
  months: number | null,
): EmergencyFundQuestionChoice | null {
  if (months == null || !Number.isFinite(months) || months < 0) return null;
  if (months >= 6) return "6_plus";
  if (months >= 4) return "4_5";
  if (months >= 2) return "2_3";
  if (months >= 1) return "1";
  return "none";
}

/**
 * Single mapping onto live question IDs. Ledger and Plaid both call this
 * so there is never a second income field.
 */
/**
 * Nearest live fin_down_payment choice from an earmark / home-target pair.
 * No target → no invented percent → no suggestion.
 */
export function downPaymentChoiceFromEarmark(
  earmarkedDownPayment: number | null,
  homeTarget: number | null,
): DownPaymentQuestionChoice | null {
  const earmark = finiteNonNegative(earmarkedDownPayment);
  const target = finitePositive(homeTarget);
  if (earmark == null || target == null) return null;
  const pct = (earmark / target) * 100;
  if (pct >= 20) return "20_plus";
  if (pct >= 15) return "15_19";
  if (pct >= 10) return "10_14";
  if (pct >= 5) return "5_9";
  if (pct >= 3) return "3_4";
  return "less_3";
}

export function questionSuggestionsFromMoney(
  picture: MoneyPictureAmounts,
): QuestionPrefillSuggestions {
  const monthlyExpenses = finitePositive(picture.monthlyExpenses);
  const runwayMonths =
    picture.runwayMonths != null && Number.isFinite(picture.runwayMonths)
      ? picture.runwayMonths
      : monthlyExpenses != null && finitePositive(picture.liquidSavings) != null
        ? (picture.liquidSavings as number) / monthlyExpenses
        : null;

  return {
    fin_income: finitePositive(picture.monthlyIncome),
    fin_debt_payments: finiteNonNegative(picture.monthlyDebtPayments),
    fin_savings_total: finiteNonNegative(picture.liquidSavings),
    fin_emergency_fund: emergencyFundChoiceFromRunwayMonths(runwayMonths),
    fin_down_payment: downPaymentChoiceFromEarmark(
      picture.earmarkedDownPayment,
      picture.homeTarget,
    ),
  };
}

/** Money Dashboard ledger → suggestions. Same confirm path as Plaid. */
export function observeDashboardPrefill(
  picture: MoneyPictureAmounts,
): QuestionPrefillSuggestions & { canVerify: false; source: "ledger" } {
  return {
    ...questionSuggestionsFromMoney(picture),
    canVerify: false,
    source: "ledger",
  };
}

/** Prefer ledger amounts; fill gaps from linked observations. One income. */
export function mergeMoneyPictures(
  ledger: MoneyPictureAmounts | null,
  linked: ObservedPrefillSuggestion | null,
): MoneyPictureAmounts {
  const fromLinked: MoneyPictureAmounts | null = linked
    ? {
        monthlyIncome: linked.monthlyInflows > 0 ? linked.monthlyInflows : null,
        monthlyDebtPayments: linked.monthlyObligations > 0 ? linked.monthlyObligations : null,
        liquidSavings: linked.liquidBalances > 0 ? linked.liquidBalances : null,
        monthlyExpenses: linked.monthlySpend > 0 ? linked.monthlySpend : null,
        runwayMonths: linked.suggestedRunwayMonths,
        earmarkedDownPayment: null,
        homeTarget: null,
      }
    : null;

  if (!ledger) {
    return (
      fromLinked ?? {
        monthlyIncome: null,
        monthlyDebtPayments: null,
        liquidSavings: null,
        monthlyExpenses: null,
        runwayMonths: null,
        earmarkedDownPayment: null,
        homeTarget: null,
      }
    );
  }
  if (!fromLinked) return ledger;

  return {
    monthlyIncome: ledger.monthlyIncome ?? fromLinked.monthlyIncome,
    monthlyDebtPayments: ledger.monthlyDebtPayments ?? fromLinked.monthlyDebtPayments,
    liquidSavings: ledger.liquidSavings ?? fromLinked.liquidSavings,
    monthlyExpenses: ledger.monthlyExpenses ?? fromLinked.monthlyExpenses,
    runwayMonths: ledger.runwayMonths ?? fromLinked.runwayMonths,
    earmarkedDownPayment: ledger.earmarkedDownPayment ?? fromLinked.earmarkedDownPayment,
    homeTarget: ledger.homeTarget ?? fromLinked.homeTarget,
  };
}

export function isNeverPrefillQuestionId(id: string): boolean {
  if ((NEVER_PREFILL_QUESTION_IDS as readonly string[]).includes(id)) return true;
  return NEVER_PREFILL_QUESTION_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function isAllowedPrefillQuestionId(id: string): boolean {
  if (isNeverPrefillQuestionId(id)) return false;
  return (
    (DASHBOARD_PREFILL_QUESTION_IDS as readonly string[]).includes(id) ||
    (DASHBOARD_PREFILL_CHOICE_IDS as readonly string[]).includes(id)
  );
}
