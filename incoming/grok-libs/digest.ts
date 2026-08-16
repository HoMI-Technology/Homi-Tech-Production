/**
 * Spend digest — week-over-week category drift from ledger transactions.
 * Week-over-week category drift + readiness receipt helpers.
 */

import type { Transaction } from "./types";
import type { AssessmentResult, Verdict } from "./scoring";
import { PILLAR_MAX_POINTS } from "./scoring";

export interface CategorySpend {
  category: string;
  amount: number;
  prior: number;
  delta: number;
  deltaPct: number | null;
}

export interface SpendDigest {
  periodLabel: string;
  priorLabel: string;
  totalSpend: number;
  priorSpend: number;
  delta: number;
  deltaPct: number | null;
  income: number;
  topCategories: CategorySpend[];
  rising: CategorySpend[];
  falling: CategorySpend[];
  headline: string;
}

function dayMs(iso: string): number {
  return new Date(`${iso}T12:00:00`).getTime();
}

function inRange(iso: string, start: number, end: number): boolean {
  const t = dayMs(iso);
  return t >= start && t <= end;
}

export function buildSpendDigest(
  transactions: Transaction[],
  asOf = new Date(),
): SpendDigest {
  const end = new Date(asOf);
  end.setHours(12, 0, 0, 0);
  const endMs = end.getTime();
  const weekMs = 7 * 86_400_000;
  const thisStart = endMs - 6 * 86_400_000;
  const priorEnd = thisStart - 86_400_000;
  const priorStart = priorEnd - 6 * 86_400_000;

  const thisBy = new Map<string, number>();
  const priorBy = new Map<string, number>();
  let totalSpend = 0;
  let priorSpend = 0;
  let income = 0;

  for (const tx of transactions) {
    if (tx.type === "income") {
      if (inRange(tx.date, thisStart, endMs)) income += tx.amount;
      continue;
    }
    if (inRange(tx.date, thisStart, endMs)) {
      totalSpend += tx.amount;
      thisBy.set(tx.category, (thisBy.get(tx.category) ?? 0) + tx.amount);
    } else if (inRange(tx.date, priorStart, priorEnd)) {
      priorSpend += tx.amount;
      priorBy.set(tx.category, (priorBy.get(tx.category) ?? 0) + tx.amount);
    }
  }

  const cats = new Set([...thisBy.keys(), ...priorBy.keys()]);
  const rows: CategorySpend[] = [...cats].map((category) => {
    const amount = thisBy.get(category) ?? 0;
    const prior = priorBy.get(category) ?? 0;
    const delta = amount - prior;
    const deltaPct = prior > 0 ? (delta / prior) * 100 : amount > 0 ? 100 : null;
    return { category, amount, prior, delta, deltaPct };
  });

  rows.sort((a, b) => b.amount - a.amount);
  const rising = [...rows]
    .filter((r) => r.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
  const falling = [...rows]
    .filter((r) => r.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 3);

  const delta = totalSpend - priorSpend;
  const deltaPct = priorSpend > 0 ? (delta / priorSpend) * 100 : null;

  let headline: string;
  if (priorSpend === 0 && totalSpend === 0) {
    headline = "No spend recorded in the last two weeks.";
  } else if (deltaPct == null) {
    headline = `You spent ${fmt(totalSpend)} this week — no prior week to compare.`;
  } else if (Math.abs(deltaPct) < 5) {
    headline = `Spend is steady week-over-week (${fmt(totalSpend)}, ${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(0)}%).`;
  } else if (delta > 0) {
    const top = rising[0];
    headline = `Spend up ${deltaPct.toFixed(0)}% vs last week${
      top ? ` — ${top.category} drove +${fmt(top.delta)}` : ""
    }.`;
  } else {
    const top = falling[0];
    headline = `Spend down ${Math.abs(deltaPct).toFixed(0)}% vs last week${
      top ? ` — ${top.category} eased ${fmt(Math.abs(top.delta))}` : ""
    }.`;
  }

  return {
    periodLabel: "Last 7 days",
    priorLabel: "Prior 7 days",
    totalSpend,
    priorSpend,
    delta,
    deltaPct,
    income,
    topCategories: rows.slice(0, 6),
    rising,
    falling,
    headline,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Coarse score band for readiness receipts (FCRA-conscious). */
export type ScoreBand = "high" | "moderate" | "emerging" | "early";
export type PillarBand = "strong" | "developing" | "building";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "high";
  if (score >= 65) return "moderate";
  if (score >= 50) return "emerging";
  return "early";
}

export function pillarBand(pct: number): PillarBand {
  if (pct >= 75) return "strong";
  if (pct >= 50) return "developing";
  return "building";
}

export interface ReadinessReceipt {
  token: string;
  verdict: Verdict;
  scoreBand: ScoreBand;
  pillars: {
    financial: PillarBand;
    emotional: PillarBand;
    timing: PillarBand;
  };
  issuedAt: string;
  /** Never includes raw financials or identity — band-only. */
  disclaimer: string;
}

export function issueReadinessReceipt(result: AssessmentResult): ReadinessReceipt {
  const token = `homi_rcpt_${result.verdict.toLowerCase()}_${Math.round(result.score)}_${Date.now().toString(36)}`;
  return {
    token,
    verdict: result.verdict,
    scoreBand: scoreBand(result.score),
    pillars: {
      financial: pillarBand(
        (result.financial.total / PILLAR_MAX_POINTS.financial) * 100,
      ),
      emotional: pillarBand(
        (result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100,
      ),
      timing: pillarBand((result.timing.total / PILLAR_MAX_POINTS.timing) * 100),
    },
    issuedAt: new Date().toISOString(),
    disclaimer:
      "Band-only readiness receipt. No underlying financials or identity. Educational only — not credit, lending, or advice.",
  };
}

/** 30-day cashflow spark points from transactions (for overview). */
export function buildCashflowSpark(
  transactions: Transaction[],
  days = 30,
  asOf = new Date(),
): { date: string; net: number; cumulative: number }[] {
  const end = new Date(asOf);
  end.setHours(12, 0, 0, 0);
  const points: { date: string; net: number; cumulative: number }[] = [];
  let cumulative = 0;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${day}`;
    let net = 0;
    for (const tx of transactions) {
      if (tx.date !== iso) continue;
      net += tx.type === "income" ? tx.amount : -tx.amount;
    }
    cumulative += net;
    points.push({ date: iso, net, cumulative });
  }
  return points;
}
