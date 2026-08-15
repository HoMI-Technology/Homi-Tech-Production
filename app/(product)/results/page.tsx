"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import { discardScoreShapedShadow, pickResult } from "@/lib/assessment/resolveResult";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { useResultInsights } from "@/hooks/use-result-insights";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { usePhase0Freeze } from "@/hooks/usePhase0Freeze";

/**
 * Verdict UI (Path, ReasoningTrail, share, pillar rings) is interaction-free
 * on the empty /results Lighthouse path. Keep it behind next/dynamic so LHCI
 * does not transfer that graph against the §11 script budget.
 */
const ResultsVerdictView = dynamic(() =>
  import("@/components/results/ResultsVerdictView").then((m) => m.ResultsVerdictView),
);

/**
 * Surface roles (D4 — all four readiness surfaces stay, each with one job):
 * - /results — the verdict MOMENT: score reveal, pillars, insight, immediate CTAs.
 * - /path    — the ongoing plan-to-ready: binding-constraint sequence over time.
 * - /plan    — simple next-steps checklist derived from the latest result.
 * - /report/{id} — the persisted, shareable/printable RECORD of one assessment.
 * Don't duplicate one surface's job on another — link across instead.
 */
export default function ResultsPage() {
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [remote, setRemote] = useState<StoredAssessment | null>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);
  const [fullReport, setFullReport] = useState(false);
  const freeze = usePhase0Freeze();

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

        const entRes = await fetch("/api/account/entitlements");
        if (entRes.ok) {
          const entJson = (await entRes.json()) as { entitlements?: { fullReport?: boolean } };
          if (active) setFullReport(Boolean(entJson.entitlements?.fullReport));
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
  // exist; anonymous users always fall straight through to `stored` here
  // since `remote` stays null for them.
  const picked = stored === undefined ? undefined : pickResult(stored ?? null, remote);
  const effective =
    picked === undefined ? undefined : discardScoreShapedShadow(picked ?? null);

  // Insights from storage / server backfill — never generateKeyInsight on client (6.3).
  // Hook must run before every early return.
  const { insights } = useResultInsights(effective ?? null);
  const keyInsight = insights?.keyInsight ?? "";
  const nextSteps = insights?.nextSteps ?? [];

  // Canonical funnel event: fire once per rendered verdict (occurrence +
  // verdict label only — never the score). Must live above the early returns.
  const trackedVerdict = useRef<string | null>(null);
  useEffect(() => {
    if (freeze.status !== "open") return;
    if (!effective) return;
    if (trackedVerdict.current === effective.result.verdict) return;
    trackedVerdict.current = effective.result.verdict;
    track("verdict_shown", { verdict: effective.result.verdict });
  }, [effective, freeze.status]);

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
        <ProductLoadingSkeleton label="Loading results" />
      </div>
    );
  }

  if (!effective) {
    // Signed-in users on a new device: don't flash "No results yet" before
    // we've had a chance to check the DB for a prior result.
    if (!remoteChecked) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-24">
          <ProductLoadingSkeleton label="Loading results" />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="glass p-10">
          <ThresholdCompass size={96} verdict="ALMOST_THERE" className="mx-auto" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-light">No results yet</h1>
          <p className="mt-3 text-sm text-dim">
            You haven&rsquo;t taken an assessment yet. The verdict lives on the full assessment.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:justify-center">
            <Link href="/assessment" className="btn btn-primary">
              Assess
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ResultsVerdictView
      stored={effective}
      isAnonymous={isAnonymous}
      fullReport={fullReport}
      keyInsight={keyInsight}
      nextSteps={nextSteps}
    />
  );
}
