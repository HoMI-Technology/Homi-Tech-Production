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

// Surface role SSOT — checklist deep-link; Path owns the Build in chrome.
void SURFACE_ROLES.plan;

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
 * Read-only — Path owns living step completion. See SURFACE_ROLES.plan.
 */
export default function PlanPage() {
  const freeze = usePhase0Freeze();
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [remote, setRemote] = useState<StoredAssessment | null>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);

  useEffect(() => {
    setStored(loadLocalResult());
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
            Take an assessment first — this checklist is built from your real answers.
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="eyebrow">Checklist · deep link</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-light sm:text-4xl">
          Readiness checklist
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm text-dim">
          Path to Ready owns the living Build. This page is a read-only checklist from your last
          verdict — mark steps done on Path, not here.
        </p>
        {weakestPillar && (
          <p className="mx-auto mt-4 max-w-lg text-base text-dim">
            <span className="font-semibold" style={{ color: weakestPillar.color }}>
              {weakestPillar.name}
            </span>{" "}
            is where we build first. Strengthening it moves your whole Decision Readiness Score.
          </p>
        )}
      </div>

      <div className="glass mt-10 flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-dim">From your last verdict</p>
          <p className="score-numeral mt-1 text-2xl font-bold text-light">
            {steps.length} checklist {steps.length === 1 ? "item" : "items"}
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

      <ol className="mt-8 flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={String(i)} className="glass flex w-full items-start gap-4 p-5">
            <span className="score-numeral mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-high text-xs font-bold text-cyan">
              {i + 1}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-dim">
                Milestone {i + 1}
              </span>
              <span className="mt-1 text-base text-light">{step}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 sm:flex-row sm:justify-center">
        {!isAnonymous ? (
          <Link href="/dashboard" className="btn btn-primary">
            Continue on Home
          </Link>
        ) : null}
        <Link href="/path" className="btn btn-ghost">
          Path to Ready
        </Link>
        {/* A retake must land on the flow that can actually produce a new
            score. The 90-second shadow read cannot — it is a first-run
            pulse, not a re-test. */}
        <Link href="/assessment" className="btn btn-ghost">
          {effective.kind === "shadow" ? "Assess" : "Re-take the assessment"}
        </Link>
      </div>
    </div>
  );
}
