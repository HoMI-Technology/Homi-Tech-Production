"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadLocalResult, saveOverride } from "@/lib/assessment/storage";

interface HardStopLike {
  code: string;
  message: string;
}

/**
 * Always-visible "I'm deciding anyway" control for /results and /report/[id].
 * Never changes score, verdict, or hard-stops — purely records that the user
 * saw the honest read and chose to proceed. Never render this on /share pages.
 */
export function VerdictOverride({
  hardStops,
  assessmentId = null,
  initialOverridden = false,
}: {
  hardStops: HardStopLike[];
  /** Server-side assessments.id, when known (always present on /report/[id]). */
  assessmentId?: string | null;
  /** True when assessments.user_override is already set (report page, server-fetched). */
  initialOverridden?: boolean;
}) {
  const [overridden, setOverridden] = useState(initialOverridden);
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOverridden) return;
    const stored = loadLocalResult();
    if (stored?.override) setOverridden(true);
  }, [initialOverridden]);

  const requiresAck = hardStops.length > 0;

  async function handleConfirm() {
    if (requiresAck && !checked) return;
    setSubmitting(true);
    setError(null);

    const at = new Date().toISOString();
    const acknowledgedHardStops = requiresAck ? checked : true;

    // Score/verdict never change here — this only records the user's choice.
    saveOverride({ at, acknowledgedHardStops });

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const resolvedAssessmentId = assessmentId ?? loadLocalResult()?.serverId ?? null;

      if (data?.user && resolvedAssessmentId) {
        await fetch("/api/assessments/override", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assessmentId: resolvedAssessmentId, acknowledgedHardStops }),
        });
      }
    } catch {
      // Local override is already recorded — server sync is best-effort.
    } finally {
      setSubmitting(false);
      setOpen(false);
      setOverridden(true);
    }
  }

  if (overridden) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-surface/60 bg-slate-surface/40 px-3 py-1.5 text-xs font-medium text-dim">
        Proceeding — your call, honestly recorded.
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost !px-4 !py-2 text-sm">
        I&rsquo;m deciding anyway
      </button>
    );
  }

  return (
    <div className="glass w-full max-w-lg border border-slate-surface/60 p-5 text-left">
      <h3 className="font-display text-lg font-semibold text-light">You can always decide.</h3>
      <p className="mt-2 text-sm text-dim">
        We just want you to see it clearly. HōMI keeps the honest read either way — and will check in on
        how it goes.
      </p>

      {requiresAck && (
        <div className="mt-4 flex flex-col gap-3">
          {hardStops.map((stop) => (
            <div key={stop.code} className="rounded-lg border border-crimson/50 p-3">
              <p className="text-sm text-light">{stop.message}</p>
            </div>
          ))}
          <label className="mt-1 flex items-start gap-2 text-sm text-light">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 shrink-0"
            />
            I&rsquo;ve read the protection signals
          </label>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-crimson">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={(requiresAck && !checked) || submitting}
          className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50"
        >
          {submitting ? "Recording…" : "Confirm — I'm deciding anyway"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setChecked(false);
          }}
          className="btn btn-ghost !px-4 !py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
