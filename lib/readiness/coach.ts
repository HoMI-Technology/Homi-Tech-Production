/**
 * Companion path coach — structured lines for weekly board-meeting prompts.
 * Pure; never invents verdicts or numbers not on the path.
 */

import {
  bindingConstraintLabel,
  type ReadinessPath,
} from "./path";
import { computePathFreshness, pathCompletionRatio } from "./progress";

export interface PathCoachPack {
  /** One-line opener for Companion system note / empty state. */
  boardMeetingLine: string;
  /** Short chips the UI can offer as starter prompts. */
  suggestedPrompts: string[];
  pendingCount: number;
  completedCount: number;
  completionPct: number;
  nextStepTitle: string | null;
  nextStepHref: string | null;
  bindingLabel: string | null;
  isStale: boolean;
  staleReasons: string[];
}

export function buildPathCoachPack(
  path: ReadinessPath,
  opts?: { financeSavedAt?: string | null; now?: Date },
): PathCoachPack {
  const pending = path.steps.filter((s) => (s.status ?? "pending") === "pending");
  const completed = path.steps.filter(
    (s) => (s.status ?? "pending") === "done" || (s.status ?? "pending") === "skipped",
  );
  const next =
    pending.find((s) => s.reasonCode !== "REASSESS") ?? pending[0] ?? null;
  const freshness = computePathFreshness(path, opts);
  const completionPct = Math.round(pathCompletionRatio(path) * 100);
  const bindingLabel = path.bindingConstraint
    ? bindingConstraintLabel(path.bindingConstraint)
    : null;

  const boardMeetingLine =
    path.mode === "ready_optional"
      ? "Path mode is READY optional — no forced homework. Only reassess if life inputs changed."
      : freshness.isStale
        ? `Path coach: path may be stale. Binding was ${bindingLabel ?? "unset"}. Urge a regenerate or reassess before big moves.`
        : next
          ? `Path coach weekly board: binding ${bindingLabel ?? "gaps"}; next step "${next.title}" (${next.href}); ${completionPct}% resolved. Lead with this step. Never invent a READY verdict.`
          : `Path coach: all steps resolved (${completionPct}%). Point them to reassess on /assessment.`;

  const suggestedPrompts: string[] = [];
  if (next) {
    suggestedPrompts.push(`What does my next path step mean: ${next.title}?`);
    suggestedPrompts.push("How do I know when this binding constraint is clear?");
  }
  if (freshness.isStale) {
    suggestedPrompts.push("Is my Path to Ready still current?");
  }
  if (path.mode === "build") {
    suggestedPrompts.push("Walk me through my Path to Ready like a weekly board meeting.");
  }
  suggestedPrompts.push("What should I not do until my path gate clears?");

  return {
    boardMeetingLine,
    suggestedPrompts: suggestedPrompts.slice(0, 4),
    pendingCount: pending.length,
    completedCount: completed.length,
    completionPct,
    nextStepTitle: next?.title ?? null,
    nextStepHref: next?.href ?? null,
    bindingLabel,
    isStale: freshness.isStale,
    staleReasons: freshness.reasons,
  };
}
