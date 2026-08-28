"use client";

import { useState } from "react";

const MOODS = ["Anxious", "Calm", "Stressed", "Bold"] as const;

const REPLIES: Record<(typeof MOODS)[number], string> = {
  Anxious: "No judgment. Not yet is protection. This copy is canned — not a live model.",
  Calm: "Steady is useful. The person still decides. Not therapy.",
  Stressed: "A strong spreadsheet does not make the person ready. Canned reply.",
  Bold: "Courage is not the same as readiness. Canned reply.",
};

export function CanonVoices() {
  const [mood, setMood] = useState<(typeof MOODS)[number] | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <p className="font-mono text-xs tracking-widest text-cyan">DECISION COMPANION · CANNED</p>
        <p className="mt-2 text-lg text-light">Hello. I&rsquo;m your Decision Companion — not your banker.</p>
        <p className="mt-2 text-sm text-dim">
          No judgment, ever. Mood replies below are fixed copy. Not a live model. Not therapy.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className="min-h-9 rounded-full border border-slate-high px-4 py-2 text-sm text-dim"
              onClick={() => setMood(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="mt-4 min-h-12 text-sm text-light">{mood ? REPLIES[mood] : "Tap a mood. Nothing is scored."}</p>
      </section>

      <details className="rounded-xl border border-slate-high bg-navy-light p-4">
        <summary className="cursor-pointer font-mono text-xs tracking-widest text-yellow">
          TRINITY · CANNED
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Voice title="Advocate" body="Savings velocity is a real strength in this example. That is worth protecting, not rushing past." />
          <Voice title="Skeptic" body="Emotional readiness still needs time. A strong spreadsheet does not make the person ready." />
          <Voice title="Arbiter" body="Verdict on this mock is BUILD FIRST. The map, not a no. The person still decides." />
        </div>
      </details>

      <details className="rounded-xl border border-slate-high bg-navy-light p-4">
        <summary className="cursor-pointer font-mono text-xs tracking-widest text-emerald">
          COMPANION ROLES · CANON
        </summary>
        <p className="mt-2 text-sm text-dim">
          Homie is the only voice a person hears. Five specialists inform. Descriptions only — not
          system prompts.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Voice title="Homie" body="Sole user-facing voice. Never pressures conversion." />
          <Voice title="Reality Check" body="Financial truth. No mortgage or investment advice." />
          <Voice title="Gut Check" body="Emotional truth. Not therapy." />
          <Voice title="Timing Advisor" body="Windows and context. No certainty claims." />
          <Voice title="Finance Planner" body="Calculator-backed education. No product push." />
          <Voice title="Guardrail" body="Refusals and auditability. Cannot be bypassed." />
        </div>
      </details>
    </div>
  );
}

function Voice({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-xl border border-slate-high bg-navy-light p-4">
      <h3 className="text-sm font-semibold text-light">{title}</h3>
      <p className="mt-2 text-sm text-dim">{body}</p>
    </article>
  );
}
