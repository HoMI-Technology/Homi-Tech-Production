import { localDateISO } from "@/lib/dates";
import { isPathCalendarEvent } from "@/lib/readiness";
import type { CalendarEvent, CalendarEventKind } from "@/types/database";

const KIND_LABEL: Record<CalendarEventKind, string> = {
  milestone: "Milestone",
  deadline: "Deadline",
  review: "Review",
  payment: "Payment",
};

const KIND_TEXT_CLASS: Record<CalendarEventKind, string> = {
  milestone: "text-cyan",
  deadline: "text-crimson",
  review: "text-yellow",
  payment: "text-emerald",
};

export function UpcomingList({
  events,
  onSelect,
}: {
  events: CalendarEvent[];
  onSelect: (isoDate: string) => void;
}) {
  const today = localDateISO();
  const upcoming = events
    .filter((ev) => !ev.completed && ev.event_date >= today)
    .sort((a, b) => (a.event_date < b.event_date ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="glass p-6">
      <h2 className="font-semibold text-light">Upcoming</h2>
      {upcoming.length === 0 ? (
        <p className="mt-4 text-sm text-dim">Nothing on the horizon yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {upcoming.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onSelect(ev.event_date)}
              className="glass-hover flex w-full flex-col rounded-lg border border-slate-high/40 p-3 text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-light">{ev.title}</span>
                {isPathCalendarEvent(ev.notes) && (
                  <span className="shrink-0 rounded-full bg-cyan/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan">
                    Path
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-dim">
                <span className={KIND_TEXT_CLASS[ev.kind]}>{KIND_LABEL[ev.kind]}</span>
                <span aria-hidden="true">&middot;</span>
                <span>
                  {new Date(ev.event_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
