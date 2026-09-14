/**
 * Path to Ready v1 → decision calendar bridge (read-only projection).
 *
 * Maps path milestones into calendar-entry-shaped objects matching the
 * existing `calendar_events` shape (types/database.ts CalendarEvent:
 * title / kind / event_date / notes / completed). The calendar schema has
 * no amount / funding / depends_on columns (assumption A9), so provenance
 * travels in the notes block plus a parseable marker — exactly how the
 * Phase 1 readiness path committed events (lib/readiness/path.ts).
 *
 * This is a PROJECTION: nothing here writes to the calendar. Milestones
 * without a target date produce no entry (null) — an undated milestone
 * must not appear as a fake calendar pin.
 *
 * Pure; deterministic.
 */

import type { PathMilestoneDraft, PathMilestoneStatus } from "./types";

/** Matches CalendarEventKind in types/database.ts. */
export type PathCalendarEntryKind = "milestone" | "deadline" | "review" | "payment";

export interface PathCalendarEntry {
  title: string;
  kind: PathCalendarEntryKind;
  /** Date-only (YYYY-MM-DD). */
  eventDate: string;
  notes: string;
  completed: boolean;
  /** Provenance back-references. */
  planId: string;
  milestoneId: string;
}

const KIND_MAP: Record<PathMilestoneDraft["kind"], PathCalendarEntryKind> = {
  hard_stop: "deadline",
  savings: "milestone",
  debt: "milestone",
  credit: "milestone",
  timing: "review",
  evidence: "review",
};

const MARKER_PREFIX = "<!--homi-path-plan:";
const MARKER_SUFFIX = "-->";

export function formatPathPlanMarker(planId: string, milestoneId: string): string {
  return `${MARKER_PREFIX}${planId}:${milestoneId}${MARKER_SUFFIX}`;
}

export function parsePathPlanMarker(
  notes: string | null | undefined,
): { planId: string; milestoneId: string } | null {
  if (!notes) return null;
  const m = /<!--homi-path-plan:([^:>]+):([^>]+)-->/.exec(notes);
  if (!m) return null;
  return { planId: m[1], milestoneId: m[2] };
}

function provenanceLine(m: PathMilestoneDraft): string {
  const p = m.fundingSource;
  if (p.basis === "insufficient_data") {
    return "Amount: not set — recorded data is insufficient for an honest target.";
  }
  if (m.targetAmountCents === null) return "Amount: none applies to this milestone.";
  const dollars = (m.targetAmountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const from = p.metric ?? p.basis;
  return `Target: ${dollars} — from recorded ${from} (confidence cap ${p.confidenceCap}).`;
}

/**
 * Maps one milestone to a calendar entry, or null when it has no target
 * date. `status` accepts the stored milestone status; drafts are pending.
 */
export function milestoneToCalendarEntry(
  milestone: PathMilestoneDraft,
  planId: string,
  status: PathMilestoneStatus = milestone.status,
): PathCalendarEntry | null {
  if (milestone.targetDate === null) return null;
  const notes = [
    `HōMI Path · ${milestone.kind}`,
    "",
    milestone.description,
    "",
    provenanceLine(milestone),
    milestone.toolSlug ? `Open: /tools (${milestone.toolSlug})` : "",
    "",
    formatPathPlanMarker(planId, milestone.id),
  ]
    .filter((line) => line !== "")
    .join("\n");
  return {
    title: milestone.title,
    kind: KIND_MAP[milestone.kind],
    eventDate: milestone.targetDate,
    notes,
    completed: status === "done",
    planId,
    milestoneId: milestone.id,
  };
}

/** Projects all dated milestones of a plan into calendar entries, in sort order. */
export function planToCalendarEntries(
  milestones: PathMilestoneDraft[],
  planId: string,
  statusById?: Map<string, PathMilestoneStatus>,
): PathCalendarEntry[] {
  const entries: PathCalendarEntry[] = [];
  for (const m of [...milestones].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const entry = milestoneToCalendarEntry(m, planId, statusById?.get(m.id) ?? m.status);
    if (entry) entries.push(entry);
  }
  return entries;
}
