/**
 * Budget & Runway — envelope / zero-based budgeting engine.
 *
 * Pure arithmetic over the ledger domain types (PR 1). No I/O, no clock
 * reads — the period bounds and the transaction list are always passed in,
 * so the same inputs always produce the same outputs.
 *
 * Vocabulary:
 *   assigned    — planned cents the user gave a category this period
 *   activity    — net posted outflow (expenses − refunds) in the period
 *   available   — assigned − activity, plus rollover carried in
 *   readyToAssign — posted income not yet assigned to any category
 *
 * Zero-based rule: every dollar of income is assigned to exactly one
 * envelope, so readyToAssign should reach zero — never negative.
 */

import { sumCents, type MoneyCents } from "@/lib/finance/money";
import {
  countsAsIncome,
  countsAsRefund,
  countsAsSpending,
  isInPeriod,
} from "@/lib/finance/calculations";
import type {
  BudgetCategoryAllocation,
  BudgetPeriod,
  FinanceTransaction,
} from "@/lib/finance/ledger";

/** Rollover semantics mirror BudgetCategoryAllocation.rolloverMode. */
export type RolloverMode = BudgetCategoryAllocation["rolloverMode"];

/* ------------------------------------------------------------------ */
/* Rollover                                                            */
/* ------------------------------------------------------------------ */

/**
 * What a prior period's `available` balance contributes to the next
 * period, per the allocation's rollover mode:
 *
 *   none          — nothing carries; the envelope resets each period.
 *   positive_only — a positive balance carries; an overspent envelope
 *                   does not hand its deficit to the next period.
 *   full          — the balance carries in either direction, so an
 *                   overspent envelope starts the next period in the hole.
 *
 * `prevAvailableCents` is signed integer cents (negative = overspent).
 */
export function applyRollover(
  prevAvailableCents: MoneyCents,
  rolloverMode: RolloverMode,
): MoneyCents {
  switch (rolloverMode) {
    case "none":
      return 0;
    case "positive_only":
      return Math.max(0, prevAvailableCents);
    case "full":
      return prevAvailableCents;
  }
}

/* ------------------------------------------------------------------ */
/* Ready to assign (zero-based)                                        */
/* ------------------------------------------------------------------ */

export interface ReadyToAssign {
  /** Posted income received in the period. */
  incomeCents: MoneyCents;
  /** Total planned across all of the period's category allocations. */
  assignedCents: MoneyCents;
  /**
   * income − assigned. Positive = income still unassigned; negative =
   * the user has assigned more than they received (disclosed, not hidden).
   */
  readyToAssignCents: MoneyCents;
}

/**
 * Zero-based "assign every dollar": posted income in the period minus the
 * sum of planned allocations. Pending and voided transactions never count
 * (same inclusion predicates as summarizePeriod). Only allocations that
 * belong to this period are summed — an allocation for another period
 * must not consume this period's income.
 */
export function computeReadyToAssign(
  period: Pick<BudgetPeriod, "id" | "periodStart" | "periodEnd">,
  transactions: readonly FinanceTransaction[],
  allocations: readonly Pick<BudgetCategoryAllocation, "budgetPeriodId" | "plannedCents">[],
): ReadyToAssign {
  const incomeCents = sumCents(
    transactions
      .filter((tx) => isInPeriod(tx, period) && countsAsIncome(tx))
      .map((tx) => tx.amountCents),
  );
  const assignedCents = sumCents(
    allocations
      .filter((allocation) => allocation.budgetPeriodId === period.id)
      .map((allocation) => allocation.plannedCents),
  );
  return { incomeCents, assignedCents, readyToAssignCents: incomeCents - assignedCents };
}

/* ------------------------------------------------------------------ */
/* Envelope state                                                      */
/* ------------------------------------------------------------------ */

export interface EnvelopeCategoryState {
  categoryId: string;
  /** Planned cents assigned this period. */
  assignedCents: MoneyCents;
  /** Net posted outflow this period (expenses − refunds). */
  activityCents: MoneyCents;
  /** Signed balance carried in from the prior period per rolloverMode. */
  rolloverAppliedCents: MoneyCents;
  /** assigned − activity + rolloverApplied. Negative = overspent. */
  availableCents: MoneyCents;
  overspent: boolean;
  /** Magnitude of the overspend; 0 when the envelope is not overspent. */
  overspentCents: MoneyCents;
  /** activity ÷ assigned; null when nothing is assigned (no false precision). */
  utilization: number | null;
}

/**
 * Per-category envelope state for one period.
 *
 * `priorAvailableByCategory` supplies each category's signed available
 * balance at the end of the prior period (the caller derives it by running
 * this function on that period). Categories without a prior entry roll in
 * zero. Only posted, non-excluded expenses and refunds count toward
 * activity — pending rows are disclosed elsewhere, never silently counted.
 */
export function computeEnvelopeState(
  period: Pick<BudgetPeriod, "id" | "periodStart" | "periodEnd">,
  allocations: readonly BudgetCategoryAllocation[],
  transactions: readonly FinanceTransaction[],
  priorAvailableByCategory?: ReadonlyMap<string, MoneyCents>,
): EnvelopeCategoryState[] {
  const activityByCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (!isInPeriod(tx, period) || tx.categoryId === null) continue;
    let signed: number;
    if (countsAsSpending(tx)) signed = tx.amountCents;
    else if (countsAsRefund(tx)) signed = -tx.amountCents;
    else continue;
    activityByCategory.set(tx.categoryId, (activityByCategory.get(tx.categoryId) ?? 0) + signed);
  }

  const states: EnvelopeCategoryState[] = [];
  for (const allocation of allocations) {
    if (allocation.budgetPeriodId !== period.id) continue;
    const activityCents = activityByCategory.get(allocation.categoryId) ?? 0;
    const rolloverAppliedCents = applyRollover(
      priorAvailableByCategory?.get(allocation.categoryId) ?? 0,
      allocation.rolloverMode,
    );
    const availableCents = allocation.plannedCents - activityCents + rolloverAppliedCents;
    states.push({
      categoryId: allocation.categoryId,
      assignedCents: allocation.plannedCents,
      activityCents,
      rolloverAppliedCents,
      availableCents,
      overspent: availableCents < 0,
      overspentCents: availableCents < 0 ? -availableCents : 0,
      utilization:
        allocation.plannedCents > 0 ? activityCents / allocation.plannedCents : null,
    });
  }

  // Stable order for deterministic rendering: most overspent first, then
  // highest utilization, then category id.
  return states.sort((a, b) => {
    if (a.overspent !== b.overspent) return a.overspent ? -1 : 1;
    const ua = a.utilization ?? -1;
    const ub = b.utilization ?? -1;
    if (ua !== ub) return ub - ua;
    return a.categoryId.localeCompare(b.categoryId);
  });
}

/* ------------------------------------------------------------------ */
/* Overspend detection                                                 */
/* ------------------------------------------------------------------ */

export interface OverspentEnvelope {
  categoryId: string;
  assignedCents: MoneyCents;
  activityCents: MoneyCents;
  /** Positive magnitude of the overspend (availableCents × −1). */
  overspentCents: MoneyCents;
}

/**
 * Categories whose envelope balance has gone below zero — i.e. utilization
 * above 100% of assigned + rolled-in funds. Returns amounts, not advice.
 */
export function detectOverspending(
  envelopeState: readonly EnvelopeCategoryState[],
): OverspentEnvelope[] {
  return envelopeState
    .filter((state) => state.overspent)
    .map((state) => ({
      categoryId: state.categoryId,
      assignedCents: state.assignedCents,
      activityCents: state.activityCents,
      overspentCents: state.overspentCents,
    }));
}

/* ------------------------------------------------------------------ */
/* Auto-funding suggestion (mechanical, no advice)                     */
/* ------------------------------------------------------------------ */

export interface FundingTarget {
  categoryId: string;
  /** Desired assignment for the period (the envelope's funding goal). */
  targetCents: MoneyCents;
  /** Lower number = funded earlier under the priority strategy. */
  priority: number;
}

export interface FundingDelta {
  categoryId: string;
  /** Cents to add to the category's assignment. Never negative. */
  deltaCents: MoneyCents;
}

/**
 * Splits `readyToAssignCents` across funding targets without exceeding it.
 * Pure arithmetic — which target gets funded is the caller's input
 * (priority order or target sizes), never a judgment by this function.
 *
 *   priority     — targets funded in ascending priority order (ties broken
 *                  by category id); each is fully funded before the next,
 *                  and the last funded target may be partially filled.
 *   proportional — each target receives floor(target × r) where r =
 *                  readyToAssign ÷ total target (capped at 1); leftover
 *                  cents from flooring are distributed one cent at a time
 *                  in priority order until exhausted.
 *
 * Deterministic: equal inputs always produce the same deltas.
 */
export function suggestAutoFunding(
  targets: readonly FundingTarget[],
  readyToAssignCents: MoneyCents,
  strategy: "priority" | "proportional",
): FundingDelta[] {
  if (readyToAssignCents <= 0 || targets.length === 0) return [];

  const ordered = [...targets].sort(
    (a, b) => a.priority - b.priority || a.categoryId.localeCompare(b.categoryId),
  );

  if (strategy === "priority") {
    const deltas: FundingDelta[] = [];
    let remaining = readyToAssignCents;
    for (const target of ordered) {
      if (remaining <= 0) break;
      const deltaCents = Math.min(target.targetCents, remaining);
      if (deltaCents > 0) {
        deltas.push({ categoryId: target.categoryId, deltaCents });
        remaining -= deltaCents;
      }
    }
    return deltas;
  }

  // proportional
  const totalTarget = sumCents(ordered.map((target) => target.targetCents));
  if (totalTarget <= 0) return [];
  const ratio = Math.min(1, readyToAssignCents / totalTarget);

  const deltas: FundingDelta[] = ordered.map((target) => ({
    categoryId: target.categoryId,
    deltaCents: Math.floor(target.targetCents * ratio),
  }));

  let distributed = sumCents(deltas.map((delta) => delta.deltaCents));
  let leftover = Math.min(readyToAssignCents, totalTarget) - distributed;

  // Flooring leaves a remainder under the cap; hand it out one cent at a
  // time in priority order so the total still lands exactly on the budget.
  for (let i = 0; leftover > 0 && ordered.length > 0; i = (i + 1) % ordered.length) {
    const delta = deltas[i];
    if (delta.deltaCents < ordered[i].targetCents) {
      delta.deltaCents += 1;
      distributed += 1;
      leftover -= 1;
    } else if (deltas.every((d, j) => d.deltaCents >= ordered[j].targetCents)) {
      break;
    }
  }

  return deltas.filter((delta) => delta.deltaCents > 0);
}

/* ------------------------------------------------------------------ */
/* Move money between envelopes                                        */
/* ------------------------------------------------------------------ */

/**
 * Moves `amountCents` of planned assignment from one category to another
 * within the same period, returning a new allocations array (inputs are
 * not mutated).
 *
 * Validation:
 *   - amountCents must be a positive integer within range
 *   - both categories must have an allocation in the same budget period
 *   - the source must not drop below zero — moving money the envelope
 *     does not have would silently create unassigned income
 *
 * Throws RangeError on invalid input; a UI surfaces the message, the
 * function never partially applies.
 */
export function moveBetweenEnvelopes(
  allocations: readonly BudgetCategoryAllocation[],
  fromCategoryId: string,
  toCategoryId: string,
  amountCents: MoneyCents,
): BudgetCategoryAllocation[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new RangeError(`Move amount must be a positive integer of cents: ${amountCents}`);
  }
  if (fromCategoryId === toCategoryId) {
    throw new RangeError("Cannot move money between an envelope and itself.");
  }

  const from = allocations.find((a) => a.categoryId === fromCategoryId);
  const to = allocations.find((a) => a.categoryId === toCategoryId);
  if (!from || !to) {
    throw new RangeError("Both envelopes must have an allocation in this period.");
  }
  if (from.budgetPeriodId !== to.budgetPeriodId) {
    throw new RangeError("Cannot move money between envelopes of different periods.");
  }
  if (from.plannedCents - amountCents < 0) {
    throw new RangeError(
      `Envelope ${fromCategoryId} only has ${from.plannedCents} cents assigned.`,
    );
  }

  return allocations.map((allocation) => {
    if (allocation.id === from.id) {
      return { ...allocation, plannedCents: allocation.plannedCents - amountCents };
    }
    if (allocation.id === to.id) {
      return { ...allocation, plannedCents: allocation.plannedCents + amountCents };
    }
    return allocation;
  });
}
