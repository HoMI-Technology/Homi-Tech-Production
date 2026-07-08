"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sliderFillPercent } from "@/lib/assessment/format";
import { EmptyState } from "@/components/ui/EmptyState";
import type { JournalEntry } from "@/types/database";

const DECISION_TYPES = [
  { value: "home_buying", label: "Home buying" },
  { value: "career", label: "Career" },
  { value: "purchase", label: "Major purchase" },
  { value: "investment", label: "Investment" },
  { value: "life", label: "Life decision" },
] as const;

type DecisionType = (typeof DECISION_TYPES)[number]["value"];

interface DraftEntry {
  title: string;
  decision_type: DecisionType;
  context: string;
  expected_impact: string;
  mood: number;
  decision_date: string;
}

function emptyDraft(): DraftEntry {
  return {
    title: "",
    decision_type: "home_buying",
    context: "",
    expected_impact: "",
    mood: 5,
    decision_date: new Date().toISOString().slice(0, 10),
  };
}

export default function JournalPage() {
  const supabase = useMemo(() => createClient(), []);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  async function handleCreate() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sign in to log a decision.");
      return;
    }
    if (!draft.title.trim()) {
      setError("Give this decision a title.");
      return;
    }

    const optimistic: JournalEntry = {
      id: `optimistic-${Date.now()}`,
      user_id: user.id,
      decision_type: draft.decision_type,
      title: draft.title,
      context: draft.context || null,
      expected_impact: draft.expected_impact || null,
      actual_impact: null,
      mood: draft.mood,
      decision_date: draft.decision_date,
      outcome_date: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEntries((prev) => [optimistic, ...prev]);
    setDraft(emptyDraft());
    setShowForm(false);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("decision_journal")
      .insert({
        user_id: user.id,
        decision_type: optimistic.decision_type,
        title: optimistic.title,
        context: optimistic.context,
        expected_impact: optimistic.expected_impact,
        mood: optimistic.mood,
        decision_date: optimistic.decision_date,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as JournalEntry) : e)));
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setEditDraft({
      title: entry.title,
      decision_type: entry.decision_type as DecisionType,
      context: entry.context ?? "",
      expected_impact: entry.expected_impact ?? "",
      mood: entry.mood ?? 5,
      decision_date: entry.decision_date ?? new Date().toISOString().slice(0, 10),
    });
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft) return;
    const prevEntries = entries;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              title: editDraft.title,
              decision_type: editDraft.decision_type,
              context: editDraft.context || null,
              expected_impact: editDraft.expected_impact || null,
              mood: editDraft.mood,
              decision_date: editDraft.decision_date,
            }
          : e,
      ),
    );
    setEditingId(null);
    setEditDraft(null);

    const { error: updateError } = await supabase
      .from("decision_journal")
      .update({
        title: editDraft.title,
        decision_type: editDraft.decision_type,
        context: editDraft.context || null,
        expected_impact: editDraft.expected_impact || null,
        mood: editDraft.mood,
        decision_date: editDraft.decision_date,
      })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setEntries(prevEntries);
    }
  }

  async function handleDelete(id: string) {
    const prevEntries = entries;
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);

    const { error: deleteError } = await supabase.from("decision_journal").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      setEntries(prevEntries);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-light">Decision Journal</h1>
          <p className="mt-2 max-w-xl text-dim">
            Log the decision before you make it. Your future self will thank you.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Log a decision"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3 text-sm text-light">
          {error}
        </div>
      )}

      {showForm && (
        <div className="glass mt-6 space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-light">Title</label>
              <input
                className="input mt-2"
                placeholder="e.g. Making an offer on the Elm St house"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-light">Decision type</label>
              <select
                className="input mt-2"
                value={draft.decision_type}
                onChange={(e) => setDraft({ ...draft, decision_type: e.target.value as DecisionType })}
              >
                {DECISION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-light">Context</label>
            <textarea
              className="input mt-2"
              rows={3}
              placeholder="What's the situation? What are you weighing?"
              value={draft.context}
              onChange={(e) => setDraft({ ...draft, context: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-light">Expected impact</label>
            <textarea
              className="input mt-2"
              rows={2}
              placeholder="What do you expect to happen?"
              value={draft.expected_impact}
              onChange={(e) => setDraft({ ...draft, expected_impact: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-light">Mood</label>
                <span className="score-numeral text-sm text-cyan">{draft.mood}/10</span>
              </div>
              <input
                type="range"
                className="homi-slider mt-2"
                min={1}
                max={10}
                value={draft.mood}
                onChange={(e) => setDraft({ ...draft, mood: Number(e.target.value) })}
                style={{ ["--fill" as string]: `${sliderFillPercent(draft.mood, 1, 10)}%` }}
              />
            </div>
            <div>
              <label className="text-sm text-light">Decision date</label>
              <input
                type="date"
                className="input mt-2"
                value={draft.decision_date}
                onChange={(e) => setDraft({ ...draft, decision_date: e.target.value })}
              />
            </div>
          </div>

          <button className="btn btn-emerald" onClick={handleCreate}>
            Save entry
          </button>
        </div>
      )}

      <div className="mt-8 space-y-4">
        {loading ? (
          <p className="text-sm text-dim">Loading your journal...</p>
        ) : entries.length === 0 ? (
          <div className="glass p-10">
            <EmptyState preset="journal" />
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="glass p-6">
              {editingId === entry.id && editDraft ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      className="input"
                      value={editDraft.title}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                    />
                    <select
                      className="input"
                      value={editDraft.decision_type}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, decision_type: e.target.value as DecisionType })
                      }
                    >
                      {DECISION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="input"
                    rows={3}
                    value={editDraft.context}
                    onChange={(e) => setEditDraft({ ...editDraft, context: e.target.value })}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    value={editDraft.expected_impact}
                    onChange={(e) => setEditDraft({ ...editDraft, expected_impact: e.target.value })}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm text-light">Mood</label>
                        <span className="score-numeral text-sm text-cyan">{editDraft.mood}/10</span>
                      </div>
                      <input
                        type="range"
                        className="homi-slider mt-2"
                        min={1}
                        max={10}
                        value={editDraft.mood}
                        onChange={(e) => setEditDraft({ ...editDraft, mood: Number(e.target.value) })}
                        style={{ ["--fill" as string]: `${sliderFillPercent(editDraft.mood, 1, 10)}%` }}
                      />
                    </div>
                    <input
                      type="date"
                      className="input self-end"
                      value={editDraft.decision_date}
                      onChange={(e) => setEditDraft({ ...editDraft, decision_date: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button className="btn btn-emerald" onClick={() => handleSaveEdit(entry.id)}>
                      Save
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-slate-surface px-2.5 py-0.5 text-xs text-dim">
                        {DECISION_TYPES.find((t) => t.value === entry.decision_type)?.label ?? entry.decision_type}
                      </span>
                      <h3 className="mt-2 font-semibold text-light">{entry.title}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => startEdit(entry)}>
                        Edit
                      </button>
                      {deletingId === entry.id ? (
                        <>
                          <button
                            className="btn !bg-crimson !px-3 !py-1.5 text-xs text-white"
                            onClick={() => handleDelete(entry.id)}
                          >
                            Confirm delete
                          </button>
                          <button className="btn btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setDeletingId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-ghost !px-3 !py-1.5 text-xs"
                          onClick={() => setDeletingId(entry.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {entry.context && <p className="mt-3 text-sm text-dim">{entry.context}</p>}
                  {entry.expected_impact && (
                    <p className="mt-2 text-sm text-dim">
                      <span className="text-light">Expected impact: </span>
                      {entry.expected_impact}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-dim">
                    {entry.decision_date && <span>{new Date(entry.decision_date).toLocaleDateString()}</span>}
                    {entry.mood !== null && <span>Mood: {entry.mood}/10</span>}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
