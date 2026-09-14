/**
 * Budget & Runway — recurring transaction engine (pure).
 *
 * Two responsibilities:
 *   1. Detection: surface *candidates* from recorded transactions. Detection
 *      is heuristic — every candidate carries a confidence score and is
 *      labeled detected, never auto-activated and never presented as fact.
 *   2. Expansion: given a rule, enumerate its occurrences in a window.
 *      Date-only (YYYY-MM-DD) arithmetic throughout; month-end clamping
 *      keeps Jan 31 honest as Feb 28 without drifting the anchor day.
 *
 * No I/O, no clock reads — every window boundary is a parameter.
 */

import type { MoneyCents } from "@/lib/finance/money";
import type { FinanceTransaction, RecurringTransactionRule } from "@/lib/finance/ledger";

export type RecurringCadence = RecurringTransactionRule["cadence"];

/* ------------------------------------------------------------------ */
/* Date-only helpers (UTC-safe; no timezone drift)                     */
/* ------------------------------------------------------------------ */

function parseDate(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Whole days between two YYYY-MM-DD dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000,
  );
}

export function addDays(date: string, days: number): string {
  const { y, m, d } = parseDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return formatDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Add `months` keeping the anchor day, clamped to the target month's length. */
export function addMonthsClamped(date: string, months: number): string {
  const { y, m, d } = parseDate(date);
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = (total % 12) + 1;
  return formatDate(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

/* ------------------------------------------------------------------ */
/* Detection                                                           */
/* ------------------------------------------------------------------ */

/** Minimal transaction shape detection needs. */
export type DetectableTransaction = Pick<
  FinanceTransaction,
  | "type"
  | "status"
  | "deletedAt"
  | "isExcludedFromBudget"
  | "amountCents"
  | "transactionDate"
  | "merchantName"
  | "description"
  | "categoryId"
>;

export interface RecurringCandidate {
  /** Lowercased, punctuation-stripped payee used for grouping. */
  normalizedPayee: string;
  /** Original description of the latest occurrence, for display. */
  displayName: string;
  type: "income" | "expense";
  medianAmountCents: MoneyCents;
  suggestedCadence: RecurringCadence;
  occurrences: number;
  /** Median days between consecutive occurrences. */
  medianIntervalDays: number;
  /** Coefficient of variation of the intervals (0 = perfectly regular). */
  intervalCv: number;
  /** Coefficient of variation of the amounts (0 = perfectly stable). */
  amountCv: number;
  /** Detector confidence 0..1 — carried, never hidden. */
  confidence: number;
  firstDate: string;
  lastDate: string;
  categoryId: string | null;
}

export interface DetectionOptions {
  /** Max interval CV before a group is rejected as irregular. Default 0.25. */
  maxIntervalCv?: number;
  /** Amount-clustering tolerance as a fraction of the median. Default 0.05. */
  amountTolerancePct?: number;
  /** Smallest eligible amount. Default 300 ($3) — filters micro-noise. */
  minAmountCents?: MoneyCents;
  /** Largest eligible amount. Default 50000 ($500) per the Plaid heuristic. */
  maxAmountCents?: MoneyCents;
}

/** Normalize a payee for grouping: case/punctuation differences merge. */
export function normalizePayee(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function median(sorted: readonly number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function coefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/** Median day interval → suggested cadence, with semimonthly disambiguation. */
function inferCadence(
  medianIntervalDays: number,
  dates: readonly string[],
): RecurringCadence | null {
  if (medianIntervalDays >= 6 && medianIntervalDays <= 8) return "weekly";
  if (medianIntervalDays >= 13 && medianIntervalDays <= 16) {
    // Semimonthly anchors to two fixed days of the month (e.g. 1st & 15th)
    // so months regularly contain two occurrences; biweekly drifts through
    // the calendar and its day-of-month set keeps changing.
    const days = new Set(dates.map((d) => parseDate(d).d));
    if (days.size <= 2) {
      const perMonth = new Map<string, number>();
      for (const d of dates) {
        const month = d.slice(0, 7);
        perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
      }
      if ([...perMonth.values()].some((count) => count >= 2)) {
        return "semimonthly";
      }
    }
    return "biweekly";
  }
  if (medianIntervalDays >= 27 && medianIntervalDays <= 33) return "monthly";
  if (medianIntervalDays >= 85 && medianIntervalDays <= 95) return "quarterly";
  if (medianIntervalDays >= 360 && medianIntervalDays <= 370) return "annual";
  return null;
}

const SUB_MONTHLY: ReadonlySet<RecurringCadence> = new Set([
  "weekly",
  "biweekly",
  "semimonthly",
]);

/** Minimum evidence: 3 occurrences for monthly+, 4 for sub-monthly. */
export function minOccurrencesFor(cadence: RecurringCadence): number {
  return SUB_MONTHLY.has(cadence) ? 4 : 3;
}

/**
 * Rule-based recurring detection over ledger transactions (any source, not
 * just Plaid). Groups by normalized payee + amount tolerance, infers cadence
 * from date intervals, and scores confidence from occurrence count, interval
 * regularity, and amount stability.
 *
 * Output is a list of *candidates* — the caller labels them as detected and
 * never activates one without user confirmation.
 */
export function detectRecurringCandidates(
  transactions: readonly DetectableTransaction[],
  opts: DetectionOptions = {},
): RecurringCandidate[] {
  const maxIntervalCv = opts.maxIntervalCv ?? 0.25;
  const amountTolerancePct = opts.amountTolerancePct ?? 0.05;
  const minAmountCents = opts.minAmountCents ?? 300;
  const maxAmountCents = opts.maxAmountCents ?? 50_000;

  // Only real income/expense events are evidence; pending, voided, deleted,
  // excluded, transfers, and refunds never feed detection.
  const eligible = transactions.filter(
    (tx) =>
      (tx.type === "income" || tx.type === "expense") &&
      tx.status === "posted" &&
      tx.deletedAt === null &&
      !tx.isExcludedFromBudget &&
      tx.amountCents >= minAmountCents &&
      tx.amountCents <= maxAmountCents,
  );

  const byPayee = new Map<string, DetectableTransaction[]>();
  for (const tx of eligible) {
    const key = normalizePayee(tx.merchantName ?? tx.description);
    if (!key) continue;
    const list = byPayee.get(key);
    if (list) list.push(tx);
    else byPayee.set(key, [tx]);
  }

  const candidates: RecurringCandidate[] = [];

  for (const [payee, txs] of byPayee) {
    // Cluster by amount within tolerance so a payee with two distinct
    // recurring charges (e.g. two plans) yields two candidates, not one.
    const byAmount = [...txs].sort((a, b) => a.amountCents - b.amountCents);
    const clusters: DetectableTransaction[][] = [];
    for (const tx of byAmount) {
      const cluster = clusters[clusters.length - 1];
      if (cluster) {
        const clusterMedian = median(cluster.map((c) => c.amountCents).sort((a, b) => a - b));
        if (Math.abs(tx.amountCents - clusterMedian) <= clusterMedian * amountTolerancePct) {
          cluster.push(tx);
          continue;
        }
      }
      clusters.push([tx]);
    }

    for (const cluster of clusters) {
      const type = cluster[0].type as "income" | "expense";
      const dates = cluster.map((tx) => tx.transactionDate).sort();
      if (dates.length < 3) continue;

      const intervals: number[] = [];
      for (let i = 1; i < dates.length; i += 1) {
        intervals.push(daysBetween(dates[i - 1], dates[i]));
      }
      if (intervals.some((d) => d === 0)) continue; // same-day dupes are not a cadence

      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      const medianIntervalDays = median(sortedIntervals);
      const cadence = inferCadence(medianIntervalDays, dates);
      if (cadence === null) continue;
      if (dates.length < minOccurrencesFor(cadence)) continue;

      const intervalCv = coefficientOfVariation(intervals);
      if (intervalCv > maxIntervalCv) continue; // irregular spacing is noise

      const amounts = cluster.map((tx) => tx.amountCents);
      const amountCv = coefficientOfVariation(amounts);
      const medianAmountCents = Math.round(
        median([...amounts].sort((a, b) => a - b)),
      );

      // Confidence: more occurrences, steadier intervals, and steadier
      // amounts all raise it; nothing ever reaches 1.0 from heuristics.
      const occurrenceScore = Math.min(dates.length / 6, 1);
      const regularityScore = 1 - intervalCv / maxIntervalCv;
      const stabilityScore = 1 - Math.min(amountCv / 0.1, 1);
      const confidence =
        Math.round(
          (0.4 * occurrenceScore + 0.4 * regularityScore + 0.2 * stabilityScore) * 100,
        ) / 100;

      const latest = cluster.reduce((a, b) =>
        a.transactionDate >= b.transactionDate ? a : b,
      );

      candidates.push({
        normalizedPayee: payee,
        displayName: latest.merchantName ?? latest.description,
        type,
        medianAmountCents,
        suggestedCadence: cadence,
        occurrences: dates.length,
        medianIntervalDays,
        intervalCv: Math.round(intervalCv * 1000) / 1000,
        amountCv: Math.round(amountCv * 1000) / 1000,
        confidence,
        firstDate: dates[0],
        lastDate: dates[dates.length - 1],
        categoryId: latest.categoryId,
      });
    }
  }

  // Most confident first, for stable review ordering.
  return candidates.sort(
    (a, b) => b.confidence - a.confidence || a.normalizedPayee.localeCompare(b.normalizedPayee),
  );
}

/* ------------------------------------------------------------------ */
/* Expansion                                                           */
/* ------------------------------------------------------------------ */

type RuleShape = Pick<
  RecurringTransactionRule,
  "cadence" | "startDate" | "endDate" | "isActive" | "deletedAt"
>;

function semimonthlyDaysOfMonth(startDate: string): [number, number] {
  const { d } = parseDate(startDate);
  // Anchors a half-month apart: 14th → [14, 28+clamp], 31st → [16, 31].
  return d <= 15 ? [d, d + 15] : [d - 15, d];
}

/**
 * All occurrence dates of a rule inside [fromDate, toDate] (inclusive),
 * honoring startDate and endDate. Month-based cadences keep the anchor
 * day with month-end clamping (Jan 31 → Feb 28 → Mar 31); semimonthly
 * fires on the two anchor days per month, clamped.
 */
export function expandOccurrences(
  rule: RuleShape,
  fromDate: string,
  toDate: string,
): string[] {
  if (fromDate > toDate) return [];
  const windowStart = rule.startDate > fromDate ? rule.startDate : fromDate;
  const windowEnd =
    rule.endDate !== null && rule.endDate < toDate ? rule.endDate : toDate;
  if (windowStart > windowEnd) return [];

  const dates: string[] = [];

  if (rule.cadence === "weekly" || rule.cadence === "biweekly") {
    const step = rule.cadence === "weekly" ? 7 : 14;
    // Skip whole steps up to the window instead of iterating from the start.
    const gap = daysBetween(rule.startDate, windowStart);
    let current =
      gap <= 0 ? rule.startDate : addDays(rule.startDate, Math.ceil(gap / step) * step);
    while (current <= windowEnd) {
      if (current >= windowStart) dates.push(current);
      current = addDays(current, step);
    }
    return dates;
  }

  if (rule.cadence === "semimonthly") {
    const [d1, d2] = semimonthlyDaysOfMonth(rule.startDate);
    const { y, m } = parseDate(windowStart);
    // Iterate months covering the window (start one month back to catch d2
    // when the window opens after d1 but before d2).
    let cursor = y * 12 + (m - 1) - 1;
    const endTotal = (() => {
      const e = parseDate(windowEnd);
      return e.y * 12 + (e.m - 1);
    })();
    while (cursor <= endTotal) {
      const cy = Math.floor(cursor / 12);
      const cm = (cursor % 12) + 1;
      const dim = daysInMonth(cy, cm);
      for (const anchor of [d1, d2]) {
        const date = formatDate(cy, cm, Math.min(anchor, dim));
        if (date >= rule.startDate && date >= windowStart && date <= windowEnd) {
          dates.push(date);
        }
      }
      cursor += 1;
    }
    return dates.sort();
  }

  // monthly / quarterly / annual — anchored to startDate's day-of-month.
  const stepMonths = rule.cadence === "monthly" ? 1 : rule.cadence === "quarterly" ? 3 : 12;
  const { y, m } = parseDate(rule.startDate);
  const startTotal = y * 12 + (m - 1);
  const ws = parseDate(windowStart);
  const we = parseDate(windowEnd);
  const firstTotal = ws.y * 12 + (ws.m - 1);
  const lastTotal = we.y * 12 + (we.m - 1);
  // First step index whose month could contain an in-window occurrence.
  let k = Math.max(0, Math.floor((firstTotal - startTotal) / stepMonths) - 1);
  while (startTotal + k * stepMonths <= lastTotal) {
    const date = addMonthsClamped(rule.startDate, k * stepMonths);
    if (date >= windowStart && date <= windowEnd && date >= rule.startDate) {
      dates.push(date);
    }
    k += 1;
  }
  return dates.sort();
}

/** The first occurrence strictly after `afterDate`, or null past endDate. */
export function nextOccurrence(rule: RuleShape, afterDate: string): string | null {
  if (!rule.isActive || rule.deletedAt !== null) return null;
  // Expansion window: one full cadence span past the slowest possible next hit.
  const spanDays =
    rule.cadence === "annual"
      ? 400
      : rule.cadence === "quarterly"
        ? 100
        : 35;
  const dates = expandOccurrences(rule, addDays(afterDate, 1), addDays(afterDate, spanDays));
  return dates[0] ?? null;
}

export interface DueRule<T extends RuleShape = RecurringTransactionRule> {
  rule: T;
  dates: string[];
}

/** Active, live rules with at least one occurrence inside the window. */
export function rulesDueInWindow<T extends RuleShape>(
  rules: readonly T[],
  window: { fromDate: string; toDate: string },
): DueRule<T>[] {
  const due: DueRule<T>[] = [];
  for (const rule of rules) {
    if (!rule.isActive || rule.deletedAt !== null) continue;
    const dates = expandOccurrences(rule, window.fromDate, window.toDate);
    if (dates.length > 0) due.push({ rule, dates });
  }
  return due;
}

/**
 * Stable dedupe key for generated rows: retries and regeneration of the
 * same rule + date must never create a second transaction.
 */
export function recurringGenerationKey(ruleId: string, date: string): string {
  return `rr-${ruleId}-${date}`;
}
