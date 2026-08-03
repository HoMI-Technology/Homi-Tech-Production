"use client";

import { useMemo } from "react";
import { COLORS, VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import type { AssessmentRow, DailyCheckin, JournalEntry } from "@/types/database";

interface TimelineEvent {
  id: string;
  type: "assessment" | "journal" | "checkin";
  date: string;
  title: string;
  subtitle?: string;
  color: string;
}

interface DecisionTimelineProps {
  assessments: AssessmentRow[];
  checkins: DailyCheckin[];
  journalEntries: Pick<
    JournalEntry,
    "id" | "title" | "context" | "decision_date" | "created_at"
  >[];
  maxItems?: number;
}

export function DecisionTimeline({
  assessments,
  checkins,
  journalEntries,
  maxItems = 15,
}: DecisionTimelineProps) {
  const events = useMemo<TimelineEvent[]>(() => {
    const mapped: TimelineEvent[] = [
      ...assessments.slice(0, maxItems).map((a): TimelineEvent => {
        const verdict = a.verdict as VerdictKey | null;
        const meta = verdict ? VERDICT_META[verdict] : null;
        return {
          id: `a-${a.id}`,
          type: "assessment",
          date: a.completed_at ?? a.created_at,
          title: meta?.label ?? "Assessment",
          subtitle: a.overall_score !== null ? `Score: ${Math.round(a.overall_score)}` : undefined,
          color: meta?.color ?? COLORS.cyan,
        };
      }),
      ...journalEntries.slice(0, maxItems).map((j): TimelineEvent => ({
        id: `j-${j.id}`,
        type: "journal",
        date: j.created_at,
        title: j.title,
        subtitle: j.context ?? undefined,
        color: COLORS.emerald,
      })),
      ...checkins.slice(0, maxItems).map((c): TimelineEvent => ({
        id: `c-${c.id}`,
        type: "checkin",
        date: c.created_at,
        title: "Daily Check-in",
        subtitle: `Mood: ${c.mood}/10`,
        color: COLORS.yellow,
      })),
    ];

    mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return mapped.slice(0, maxItems);
  }, [assessments, checkins, journalEntries, maxItems]);

  if (events.length === 0) {
    return (
      <div className="glass p-6">
        <p className="eyebrow">Timeline</p>
        <h3 className="mt-2 font-display text-xl text-light">Your decision history</h3>
        <p className="mt-3 text-sm text-dim">
          Your assessments, journal entries, and check-ins will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <p className="eyebrow">Timeline</p>
      <h3 className="mt-2 font-display text-xl text-light">Your decision history</h3>

      <div className="mt-5 relative">
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px"
          style={{ background: `linear-gradient(to bottom, ${withAlpha(COLORS.dim, 0.3)}, transparent)` }}
        />

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-4">
              <div
                className="relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2"
                style={{
                  background: event.color + "22",
                  borderColor: event.color,
                  boxShadow: `0 0 8px ${event.color}33`,
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-light">{event.title}</span>
                  <span className="text-xs text-dim/60">
                    {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                {event.subtitle && (
                  <p className="mt-0.5 text-xs text-dim truncate">{event.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
