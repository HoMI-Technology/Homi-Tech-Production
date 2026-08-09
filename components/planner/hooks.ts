"use client";

/**
 * Shared planner hooks + formatters (extracted so Overview/Plan can share
 * one derivation path without circular imports on ReadinessHero).
 */

import { useEffect, useMemo, useState } from "react";
import {
  financialReality,
  summarizeAccounts,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
} from "@/lib/planner/derived";
import { scoreFromBudgetAsync, type PlannerScore } from "@/lib/planner/score-bridge";
import { usePlannerStore } from "@/lib/planner/store";
import { deriveBehaviorNudges } from "@/lib/planner/nudges";
import { analyzeStress } from "@/lib/planner/stress";
import { getLastScoreResult } from "@/lib/planner/score-bridge";

const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const USD2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const fmtUsd0 = (n: number): string => USD0.format(n);
export const fmtUsd2 = (n: number): string => USD2.format(n);
export const fmtSignedUsd0 = (n: number): string =>
  `${n >= 0 ? "+" : "−"}${USD0.format(Math.abs(n))}`;

export function fmtDayShort(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Live planner score via server API (null while loading / incomplete profile). */
export function usePlannerScore(): PlannerScore | null {
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);
  const savingsGoal = usePlannerStore((s) => s.savingsGoal);
  const readinessProfile = usePlannerStore((s) => s.readinessProfile);
  const [score, setScore] = useState<PlannerScore | null>(null);

  useEffect(() => {
    if (!readinessProfile.profileComplete) {
      setScore(null);
      return;
    }
    let cancelled = false;
    void scoreFromBudgetAsync({
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
    })
      .then((s) => {
        if (!cancelled) setScore(s);
      })
      .catch(() => {
        if (!cancelled) setScore(null);
      });
    return () => {
      cancelled = true;
    };
  }, [transactions, accounts, bills, holdings, netWorthItems, savingsGoal, readinessProfile]);

  return score;
}

export function usePlannerReality() {
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);

  return useMemo(() => {
    const reality = financialReality(transactions, accounts, bills);
    const { cash } = summarizeAccounts(accounts);
    const portfolio = summarizePortfolio(holdings);
    const nw = totalNetWorth(accounts, holdings, netWorthItems);
    const billsOpen = upcomingBillsTotal(bills);
    return { reality, cash, portfolio, nw, billsOpen };
  }, [transactions, accounts, bills, holdings, netWorthItems]);
}

export function usePlannerIsEmpty(): boolean {
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  return transactions.length === 0 && accounts.length === 0 && bills.length === 0;
}

/** Ranked protective nudges from live planner state. */
export function useBehaviorNudges() {
  const bills = usePlannerStore((s) => s.bills);
  const path = usePlannerStore((s) => s.path);
  const checkins = usePlannerStore((s) => s.checkins);
  const lastImpact = usePlannerStore((s) => s.lastImpact);
  const readinessProfile = usePlannerStore((s) => s.readinessProfile);
  const { reality } = usePlannerReality();
  const stress = useMemo(() => analyzeStress(checkins), [checkins]);
  const assessment = getLastScoreResult();

  return useMemo(
    () =>
      deriveBehaviorNudges({
        assessment,
        bills,
        path,
        stress,
        cashFlow: reality.cashFlow,
        runwayMonths: Number.isFinite(reality.runwayMonths) ? reality.runwayMonths : 99,
        savingsRate: reality.savingsRate,
        lastScoreDelta: lastImpact?.delta ?? null,
        partnerAlignment: readinessProfile.partnerAlignment,
      }).slice(0, 3),
    [assessment, bills, path, stress, reality, lastImpact, readinessProfile.partnerAlignment],
  );
}
