"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  CALENDAR_ADD_EVENT,
  CALENDAR_DAYS,
  CALENDAR_SLOTS,
  STUDIO_PREFILL_EVENT,
  calendarKey,
  calendarToText,
  platformMeta,
  seedCalendarFromEngine,
  slotLabel,
  type CalendarAddDetail,
  type CalendarBoard,
  type CalendarDay,
  type CalendarEntry,
  type CalendarSlot,
  type SocialPlatform,
  type StudioPrefillDetail,
  type PostTone,
} from "@/lib/admin/marketing-agency";

type EnginePost = { day: string; title: string; campaign: string };

type DbEntry = {
  day_key: string;
  slot: string;
  title: string;
  body: string;
  platform: string | null;
  campaign: string | null;
  meta: Record<string, unknown> | null;
};

function isCalendarDay(value: string): value is CalendarDay {
  return (CALENDAR_DAYS as readonly string[]).includes(value);
}

function isCalendarSlot(value: string): value is CalendarSlot {
  return (CALENDAR_SLOTS as readonly string[]).includes(value);
}

function dbRowsToBoard(rows: DbEntry[]): CalendarBoard {
  const board: CalendarBoard = {};
  for (const row of rows) {
    if (!isCalendarDay(row.day_key) || !isCalendarSlot(row.slot)) continue;
    if (!row.body?.trim()) continue;
    const meta = row.meta ?? {};
    const tone =
      typeof meta.tone === "string" && meta.tone
        ? (meta.tone as PostTone)
        : "authority";
    const platform = (row.platform || "linkedin") as SocialPlatform;
    board[calendarKey(row.day_key, row.slot)] = {
      day: row.day_key,
      slot: row.slot,
      platform,
      tone,
      campaign: row.campaign || row.title || "",
      copy: row.body,
    };
  }
  return board;
}

async function persistEntry(entry: CalendarEntry): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/marketing-calendar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        day_key: entry.day,
        slot: entry.slot,
        title: entry.campaign.slice(0, 200),
        body: entry.copy,
        platform: entry.platform,
        campaign: entry.campaign,
        meta: { tone: entry.tone },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function deleteEntry(day: CalendarDay, slot: CalendarSlot): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/marketing-calendar", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day_key: day, slot }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Seven-day publishing board, two slots a day.
 * Durable in Supabase (marketing_calendar_entries). Falls back to engine seed
 * when the table is empty or the API is unavailable.
 */
export function ContentCalendar({ enginePosts }: { enginePosts: EnginePost[] }) {
  const [board, setBoard] = useState<CalendarBoard>({});
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [persistHint, setPersistHint] = useState<"supabase" | "local" | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/marketing-calendar");
        if (res.ok) {
          const data = (await res.json()) as { entries?: DbEntry[] };
          const fromDb = dbRowsToBoard(data.entries ?? []);
          if (!cancelled) {
            if (Object.keys(fromDb).length > 0) {
              setBoard(fromDb);
              setPersistHint("supabase");
            } else if (!seededRef.current) {
              const seed = seedCalendarFromEngine(enginePosts);
              setBoard(seed);
              setPersistHint("supabase");
              seededRef.current = true;
              // Best-effort seed write so the board survives refresh.
              for (const entry of Object.values(seed)) {
                if (entry) void persistEntry(entry);
              }
            } else {
              setPersistHint("supabase");
            }
          }
        } else if (!cancelled) {
          setBoard(seedCalendarFromEngine(enginePosts));
          setPersistHint("local");
        }
      } catch {
        if (!cancelled) {
          setBoard(seedCalendarFromEngine(enginePosts));
          setPersistHint("local");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enginePosts]);

  // Studio → calendar handoff.
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
        const entry: CalendarEntry = {
          day,
          slot,
          platform: detail.platform,
          tone: detail.tone,
          campaign: detail.campaign,
          copy: detail.copy,
        };
        void persistEntry(entry);
        return {
          ...prev,
          [calendarKey(day, slot)]: entry,
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
    void deleteEntry(day, slot);
    setBoard((prev) => {
      const next = { ...prev };
      delete next[calendarKey(day, slot)];
      return next;
    });
  }

  function clearWeek() {
    for (const day of CALENDAR_DAYS) {
      for (const slot of CALENDAR_SLOTS) {
        if (board[calendarKey(day, slot)]) void deleteEntry(day, slot);
      }
    }
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
        subtitle={
          persistHint === "supabase"
            ? "Seven days, two slots each. Saved to Supabase — survives devices."
            : persistHint === "local"
              ? "Seven days, two slots each. API unavailable — session-only until migration is live."
              : "Seven days, two slots each. Loading durable board…"
        }
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
              disabled={filled === 0 || !hydrated}
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
                        disabled={!hydrated}
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
