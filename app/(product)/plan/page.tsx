"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PILLARS } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import { pickResult } from "@/lib/assessment/resolveResult";
import { createClient } from "@/lib/supabase/client";
import { useResultInsights } from "@/hooks/use-result-insights";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { usePhase0Freeze } from "@/hooks/usePhase0Freeze";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

const PLAN_PROGRESS_KEY = "homi:plan-progress";

// Surface role SSOT — checklist deep-link; Path owns the Build in chrome.
void SURFACE_ROLES.plan;

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
    key === "financial"
      ? stored.result.financial.total
      : key === "emotional"
        ? stored.result.emotional.total
        : stored.result.timing.total;
  return Math.round((total / PILLAR_MAX_POINTS[key]) * 100);
}

/**
 * Checklist deep-link derived from the latest result.
 * Path owns the living Build in chrome — see SURFACE_ROLES.plan.
 */
export default function PlanPage() {
  const freeze = usePhase0Freeze();
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [isAnonymous, setIsAnonymous] = useState(false);
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
        const signedIn = !!data?.user;
        if (active) setIsAnonymous(!signedIn);

        if (!signedIn) {
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
        if (active) {
          setIsAnonymous(true);
          setRemoteChecked(true);
        }
      }
    }
    checkAuthAndRemote();
    return () => {
      active = false;
    };
  }, []);

  // Local result wins when it is newer or remote isn't signed in / doesn't
  // exist. Guests must not paint pillar percents or next steps from
  // localStorage — wait for the auth check, then drop the local payload.
  // Signed-in users still resolve via pickResult (localStorage stays on).
  const picked = stored === undefined ? undefined : pickResult(stored ?? null, remote);
  const effective = !remoteChecked ? undefined : isAnonymous ? null : picked;

  // Insights from storage / server backfill — never generateNextSteps on client (6.3).
  const { insights } = useResultInsights(effective ?? null);
  const steps = insights?.nextSteps ?? [];

  const weakestPillar = useMemo(() => {
    if (!effective) return null;
    const pillars = PILLARS.map((p) => ({ ...p, pct: pillarPct(p.key, effective) }));
    return pillars.sort((a, b) => a.pct - b.pct)[0];
  }, [effective]);

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

  if (freeze.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ProductLoadingSkeleton label="Loading" />
      </div>
    );
  }

  if (freeze.status === "frozen" && freeze.record) {
    return <Phase0FreezeScreen record={freeze.record} />;
  }

  if (stored === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <ProductLoadingSkeleton label="Loading plan" />
      </div>
    );
  }

  if (!effective) {
    // Signed-in users on a new device: don't flash "No plan yet" before
    // we've had a chance to check the DB for a prior result.
    if (!remoteChecked) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24">
          <ProductLoadingSkeleton label="Loading plan" />
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
            <Link
              href={isAnonymous ? PRIMARY_CLOSE_HREF : SIGNED_IN_ASSESS_HREF}
              className="btn btn-primary"
            >
              {PRIMARY_CLOSE_LABEL}
            </Link>
            {!isAnonymous ? (
              <Link href="/path" className="btn btn-ghost">
                Path to Ready
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const doneCount = steps.filter((_, i) => progress[String(i)]).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
          Your transformation path
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light sm:text-4xl">
          This is the map, not the failure.
        </h1>
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
              {retestDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
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
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="#04150e"
                    strokeWidth="2.5"
                  >
                    <path d="M2.5 7l3 3 6-6" />
                  </svg>
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-dim">
                  Milestone {i + 1}
                </span>
                <span
                  className={`mt-1 text-base ${checked ? "text-dim line-through" : "text-light"}`}
                >
                  {step}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 sm:flex-row sm:justify-center">
        {/* A retake must land on the flow that can actually produce a new
            score. The 90-second shadow read cannot — it is a first-run
            pulse, not a re-test. */}
        <Link href="/assessment" className="btn btn-primary">
          {effective.kind === "shadow" ? "Take the full assessment" : "Re-take the assessment"}
        </Link>
        <Link href="/results" className="btn btn-ghost">
          Back to your results
        </Link>
      </div>
    </div>
  );
}
