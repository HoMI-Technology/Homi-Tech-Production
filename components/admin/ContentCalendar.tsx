"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  CALENDAR_ADD_EVENT,
  CALENDAR_DAYS,
  CALENDAR_SLOTS,
  CALENDAR_STORAGE_KEY,
  STUDIO_PREFILL_EVENT,
  calendarKey,
  calendarToText,
  parseStoredCalendar,
  platformMeta,
  seedCalendarFromEngine,
  slotLabel,
  type CalendarAddDetail,
  type CalendarBoard,
  type CalendarDay,
  type CalendarSlot,
  type StudioPrefillDetail,
} from "@/lib/admin/marketing-agency";

type EnginePost = { day: string; title: string; campaign: string };

/**
 * Seven-day publishing board, two slots a day.
 *
 * State lives in localStorage rather than the database: this is a founder's
 * working week, it changes several times a day, and a dropped row costs nothing
 * to retype. Seeded from the engine slate on first visit so the board is never
 * empty. An empty slot hands off to the content studio through a window event
 * (see STUDIO_PREFILL_EVENT); the studio hands the finished post back the same
 * way.
 */
export function ContentCalendar({ enginePosts }: { enginePosts: EnginePost[] }) {
  // Seeded on mount, not during render: localStorage does not exist during the
  // server pass, and reading it in an initializer would desync hydration.
  const [board, setBoard] = useState<CalendarBoard>({});
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let stored: CalendarBoard | null = null;
    try {
      stored = parseStoredCalendar(window.localStorage.getItem(CALENDAR_STORAGE_KEY));
    } catch {
      stored = null;
    }
    setBoard(stored ?? seedCalendarFromEngine(enginePosts));
    setHydrated(true);
  }, [enginePosts]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(board));
    } catch {
      // Private mode / quota — the board still works for this session.
    }
  }, [board, hydrated]);

  // The studio pushes finished posts here. When it carries no target slot
  // (the operator generated freehand), the post lands in the first empty one.
  useEffect(() => {
    function onAdd(event: Event) {
      const detail = (event as CustomEvent<CalendarAddDetail>).detail;
      if (!detail?.copy) return;

      setBoard((prev) => {
        let day = detail.day;
        let slot = detail.slot;
        if (!day || !slot) {
          const open = firstEmptySlot(prev);
          if (!open) return prev;
          day = open.day;
          slot = open.slot;
        }
        return {
          ...prev,
          [calendarKey(day, slot)]: {
            day,
            slot,
            platform: detail.platform,
            tone: detail.tone,
            campaign: detail.campaign,
            copy: detail.copy,
          },
        };
      });
    }
    window.addEventListener(CALENDAR_ADD_EVENT, onAdd);
    return () => window.removeEventListener(CALENDAR_ADD_EVENT, onAdd);
  }, []);

  const requestPost = useCallback((day: CalendarDay, slot: CalendarSlot) => {
    const detail: StudioPrefillDetail = { day, slot };
    window.dispatchEvent(new CustomEvent<StudioPrefillDetail>(STUDIO_PREFILL_EVENT, { detail }));
  }, []);

  function clearSlot(day: CalendarDay, slot: CalendarSlot) {
    setBoard((prev) => {
      const next = { ...prev };
      delete next[calendarKey(day, slot)];
      return next;
    });
  }

  function clearWeek() {
    setBoard({});
  }

  async function exportWeek() {
    const text = calendarToText(board);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const filled = Object.keys(board).length;

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Content calendar"
        subtitle="Seven days, two slots each. Saved in this browser — not the database."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={exportWeek}
              disabled={filled === 0}
            >
              {copied ? "Copied" : "Export as text"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearWeek}
              disabled={filled === 0}
            >
              Clear week
            </button>
          </div>
        }
      />

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {CALENDAR_DAYS.map((day) => (
          <div key={day} className="rounded-lg border border-white/5 p-2">
            <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">{day}</p>
            <div className="mt-2 space-y-2">
              {CALENDAR_SLOTS.map((slot) => {
                const entry = board[calendarKey(day, slot)];
                return (
                  <div key={slot}>
                    <p className="text-3xs uppercase tracking-wide text-dim">{slotLabel(slot)}</p>
                    {entry ? (
                      <div className="glass mt-1 p-2">
                        <p className="text-3xs font-semibold text-light">
                          {platformMeta(entry.platform).label}
                        </p>
                        <span className="mt-1 inline-block rounded-full border border-white/10 px-1.5 py-0.5 text-3xs uppercase tracking-wide text-dim">
                          {entry.tone}
                        </span>
                        <p className="mt-1 truncate font-mono text-3xs text-cyan">
                          {entry.campaign}
                        </p>
                        <p className="mt-1 line-clamp-3 text-3xs text-dim">{entry.copy}</p>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="score-numeral text-3xs text-dim">
                            {entry.copy.length.toLocaleString()} ch
                          </span>
                          <button
                            type="button"
                            className="text-3xs text-crimson hover:underline"
                            onClick={() => clearSlot(day, slot)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="glass-hover mt-1 w-full rounded-lg border border-dashed border-white/10 px-2 py-3 text-3xs text-dim"
                        onClick={() => requestPost(day, slot)}
                      >
                        + Add post
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-dim">
        {filled === 0
          ? "Week is empty. “+ Add post” opens the studio with the slot remembered."
          : `${filled} slot${filled === 1 ? "" : "s"} filled. Export pastes one post per line.`}
      </p>
    </div>
  );
}

function firstEmptySlot(board: CalendarBoard): { day: CalendarDay; slot: CalendarSlot } | null {
  for (const day of CALENDAR_DAYS) {
    for (const slot of CALENDAR_SLOTS) {
      if (!board[calendarKey(day, slot)]) return { day, slot };
    }
  }
  return null;
}
