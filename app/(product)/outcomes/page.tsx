"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { localDateISO, formatLocalDateISO } from "@/lib/dates";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import type { JournalEntry } from "@/types/database";

interface OutcomeDraft {
  actual_impact: string;
  outcome_date: string;
}

function emptyDraft(): OutcomeDraft {
  return { actual_impact: "", outcome_date: localDateISO() };
}

function moodColor(mood: number | null): string {
  if (mood === null) return "#94a3b8";
  if (mood >= 8) return "#34d399";
  if (mood >= 5) return "#facc15";
  return "#f24822";
}

export default function OutcomesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<OutcomeDraft>(emptyDraft());

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(Boolean(user));
      setAuthChecked(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("decision_journal")
        .select("*")
        .eq("user_id", user.id)
        .order("decision_date", { ascending: false });

      if (!active) return;
      if (fetchError) setError(fetchError.message);
      setEntries((data as JournalEntry[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleRecordOutcome(id: string) {
    if (!draft.actual_impact.trim()) {
      setError("Describe what actually happened.");
      return;
    }
    const prevEntries = entries;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, actual_impact: draft.actual_impact, outcome_date: draft.outcome_date } : e,
      ),
    );
    setRecordingId(null);
    setError(null);
    const submitted = draft;
    setDraft(emptyDraft());

    const { error: updateError } = await supabase
      .from("decision_journal")
      .update({ actual_impact: submitted.actual_impact, outcome_date: submitted.outcome_date })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setEntries(prevEntries);
    }
  }

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24">
        <ProductLoadingSkeleton label="Loading outcomes" rows={2} />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="glass p-10">
          <h1 className="font-display text-2xl font-semibold text-light">Sign in to see your outcomes</h1>
          <p className="mt-3 text-sm text-dim">
            Outcomes tracks how your logged decisions actually played out — you&rsquo;ll need an account
            to see it.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/auth/sign-in?next=/outcomes" className="btn btn-primary">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="btn btn-ghost">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const openDecisions = entries.filter((e) => !e.outcome_date);
  const closedDecisions = entries.filter((e) => e.outcome_date);
  const avgMood =
    entries.filter((e) => e.mood !== null).length > 0
      ? (
          entries.reduce((sum, e) => sum + (e.mood ?? 0), 0) / entries.filter((e) => e.mood !== null).length
        ).toFixed(1)
      : "—";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-light">Outcomes</h1>
          <p className="mt-2 max-w-xl text-dim">
            How your logged decisions actually played out — the honest follow-through on the Decision
            Journal.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/calibration" className="btn btn-ghost">
            Network calibration
          </Link>
          <Link href="/journal" className="btn btn-ghost">
            Go to Journal
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass p-5 text-center">
          <p className="score-numeral text-2xl font-bold text-light">{entries.length}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-dim">Decisions logged</p>
        </div>
        <div className="glass p-5 text-center">
          <p className="score-numeral text-2xl font-bold text-light">{closedDecisions.length}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-dim">Outcomes recorded</p>
        </div>
        <div className="glass p-5 text-center">
          <p className="score-numeral text-2xl font-bold text-cyan">{avgMood}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-dim">Average mood</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3 text-sm text-light">
          {error}
        </div>
      )}

      {loading ? (
        <ProductLoadingSkeleton label="Loading outcomes" />
      ) : entries.length === 0 ? (
        <div className="glass mt-8 p-10 text-center">
          <p className="text-light">No decisions logged yet.</p>
          <p className="mt-1 text-sm text-dim">Start in the Decision Journal — your future self will thank you.</p>
          <Link href="/journal" className="btn btn-primary mt-6 inline-flex">
            Go to Journal
          </Link>
        </div>
      ) : (
        <>
          {/* Open decisions */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold text-light">Open decisions</h2>
            {openDecisions.length === 0 ? (
              <p className="mt-3 text-sm text-dim">Nothing open — every logged decision has an outcome recorded.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {openDecisions.map((entry) => (
                  <div key={entry.id} className="glass p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-light">{entry.title}</h3>
                        {entry.decision_date && (
                          <p className="mt-1 text-xs text-dim">
                            Decided {formatLocalDateISO(entry.decision_date)}
                          </p>
                        )}
                      </div>
                      {recordingId !== entry.id && (
                        <button
                          className="btn btn-emerald btn-sm"
                          onClick={() => {
                            setRecordingId(entry.id);
                            setDraft(emptyDraft());
                          }}
                        >
                          Record outcome
                        </button>
                      )}
                    </div>
                    {entry.expected_impact && (
                      <p className="mt-3 text-sm text-dim">
                        <span className="text-light">Expected: </span>
                        {entry.expected_impact}
                      </p>
                    )}

                    {recordingId === entry.id && (
                      <div className="mt-4 space-y-3 border-t border-slate-surface/60 pt-4">
                        <div>
                          <label className="text-sm text-light">What actually happened?</label>
                          <textarea
                            className="input mt-2"
                            rows={3}
                            placeholder="Be honest — this is for you, not anyone else."
                            value={draft.actual_impact}
                            onChange={(e) => setDraft({ ...draft, actual_impact: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm text-light">Outcome date</label>
                          <input
                            type="date"
                            className="input mt-2"
                            value={draft.outcome_date}
                            onChange={(e) => setDraft({ ...draft, outcome_date: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button className="btn btn-emerald" onClick={() => handleRecordOutcome(entry.id)}>
                            Save outcome
                          </button>
                          <button className="btn btn-ghost" onClick={() => setRecordingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Closed timeline */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-semibold text-light">Timeline</h2>
            {closedDecisions.length === 0 ? (
              <p className="mt-3 text-sm text-dim">No outcomes recorded yet.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4 border-l border-slate-surface/60 pl-6">
                {closedDecisions.map((entry) => (
                  <div key={entry.id} className="relative glass p-5">
                    <span
                      className="absolute -left-[31px] top-6 h-3 w-3 rounded-full"
                      style={{ backgroundColor: moodColor(entry.mood) }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h3 className="font-semibold text-light">{entry.title}</h3>
                      {entry.mood !== null && (
                        <span className="text-xs" style={{ color: moodColor(entry.mood) }}>
                          Mood: {entry.mood}/10
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-col gap-2 text-sm text-dim">
                      {entry.expected_impact && (
                        <p>
                          <span className="text-light">Expected: </span>
                          {entry.expected_impact}
                        </p>
                      )}
                      {entry.actual_impact && (
                        <p>
                          <span className="text-light">Actual: </span>
                          {entry.actual_impact}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-dim">
                      {entry.decision_date && <span>Decided {formatLocalDateISO(entry.decision_date)}</span>}
                      {entry.outcome_date && <span>Outcome {formatLocalDateISO(entry.outcome_date)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
