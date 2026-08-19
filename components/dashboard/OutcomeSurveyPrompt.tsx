"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  OUTCOME_TAXONOMY,
  OUTCOME_TAXONOMY_LABELS,
  outcomeSurveyAnswerPayload,
  type OutcomeTaxonomy,
} from "@/lib/outcomes/taxonomy";
import type { OutcomeSurveyKind } from "@/types/database";

const KIND_LABEL: Record<OutcomeSurveyKind, string> = {
  day30: "30 days",
  day90: "90 days",
  day365: "1 year",
};

const PRIMARY_OUTCOMES = OUTCOME_TAXONOMY.filter((value) => value !== "no_answer");

/**
 * Shown on the dashboard when an outcome_surveys row is due (due_at < now,
 * completed_at null). Purely informational follow-up — never affects any
 * assessment's score or verdict.
 */
export function OutcomeSurveyPrompt({
  surveyId,
  kind,
}: {
  surveyId: string;
  kind: OutcomeSurveyKind;
}) {
  const [outcome, setOutcome] = useState<OutcomeTaxonomy | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(answer: OutcomeTaxonomy) {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("outcome_surveys")
        .update(outcomeSurveyAnswerPayload(answer, note, new Date().toISOString()))
        .eq("id", surveyId);
      if (updateError) {
        setError("Could not save that. Try again.");
        return;
      }
      setOutcome(answer);
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
        <p className="text-sm text-emerald">
          Thanks — recorded honestly. HōMI will check in again down the line.
        </p>
      </div>
    );
  }

  return (
    <div className="glass mt-8 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-light">Checking in — {KIND_LABEL[kind]} later</h2>
      <p className="mt-1 text-sm text-dim">
        A while back HōMI recorded your verdict. No judgment either way — what happened?
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRIMARY_OUTCOMES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setOutcome(value)}
            aria-pressed={outcome === value}
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
              outcome === value
                ? "border-cyan bg-cyan/10 text-cyan"
                : "border-slate-surface/60 text-dim"
            }`}
          >
            {OUTCOME_TAXONOMY_LABELS[value]}
          </button>
        ))}
      </div>

      <textarea
        className="input mt-4 w-full"
        rows={3}
        placeholder="Optional note — what happened, what you'd tell past-you"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="mt-2 text-sm text-crimson">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (outcome && outcome !== "no_answer") void save(outcome);
          }}
          disabled={outcome === null || outcome === "no_answer" || saving}
          className="btn btn-primary btn-sm disabled:opacity-50"
        >
          {saving && outcome !== "no_answer" ? "Saving…" : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => void save("no_answer")}
          disabled={saving}
          className="btn btn-ghost btn-sm disabled:opacity-50"
        >
          {saving && outcome === "no_answer" ? "Saving…" : OUTCOME_TAXONOMY_LABELS.no_answer}
        </button>
      </div>
    </div>
  );
}
