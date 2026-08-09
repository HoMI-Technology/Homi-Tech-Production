import { localDateISO } from "@/lib/dates";
import type { CalendarEvent, CalendarEventKind } from "@/types/database";

const KIND_DOT_CLASS: Record<CalendarEventKind, string> = {
  milestone: "bg-cyan",
  deadline: "bg-crimson",
  review: "bg-yellow",
  payment: "bg-emerald",
};

function toIsoDate(d: Date): string {
  return localDateISO(d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildWeeks(viewMonth: Date): Date[] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay()); // back up to preceding Sunday

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function MonthGrid({
  viewMonth,
  events,
  selectedDate,
  onSelectDate,
}: {
  viewMonth: Date;
  events: CalendarEvent[];
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
}) {
  const days = buildWeeks(viewMonth);
  const today = new Date();
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.event_date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.event_date, list);
  }

  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-dim">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const inMonth = day.getMonth() === viewMonth.getMonth();
          const isToday = isSameDay(day, today);
          const isSelected = selectedDate === iso;
          const dayEvents = eventsByDate.get(iso) ?? [];

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={`flex h-20 flex-col items-start rounded-lg border p-2 text-left transition-colors ${
                isSelected
                  ? "border-cyan/50 bg-cyan/10"
                  : "border-slate-high/40 hover:border-slate-high"
              } ${inMonth ? "" : "opacity-40"}`}
            >
              <span
                className={`text-sm ${
                  isToday
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-cyan text-navy"
                    : "text-light"
                } ${inMonth ? "" : "text-dim"}`}
              >
                {day.getDate()}
              </span>
              {dayEvents.length > 0 && (
                <div className="mt-auto flex gap-1">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={`inline-block h-1.5 w-1.5 rounded-full ${KIND_DOT_CLASS[ev.kind]}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
