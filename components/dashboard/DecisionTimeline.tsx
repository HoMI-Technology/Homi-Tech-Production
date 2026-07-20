import Link from "next/link";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { AssessmentRow, DailyCheckin, JournalEntry } from "@/types/database";

type TimelineEvent = {
  id: string;
  type: "assessment" | "journal" | "checkin";
  date: string;
  title: string;
  subtitle?: string;
  color: string;
};

export function DecisionTimeline({
  assessments,
  checkins,
  journalEntries,
  maxItems = 12,
}: {
  assessments: AssessmentRow[];
  checkins: DailyCheckin[];
  journalEntries: Pick<JournalEntry, "id" | "title" | "context" | "created_at" | "decision_date">[];
  maxItems?: number;
}) {
  const events: TimelineEvent[] = [
    ...assessments.map((a): TimelineEvent => {
      const verdict = a.verdict as VerdictKey | null;
      const meta = verdict ? VERDICT_META[verdict] : null;
      return {
        id: `a-${a.id}`,
        type: "assessment",
        date: a.completed_at ?? a.created_at,
        title: meta ? `Assessment · ${meta.label}` : "Assessment completed",
        subtitle:
          a.overall_score != null ? `Score ${Math.round(a.overall_score)}` : a.decision_type,
        color: meta?.color ?? "#22d3ee",
      };
    }),
    ...journalEntries.map(
      (j): TimelineEvent => ({
        id: `j-${j.id}`,
        type: "journal",
        date: j.decision_date ?? j.created_at,
        title: j.title || "Journal entry",
        subtitle: j.context ?? undefined,
        color: "#34d399",
      }),
    ),
    ...checkins.map(
      (c): TimelineEvent => ({
        id: `c-${c.id}`,
        type: "checkin",
        date: c.created_at,
        title: "Daily check-in",
        subtitle: `Mood ${c.mood}/10`,
        color: "#facc15",
      }),
    ),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems);

  if (events.length === 0) return null;

  return (
    <div className="glass p-8">
      <SectionHeader
        eyebrow="History"
        title="Decision timeline"
        subtitle="Assessments, journal entries, and check-ins."
        action={
          <Link href="/journal" className="btn btn-ghost !px-4 !py-2 text-sm">
            Open journal
          </Link>
        }
      />
      <ol className="relative mt-6 space-y-4 border-l border-slate-surface/80 pl-5">
        {events.map((event) => (
          <li key={event.id} className="relative">
            <span
              aria-hidden
              className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-navy"
              style={{
                background: event.color,
                boxShadow: `0 0 8px ${event.color}66`,
              }}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-light">{event.title}</p>
              <time className="text-xs text-dim" dateTime={event.date}>
                {new Date(event.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </div>
            {event.subtitle && <p className="mt-0.5 text-xs text-dim">{event.subtitle}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
