"use client";

import { useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  DRIP_PRESETS,
  dripPreset,
  isClaimClean,
  stripNeverSay,
  templateDripSequence,
  type DripPresetKey,
  type DripStep,
} from "@/lib/admin/marketing-agency";

const MAX_STEPS = 8;

function blankSteps(preset: DripPresetKey): DripStep[] {
  return dripPreset(preset).steps.map((step, i) => ({
    step: i + 1,
    name: step.name,
    delay_days: step.delayDays,
    subject: "",
    body: "",
  }));
}

/**
 * Multi-step drip sequences with AI-drafted copy.
 *
 * Nothing here sends: the output is a JSON export for whatever actually owns
 * sending (Resend, ConvertKit). Keeping the composer and the sender separate is
 * what makes it safe to regenerate a step — the worst case is a discarded draft,
 * not a blast to a live list.
 *
 * Every step carries its own claim-law badge, because a sequence is the format
 * where a prohibited phrase most easily survives: the operator reviews step one
 * carefully and skims the rest.
 */
export function EmailDripBuilder() {
  const fieldId = useId();

  const [preset, setPreset] = useState<DripPresetKey>("launch");
  const [steps, setSteps] = useState<DripStep[]>(() => blankSteps("launch"));
  const [audienceInterest, setAudienceInterest] = useState("");
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyStep, setBusyStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function choosePreset(next: DripPresetKey) {
    setPreset(next);
    setSteps(blankSteps(next));
    setSource(null);
    setError(null);
  }

  function updateStep(index: number, patch: Partial<DripStep>) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  }

  function addStep() {
    setSteps((prev) =>
      prev.length >= MAX_STEPS
        ? prev
        : [
            ...prev,
            {
              step: prev.length + 1,
              name: `Step ${prev.length + 1}`,
              delay_days: 3,
              subject: "",
              body: "",
            },
          ],
    );
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((step, i) => ({ ...step, step: i + 1 })),
    );
  }

  async function generate(regenerateIndex?: number) {
    if (steps.length === 0) {
      setError("Add at least one step first.");
      return;
    }

    if (regenerateIndex === undefined) setLoading(true);
    else setBusyStep(regenerateIndex);
    setError(null);

    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "drip_sequence",
          preset,
          steps: steps.map((s) => ({ name: s.name, delay_days: s.delay_days })),
          audience_interest: audienceInterest.trim() || undefined,
          regenerate_index: regenerateIndex,
        }),
      });
      const data = (await response.json()) as {
        steps?: DripStep[];
        source?: "model" | "template";
        error?: string;
      };

      if (!response.ok || !data.steps || data.steps.length === 0) {
        // The presets are deterministic, so a failed call still produces a
        // usable draft rather than an empty form.
        const local = templateDripSequence({
          preset,
          steps: steps.map((s) => ({ name: s.name, delayDays: s.delay_days })),
        });
        setSteps(regenerateIndex === undefined ? local : applyOne(steps, regenerateIndex, local[regenerateIndex]!));
        setSource("template");
        return;
      }

      setSteps((prev) =>
        regenerateIndex === undefined
          ? data.steps!.map((step, i) => ({ ...step, step: i + 1 }))
          : applyOne(prev, regenerateIndex, data.steps![0]!),
      );
      setSource(data.source ?? "template");
    } catch {
      setError("Could not reach the generator. Try again.");
    } finally {
      setLoading(false);
      setBusyStep(null);
    }
  }

  async function copySubjects() {
    const text = steps
      .map((s) => s.subject)
      .filter(Boolean)
      .join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the subjects and copy them manually.");
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ preset, steps }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `homi-drip-${preset}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const flagged = steps.flatMap((s) => stripNeverSay(`${s.subject}\n${s.body}`).flagged);
  const hasCopy = steps.some((s) => s.subject || s.body);

  return (
    <div id="drip-builder" className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Owned audience"
        title="Drip sequence builder"
        subtitle="Draft a multi-step sequence, then export it into whatever sends. Nothing here sends."
        action={
          source ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {source === "model" ? "Model" : "Template"}
            </span>
          ) : null
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-preset`}>
          Sequence preset
          <select
            id={`${fieldId}-preset`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={preset}
            onChange={(e) => choosePreset(e.target.value as DripPresetKey)}
          >
            {DRIP_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-interest`}>
          Audience interest (optional)
          <input
            id={`${fieldId}-interest`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={audienceInterest}
            placeholder="What they said they wanted at signup"
            onChange={(e) => setAudienceInterest(e.target.value.slice(0, 120))}
          />
        </label>
      </div>

      <p className="mt-2 text-xs text-dim">{dripPreset(preset).audience}.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => void generate()}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              Writing sequence
            </span>
          ) : (
            "Generate sequence"
          )}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={exportJson} disabled={!hasCopy}>
          Export as JSON
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copySubjects} disabled={!hasCopy}>
          {copied ? "Copied" : "Copy all subjects"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={addStep}
          disabled={steps.length >= MAX_STEPS}
        >
          Add step
        </button>
        <span
          className={`rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${
            flagged.length > 0
              ? "border-crimson/40 bg-crimson/10 text-light"
              : "border-emerald/40 bg-emerald/10 text-emerald"
          }`}
        >
          {flagged.length > 0 ? `Claim law · ${flagged.length} flagged` : "Claim law · clean"}
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => {
          const stepClean = isClaimClean(`${step.subject}\n${step.body}`);
          return (
            <div key={index} className="rounded-lg border border-white/5 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <label className="block text-xs text-dim" htmlFor={`${fieldId}-name-${index}`}>
                  Step {index + 1} name
                  <input
                    id={`${fieldId}-name-${index}`}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
                    value={step.name}
                    onChange={(e) => updateStep(index, { name: e.target.value.slice(0, 60) })}
                  />
                </label>
                <label className="block text-xs text-dim" htmlFor={`${fieldId}-delay-${index}`}>
                  Delay (days)
                  <input
                    id={`${fieldId}-delay-${index}`}
                    inputMode="numeric"
                    className="mt-1 w-24 rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
                    value={String(step.delay_days)}
                    onChange={(e) => {
                      const parsed = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
                      updateStep(index, {
                        delay_days: Number.isFinite(parsed) ? Math.min(365, parsed) : 0,
                      });
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void generate(index)}
                    disabled={busyStep !== null || loading}
                  >
                    {busyStep === index ? "Writing" : "Regenerate"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <label
                  className="flex-1 text-3xs uppercase tracking-wide text-dim"
                  htmlFor={`${fieldId}-subject-${index}`}
                >
                  Subject
                  <input
                    id={`${fieldId}-subject-${index}`}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-light"
                    value={step.subject}
                    spellCheck={false}
                    placeholder="Subject line lands here"
                    onChange={(e) => updateStep(index, { subject: e.target.value })}
                  />
                </label>
                <span
                  className={`mt-4 shrink-0 rounded-full border px-2 py-0.5 text-3xs font-semibold uppercase tracking-wide ${
                    stepClean
                      ? "border-emerald/40 bg-emerald/10 text-emerald"
                      : "border-crimson/40 bg-crimson/10 text-light"
                  }`}
                >
                  {stepClean ? "Clean" : "Flagged"}
                </span>
              </div>

              <label
                className="mt-3 block text-3xs uppercase tracking-wide text-dim"
                htmlFor={`${fieldId}-body-${index}`}
              >
                Body
                <textarea
                  id={`${fieldId}-body-${index}`}
                  className="mt-1 min-h-32 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-xs text-light"
                  value={step.body}
                  spellCheck={false}
                  placeholder="Email body lands here — edit freely before you export."
                  onChange={(e) => updateStep(index, { body: e.target.value })}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Replace one step in place, keeping its position and renumbering nothing. */
function applyOne(steps: DripStep[], index: number, replacement: DripStep): DripStep[] {
  return steps.map((step, i) =>
    i === index ? { ...replacement, step: index + 1, name: step.name, delay_days: step.delay_days } : step,
  );
}
