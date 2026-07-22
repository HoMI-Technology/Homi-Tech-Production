"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { PILLARS } from "@/lib/brand";
import { PILLAR_MAX_POINTS, generateNextSteps } from "@/lib/scoring";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import { pickResult } from "@/lib/assessment/resolveResult";
import { createClient } from "@/lib/supabase/client";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

const PLAN_PROGRESS_KEY = "homi:plan-progress";

function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PLAN_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLAN_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Ignore.
  }
}

function pillarPct(key: "financial" | "emotional" | "timing", stored: StoredAssessment): number {
  const total =
    key === "financial" ? stored.result.financial.total : key === "emotional" ? stored.result.emotional.total : stored.result.timing.total;
  return Math.round((total / PILLAR_MAX_POINTS[key]) * 100);
}

export default function PlanPage() {
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [remote, setRemote] = useState<StoredAssessment | null>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setStored(loadLocalResult());
    setProgress(loadProgress());
  }, []);

  useEffect(() => {
    let active = true;
    async function checkAuthAndRemote() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!data?.user) {
          if (active) setRemoteChecked(true);
          return;
        }

        const res = await fetch("/api/assessments/latest");
        const json = await res.json().catch(() => ({ assessment: null }));
        const mapped = json?.assessment ? mapAssessmentRowToStored(json.assessment) : null;
        if (active) {
          setRemote(mapped);
          setRemoteChecked(true);
        }
      } catch {
        if (active) setRemoteChecked(true);
      }
    }
    checkAuthAndRemote();
    return () => {
      active = false;
    };
  }, []);

  // Local result wins when it is newer or there is no signed-in remote
  // result; anonymous users always fall straight through to `stored` here
  // since `remote` stays null for them.
  const effective = stored === undefined ? undefined : pickResult(stored, remote);

  const weakestPillar = useMemo(() => {
    if (!effective) return null;
    const pillars = PILLARS.map((p) => ({ ...p, pct: pillarPct(p.key, effective) }));
    return pillars.sort((a, b) => a.pct - b.pct)[0];
  }, [effective]);

  const steps = useMemo(() => (effective ? generateNextSteps(effective.result) : []), [effective]);

  const retestDate = useMemo(() => {
    if (!effective) return null;
    const base = new Date(effective.completedAt);
    base.setDate(base.getDate() + 30);
    return base;
  }, [effective]);

  function toggleStep(id: string) {
    setProgress((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveProgress(next);
      return next;
    });
  }

  if (stored === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-dim">Loading your plan…</p>
      </div>
    );
  }

  if (!effective) {
    // Signed-in users on a new device: don't flash "No plan yet" before
    // we've had a chance to check the DB for a prior result.
    if (!remoteChecked) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <p className="text-dim">Loading your plan…</p>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="glass p-10">
          <ThresholdCompass size={96} verdict="ALMOST_THERE" className="mx-auto" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-light">No plan yet</h1>
          <p className="mt-3 text-sm text-dim">
            Take an assessment first — your plan is built from your real answers.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/shadow-score" className="btn btn-primary">
              Get your Shadow Score
            </Link>
            <Link href="/assessment" className="btn btn-ghost">
              Take the full assessment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const doneCount = steps.filter((_, i) => progress[String(i)]).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">Your transformation path</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light sm:text-4xl">This is the map, not the failure.</h1>
        {weakestPillar && (
          <p className="mx-auto mt-4 max-w-lg text-base text-dim">
            <span className="font-semibold" style={{ color: weakestPillar.color }}>
              {weakestPillar.name}
            </span>{" "}
            is where we build first. Strengthening it moves your whole HōMI-Score.
          </p>
        )}
      </div>

      <div className="glass mt-10 flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-dim">Progress</p>
          <p className="score-numeral mt-1 text-2xl font-bold text-light">
            {doneCount}/{steps.length} steps
          </p>
        </div>
        {retestDate && (
          <div className="text-right">
            <p className="text-sm text-dim">Projected re-test date</p>
            <p className="mt-1 text-base font-medium text-light">
              {retestDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {steps.map((step, i) => {
          const id = String(i);
          const checked = !!progress[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleStep(id)}
              className="glass glass-hover flex w-full items-start gap-4 p-5 text-left"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  checked ? "border-emerald bg-emerald" : "border-slate-high"
                }`}
              >
                {checked && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#04150e" strokeWidth="2.5">
                    <path d="M2.5 7l3 3 6-6" />
                  </svg>
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-dim">Milestone {i + 1}</span>
                <span className={`mt-1 text-base ${checked ? "text-dim line-through" : "text-light"}`}>{step}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 sm:flex-row sm:justify-center">
        <Link href={effective.kind === "shadow" ? "/assessment" : "/shadow-score"} className="btn btn-primary">
          Re-take the assessment
        </Link>
        <Link href="/results" className="btn btn-ghost">
          Back to your results
        </Link>
      </div>
    </div>
  );
}
