"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { EventForm } from "@/components/calendar/EventForm";
import { UpcomingList } from "@/components/calendar/UpcomingList";
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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDaysIso(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        setCheckedAuth(true);
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setCheckedAuth(true);

      const { data, error: fetchError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", user.id)
        .order("event_date", { ascending: true });

      if (!active) return;
      if (fetchError) setError(fetchError.message);
      setEvents((data as CalendarEvent[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  if (checkedAuth && !userId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-20">
        <div className="glass w-full p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-surface">
            <svg
              width="22"
              height="22"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="text-cyan"
            >
              <rect x="4" y="9" width="12" height="8" rx="1.5" />
              <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl text-light">Sign in required</h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Sign in to build your milestone calendar.
          </p>
          <div className="mt-8">
            <Link href="/auth/sign-in?next=/calendar" className="btn btn-primary">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleAddEvent(input: {
    title: string;
    kind: CalendarEventKind;
    event_date: string;
    notes: string | null;
  }) {
    if (!userId) return;
    setSubmitting(true);
    setError(null);

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticEvent: CalendarEvent = {
      id: optimisticId,
      user_id: userId,
      title: input.title,
      kind: input.kind,
      event_date: input.event_date,
      notes: input.notes,
      completed: false,
      created_at: new Date().toISOString(),
    };
    setEvents((prev) => [...prev, optimisticEvent]);

    const { data, error: insertError } = await supabase
      .from("calendar_events")
      .insert({
        user_id: userId,
        title: input.title,
        kind: input.kind,
        event_date: input.event_date,
        notes: input.notes,
        completed: false,
      })
      .select()
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      setEvents((prev) => prev.filter((ev) => ev.id !== optimisticId));
      return;
    }
    setEvents((prev) => prev.map((ev) => (ev.id === optimisticId ? (data as CalendarEvent) : ev)));
  }

  async function handleToggleComplete(ev: CalendarEvent) {
    const nextCompleted = !ev.completed;
    setEvents((prev) =>
      prev.map((e) => (e.id === ev.id ? { ...e, completed: nextCompleted } : e)),
    );

    const { error: updateError } = await supabase
      .from("calendar_events")
      .update({ completed: nextCompleted })
      .eq("id", ev.id);

    if (updateError) {
      setError(updateError.message);
      setEvents((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, completed: ev.completed } : e)),
      );
    }
  }

  async function handleDelete(ev: CalendarEvent) {
    const prevEvents = events;
    setEvents((prev) => prev.filter((e) => e.id !== ev.id));

    const { error: deleteError } = await supabase.from("calendar_events").delete().eq("id", ev.id);

    if (deleteError) {
      setError(deleteError.message);
      setEvents(prevEvents);
    }
  }

  async function handleSuggestDefaults() {
    if (!userId) return;
    setSeeding(true);
    setError(null);

    const defaults: Array<{
      title: string;
      kind: CalendarEventKind;
      event_date: string;
      notes: string | null;
      completed: boolean;
      user_id: string;
    }> = [
      {
        title: "Re-take your assessment",
        kind: "review",
        event_date: addDaysIso(30),
        notes: null,
        completed: false,
        user_id: userId,
      },
      {
        title: "Review emergency runway",
        kind: "review",
        event_date: addDaysIso(60),
        notes: null,
        completed: false,
        user_id: userId,
      },
      {
        title: "Credit check-in",
        kind: "review",
        event_date: addDaysIso(90),
        notes: null,
        completed: false,
        user_id: userId,
      },
      {
        title: "Timing review",
        kind: "review",
        event_date: addDaysIso(180),
        notes: null,
        completed: false,
        user_id: userId,
      },
    ];

    const { data, error: insertError } = await supabase
      .from("calendar_events")
      .insert(defaults)
      .select();

    setSeeding(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEvents((prev) => [...prev, ...((data as CalendarEvent[]) ?? [])]);
  }

  const selectedEvents = selectedDate
    ? events.filter((ev) => ev.event_date === selectedDate)
    : [];

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-light">Calendar</h1>
            <p className="mt-2 max-w-xl text-dim">
              Milestones, deadlines, and reviews worth tracking as your readiness changes.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost shrink-0"
            onClick={handleSuggestDefaults}
            disabled={seeding}
          >
            {seeding ? "Adding..." : "Suggest default milestones"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3 text-sm text-light">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass p-6">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="btn btn-ghost px-3"
                onClick={() =>
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
                aria-label="Previous month"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M12 4l-6 6 6 6" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl text-light">
                  {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1 text-xs"
                  onClick={() => setViewMonth(startOfMonth(new Date()))}
                >
                  Today
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost px-3"
                onClick={() =>
                  setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
                aria-label="Next month"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M8 4l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="mt-6">
              {loading ? (
                <p className="text-sm text-dim">Loading...</p>
              ) : (
                <MonthGrid
                  viewMonth={viewMonth}
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                />
              )}
            </div>

            {selectedDate && (
              <div className="mt-8 border-t border-slate-high/40 pt-6">
                <h3 className="font-semibold text-light">
                  {new Date(selectedDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>

                {selectedEvents.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {selectedEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-slate-high/40 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={ev.completed}
                            onChange={() => handleToggleComplete(ev)}
                            className="mt-1"
                          />
                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                ev.completed ? "text-dim line-through" : "text-light"
                              }`}
                            >
                              {ev.title}
                            </p>
                            <p className={`mt-1 text-xs ${KIND_TEXT_CLASS[ev.kind]}`}>
                              {KIND_LABEL[ev.kind]}
                            </p>
                            {ev.notes && <p className="mt-1 text-xs text-dim">{ev.notes}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(ev)}
                          className="text-xs text-dim transition-colors hover:text-crimson"
                          aria-label="Delete event"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <EventForm
                    defaultDate={selectedDate}
                    onSubmit={handleAddEvent}
                    submitting={submitting}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <UpcomingList events={events} onSelect={setSelectedDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
