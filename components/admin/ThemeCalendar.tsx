"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { COLORS } from "@/lib/brand";
import {
  THEME_CALENDAR_STORAGE_KEY,
  THEME_NOTES_STORAGE_KEY,
  THEME_WEEKS,
  isPostingDay,
  monthLabel,
  monthWeekRows,
  parseStoredThemeNotes,
  themeDayKey,
  themeForDayOfMonth,
  themeMonthExport,
  type PostPerformanceRow,
  type ThemeColorKey,
} from "@/lib/admin/marketing-agency";

const THEME_COLORS: Record<ThemeColorKey, string> = {
  cyan: COLORS.cyan,
  amber: COLORS.amber,
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Month offsets outside this window are almost certainly a stuck arrow key. */
const MAX_OFFSET = 24;

function readOffset(): number {
  try {
    const raw = window.localStorage.getItem(THEME_CALENDAR_STORAGE_KEY);
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, parsed));
  } catch {
    return 0;
  }
}

/**
 * Thirty-day publishing plan on a repeating four-week theme rotation.
 *
 * Supersedes the seven-day board: a week of slots is a to-do list, whereas a
 * month with themes is an actual content strategy — Founder Story, ICP Pain,
 * Social Proof, Product. Week 1 is days 1-7, week 2 is 8-14, and so on, so the
 * theme of a day never depends on which weekday the month happened to start on.
 *
 * Themes and notes live in localStorage; logged posts come from
 * post_performance_log so the plan and the record sit on one grid.
 */
export function ThemeCalendar() {
  const [offset, setOffset] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [logged, setLogged] = useState<PostPerformanceRow[]>([]);
  const [copied, setCopied] = useState(false);

  // localStorage does not exist during the server pass, so both reads happen on
  // mount rather than in a state initializer.
  useEffect(() => {
    setOffset(readOffset());
    try {
      setNotes(parseStoredThemeNotes(window.localStorage.getItem(THEME_NOTES_STORAGE_KEY)));
    } catch {
      setNotes({});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(THEME_CALENDAR_STORAGE_KEY, String(offset));
      window.localStorage.setItem(THEME_NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // Private mode / quota — the plan still works for this session.
    }
  }, [offset, notes, hydrated]);

  // Best-effort: the grid is useful without the ledger, so a failure is silent.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/post-performance")
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { rows?: PostPerformanceRow[] };
        if (!cancelled) setLogged(data.rows ?? []);
      })
      .catch(() => {
        // Ledger unavailable — cells simply show no logged marker.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { year, month } = useMemo(() => {
    const base = new Date();
    const shifted = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
  }, [offset]);

  const rows = useMemo(() => monthWeekRows(year, month), [year, month]);

  const loggedByDay = useMemo(() => {
    const map = new Map<string, PostPerformanceRow[]>();
    for (const row of logged) {
      const existing = map.get(row.posted_at);
      if (existing) existing.push(row);
      else map.set(row.posted_at, [row]);
    }
    return map;
  }, [logged]);

  const setNote = useCallback((key: string, value: string) => {
    setNotes((prev) => ({ ...prev, [key]: value.slice(0, 2000) }));
  }, []);

  async function exportMonth() {
    const text = themeMonthExport(year, month);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const selectedTheme = selected !== null ? themeForDayOfMonth(selected) : null;
  const selectedKey = selected !== null ? themeDayKey(year, month, selected) : "";
  const notedDays = rows.flat().filter((day) => (notes[themeDayKey(year, month, day)] ?? "").trim()).length;

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Themed month plan"
        subtitle="Four theme weeks on rotation. Mon/Wed/Fri are the posting days."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOffset((o) => Math.max(-MAX_OFFSET, o - 1))}
              aria-label="Previous month"
            >
              ←
            </button>
            <span className="min-w-32 text-center text-sm font-medium text-light">
              {monthLabel(year, month)}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setOffset((o) => Math.min(MAX_OFFSET, o + 1))}
              aria-label="Next month"
            >
              →
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportMonth}>
              {copied ? "Copied" : "Export month plan"}
            </button>
          </div>
        }
      />

      {/* Theme legend */}
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_WEEKS.map((theme) => (
          <div
            key={theme.week}
            className="rounded-lg border border-white/5 p-2.5"
            style={{ borderLeft: `2px solid ${THEME_COLORS[theme.colorKey]}` }}
          >
            <p className="text-3xs uppercase tracking-wide text-dim">Week {theme.week}</p>
            <p
              className="mt-0.5 text-xs font-semibold"
              style={{ color: THEME_COLORS[theme.colorKey] }}
            >
              {theme.label}
            </p>
          </div>
        ))}
      </div>

      {/* Month grid — one row per theme week */}
      <div className="mt-5 space-y-2">
        {rows.map((week, index) => {
          const theme = themeForDayOfMonth(week[0] ?? 1);
          const color = THEME_COLORS[theme.colorKey];
          return (
            <div key={index}>
              <p className="mb-1 text-3xs uppercase tracking-wide" style={{ color }}>
                {theme.label}
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {week.map((day) => {
                  const key = themeDayKey(year, month, day);
                  const posting = isPostingDay(year, month, day);
                  const dayLogged = loggedByDay.get(key) ?? [];
                  const hasNote = Boolean((notes[key] ?? "").trim());
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={selected === day}
                      className="glass-hover rounded-lg border border-white/5 p-2 text-left"
                      style={
                        selected === day
                          ? { borderColor: color, background: `${color}14` }
                          : posting
                            ? { background: `${color}0a` }
                            : undefined
                      }
                      onClick={() => setSelected(selected === day ? null : day)}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="score-numeral text-sm text-light">{day}</span>
                        <span className="text-3xs text-dim">
                          {WEEKDAY_LABELS[new Date(Date.UTC(year, month, day)).getUTCDay()]}
                        </span>
                      </div>
                      {posting && (
                        <span
                          className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-3xs font-semibold"
                          style={{ background: `${color}1f`, color }}
                        >
                          Post
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayLogged.length > 0 && (
                          <span
                            className="text-3xs"
                            style={{ color: COLORS.emerald }}
                            title={`${dayLogged.length} logged`}
                          >
                            ● logged
                          </span>
                        )}
                        {hasNote && <span className="text-3xs text-dim">✎ note</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day panel */}
      {selected !== null && selectedTheme && (
        <div
          className="mt-5 rounded-lg border p-4"
          style={{
            borderColor: `${THEME_COLORS[selectedTheme.colorKey]}40`,
            background: `${THEME_COLORS[selectedTheme.colorKey]}0d`,
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p
                className="text-3xs font-semibold uppercase tracking-wide"
                style={{ color: THEME_COLORS[selectedTheme.colorKey] }}
              >
                {selectedKey} · {selectedTheme.label}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-light">
                {selectedTheme.description}
              </p>
            </div>
            <button
              type="button"
              className="text-3xs text-dim hover:underline"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* A full navigation on purpose: the studio reads its prefill from
                the query string on mount. */}
            <a
              className="btn btn-primary btn-sm"
              href={`/admin/marketing?studio_topic=${encodeURIComponent(selectedTheme.label)}&studio_tone=${selectedTheme.tone}`}
            >
              Generate post for this theme
            </a>
            {(loggedByDay.get(selectedKey) ?? []).map((row) => (
              <span
                key={row.id}
                className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-3xs text-dim"
              >
                {row.utm_campaign}
              </span>
            ))}
          </div>

          <label className="mt-4 block text-3xs uppercase tracking-wide text-dim">
            Note for this day
            <textarea
              className="mt-1 min-h-20 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 text-xs text-light"
              value={notes[selectedKey] ?? ""}
              placeholder="Angle, asset, who it is aimed at…"
              onChange={(e) => setNote(selectedKey, e.target.value)}
            />
          </label>
        </div>
      )}

      <p className="mt-4 text-xs text-dim">
        {notedDays === 0
          ? "No notes yet. Click a day to read its theme and plan the angle — notes stay in this browser."
          : `${notedDays} day${notedDays === 1 ? "" : "s"} noted. Export lists Mon/Wed/Fri with the theme and campaign tag.`}
      </p>
    </div>
  );
}
