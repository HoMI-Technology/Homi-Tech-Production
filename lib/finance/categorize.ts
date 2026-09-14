/**
 * Budget & Runway — Phase 2 rule-based auto-categorization (pure).
 *
 * Deterministic, user-authored rules map payees to categories. No ML, no
 * guessing: a rule only fires when the user created it (or confirmed a
 * suggestion derived from their own history). Suggestions are labeled as
 * suggestions and never applied automatically.
 *
 * Determinism contract for applyCategoryRules:
 *   1. lower `priority` number wins (0 is evaluated first)
 *   2. at equal priority, payee_exact beats payee_contains
 *   3. remaining ties break by pattern, then rule id (stable order)
 * First match in that order wins; the same inputs always pick the same rule.
 */

import type { FinanceTransaction } from "@/lib/finance/ledger";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CategoryRuleMatchType = "payee_exact" | "payee_contains";

export interface CategoryRule {
  id: string;
  matchType: CategoryRuleMatchType;
  /** Stored normalized (see normalizePayee) so matching is case-folded. */
  pattern: string;
  categoryId: string;
  priority: number;
}

/** Case-folded, whitespace-collapsed payee for stable matching. */
export function normalizePayee(payee: string): string {
  return payee.trim().toLowerCase().replace(/\s+/g, " ");
}

function matches(rule: CategoryRule, normalizedPayee: string): boolean {
  return rule.matchType === "payee_exact"
    ? normalizedPayee === rule.pattern
    : normalizedPayee.includes(rule.pattern);
}

/**
 * Priority-ordered deterministic matching. Returns the winning rule, or
 * null when nothing matches. Input order of `rules` is irrelevant.
 */
export function applyCategoryRules(
  payee: string,
  rules: readonly CategoryRule[],
): CategoryRule | null {
  const normalized = normalizePayee(payee);
  if (normalized === "") return null;

  const ordered = [...rules].sort(
    (a, b) =>
      a.priority - b.priority ||
      (a.matchType === b.matchType ? 0 : a.matchType === "payee_exact" ? -1 : 1) ||
      a.pattern.localeCompare(b.pattern) ||
      a.id.localeCompare(b.id),
  );

  return ordered.find((rule) => matches(rule, normalized)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Suggestions from history                                            */
/* ------------------------------------------------------------------ */

export const SUGGESTION_MIN_OCCURRENCES = 3;

export interface CategoryRuleSuggestion {
  matchType: "payee_exact";
  /** Normalized payee observed in history. */
  pattern: string;
  categoryId: string;
  /** How many qualifying transactions back the suggestion. */
  occurrences: number;
  /** Always true — these are candidates for the user to confirm, never
   * auto-created rules. */
  isSuggestion: true;
}

export interface CategoryRuleConflict {
  pattern: string;
  /** categoryId -> occurrences; the payee was filed under more than one
   * category, so no honest rule exists yet. */
  categoryCounts: Record<string, number>;
}

export interface SuggestRulesResult {
  suggestions: CategoryRuleSuggestion[];
  /** Payees seen often enough but with conflicting categories — disclosed
   * rather than silently skipped or guessed. */
  conflicts: CategoryRuleConflict[];
}

/**
 * Derives candidate rules from the user's own manual categorizations:
 * the same normalized payee filed under the same category at least
 * `minOccurrences` times (default 3) yields a payee_exact suggestion.
 *
 * Only manual, alive, posted rows with a category count — imported rows
 * carry a provider category, not a user decision, and pending/voided rows
 * are not decisions either. Payees with conflicting categories are
 * reported as conflicts, never resolved by majority vote (the counts are
 * shown so the user decides).
 */
export function suggestRulesFromHistory(
  transactions: readonly FinanceTransaction[],
  minOccurrences: number = SUGGESTION_MIN_OCCURRENCES,
): SuggestRulesResult {
  // payee -> categoryId -> count
  const counts = new Map<string, Map<string, number>>();

  for (const tx of transactions) {
    if (tx.source !== "manual") continue;
    if (tx.status !== "posted" || tx.deletedAt !== null) continue;
    if (tx.type !== "expense" && tx.type !== "income") continue;
    if (tx.categoryId === null) continue;
    const payee = normalizePayee(tx.merchantName ?? tx.description);
    if (payee === "") continue;

    const byCategory = counts.get(payee) ?? new Map<string, number>();
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + 1);
    counts.set(payee, byCategory);
  }

  const suggestions: CategoryRuleSuggestion[] = [];
  const conflicts: CategoryRuleConflict[] = [];

  for (const [pattern, byCategory] of [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const total = [...byCategory.values()].reduce((a, b) => a + b, 0);
    if (total < minOccurrences) continue;

    if (byCategory.size === 1) {
      const [categoryId, occurrences] = [...byCategory.entries()][0]!;
      suggestions.push({
        matchType: "payee_exact",
        pattern,
        categoryId,
        occurrences,
        isSuggestion: true,
      });
    } else {
      conflicts.push({
        pattern,
        categoryCounts: Object.fromEntries(
          [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
        ),
      });
    }
  }

  return { suggestions, conflicts };
}
