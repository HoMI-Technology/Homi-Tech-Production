/**
 * Path to Ready v1 — advisor context block.
 *
 * Produces the small, neutral text block the Companion includes in its
 * context (pattern: lib/advisor/context.ts context builders). It reports
 * the active constraint, the next milestone, and progress counts — it
 * never generates advice and never quotes a number the path did not
 * derive from recorded data.
 *
 * Pure; deterministic.
 */

import type { BindingConstraint, PathMilestoneDraft, PathMilestoneStatus } from "./types";

export interface PathSummaryInput {
  status: "draft" | "active" | "completed" | "archived";
  bindingConstraint: BindingConstraint;
  milestones: Array<Pick<PathMilestoneDraft, "id" | "title" | "targetDate" | "sortOrder">>;
  statusById: Map<string, PathMilestoneStatus>;
}

/**
 * One neutral paragraph, or null when there is no active path to report.
 * Counts only; the Companion names the next milestone, nothing more.
 */
export function buildPathSummary(input: PathSummaryInput): string | null {
  if (input.status !== "active" && input.status !== "draft") return null;
  const total = input.milestones.length;
  if (total === 0) return null;

  const done = input.milestones.filter(
    (m) => (input.statusById.get(m.id) ?? "pending") === "done",
  ).length;
  const next = [...input.milestones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((m) => {
      const s = input.statusById.get(m.id) ?? "pending";
      return s === "pending" || s === "active";
    });

  const parts = [
    `Active path: ${total} milestone${total === 1 ? "" : "s"}, ${done} complete.`,
    `Current constraint: ${input.bindingConstraint.label}.`,
  ];
  if (next) {
    parts.push(
      next.targetDate
        ? `Next milestone: ${next.title} (${next.targetDate}).`
        : `Next milestone: ${next.title}.`,
    );
  } else {
    parts.push("All milestones are resolved; a fresh assessment can update the path.");
  }
  return parts.join(" ");
}
