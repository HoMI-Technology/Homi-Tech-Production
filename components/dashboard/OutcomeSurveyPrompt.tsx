"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OutcomeSurveyKind } from "@/types/database";

const KIND_LABEL: Record<OutcomeSurveyKind, string> = {
  day30: "30 days",
  day90: "90 days",
  day365: "1 year",
};

/**
 * Shown on the dashboard when an outcome_surveys row is due (due_at < now,
 * completed_at null). Purely informational follow-up — never affects any
 * assessment's score or verdict.
 */
export function OutcomeSurveyPrompt({ surveyId, kind }: { surveyId: string; kind: OutcomeSurveyKind }) {
  const [satisfaction, setSatisfaction] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (satisfaction === null) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("outcome_surveys")
        .update({ satisfaction, notes: note.trim() || null, completed_at: new Date().toISOString() })
        .eq("id", surveyId);
      if (updateError) {
        setError("Could not save that. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="glass mt-8 p-6 sm:p-8">
        <p className="text-sm text-emerald">Thanks — recorded honestly. HōMI will check in again down the line.</p>
      </div>
    );
  }

  return (
    <div className="glass mt-8 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-light">Checking in — {KIND_LABEL[kind]} later</h2>
      <p className="mt-1 text-sm text-dim">
        A while back you decided to move forward. No judgment either way — how has it gone?
      </p>

      <div className="mt-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setSatisfaction(n)}
            aria-pressed={satisfaction === n}
            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
              satisfaction === n ? "border-cyan bg-cyan/10 text-cyan" : "border-slate-surface/60 text-dim"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-dim">1 = rough, 5 = glad we did it</p>

      <textarea
        className="input mt-4 w-full"
        rows={3}
        placeholder="Optional note — what happened, what you'd tell past-you"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="mt-2 text-sm text-crimson">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={satisfaction === null || saving}
        className="btn btn-primary mt-4 btn-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Submit"}
      </button>
    </div>
  );
}
