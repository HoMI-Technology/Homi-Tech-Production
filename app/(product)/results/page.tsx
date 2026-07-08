"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PILLARS, VERDICT_META } from "@/lib/brand";
import { PILLAR_MAX_POINTS, generateKeyInsight, generateNextSteps } from "@/lib/scoring";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { createClient } from "@/lib/supabase/client";
import { deriveConflictSignals } from "@/lib/conflict/engine";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CountUpScore } from "@/components/assessment/CountUpScore";
import { SubFactorBar } from "@/components/assessment/SubFactorBar";
import { TrinityBar } from "@/components/assessment/TrinityBar";
import { ShareScoreButton } from "@/components/share/ShareScoreButton";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";
import { VerdictOverride } from "@/components/assessment/VerdictOverride";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

export default function ResultsPage() {
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    setStored(loadLocalResult());
  }, []);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) setIsAnonymous(!data?.user);
      } catch {
        if (active) setIsAnonymous(true);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  if (stored === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <p className="text-dim">Loading your results…</p>
      </div>
    );
  }

  if (stored === null) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="glass p-10">
          <ThresholdCompass size={96} verdict="ALMOST_THERE" className="mx-auto" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-light">No results yet</h1>
          <p className="mt-3 text-sm text-dim">
            You haven&rsquo;t taken an assessment yet. Start with the 90-second Shadow Score to see where you stand.
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

  const { result, kind } = stored;
  const meta = VERDICT_META[result.verdict];
  const keyInsight = generateKeyInsight(result);
  const nextSteps = generateNextSteps(result);
  const conflictSignals = deriveConflictSignals({
    fomoLevel: stored.inputs.fomoLevel,
    timeHorizonMonths: stored.inputs.timeHorizonMonths,
    referralSource: stored.inputs.referralSource,
    deadlineOrigin: stored.inputs.deadlineOrigin,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {kind === "shadow" && (
        <div className="glass mb-8 flex flex-col items-start justify-between gap-4 border border-cyan/30 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-cyan">This is your Shadow Score</p>
            <p className="mt-1 text-sm text-dim">
              Six inputs, filled out with neutral assumptions. The full assessment gives you a precise read.
            </p>
          </div>
          <Link href="/assessment" className="btn btn-primary shrink-0 !px-4 !py-2 text-sm">
            Take the full assessment
          </Link>
        </div>
      )}

      {/* Score reveal */}
      <div className="glass flex flex-col items-center gap-8 p-8 text-center sm:p-12 md:flex-row md:text-left">
        <div className="shrink-0">
          <ThresholdCompass size={220} verdict={result.verdict} />
        </div>
        <div className="flex flex-col items-center md:items-start">
          <CountUpScore value={result.score} />
          <p className="mt-1 text-sm uppercase tracking-widest text-dim">HōMI-Score out of 100</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <VerdictBadge verdict={result.verdict} size="lg" />
            {stored.previous && (
              <ScoreDeltaBadge
                current={result.score}
                previous={stored.previous.score}
                previousDate={stored.previous.completedAt}
              />
            )}
          </div>
          <p className="mt-4 max-w-md text-base text-light">{meta.line}</p>
        </div>
      </div>

      {/* Hard stops */}
      {result.hardStops.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {result.hardStops.map((stop) => (
            <div key={stop.code} className="glass border border-crimson/50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-crimson">
                This is a protection signal
              </p>
              <p className="mt-2 text-base text-light">{stop.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pillar rings */}
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <PillarCard
          color={FINANCIAL.color}
          name={FINANCIAL.name}
          value={result.financial.total}
          max={PILLAR_MAX_POINTS.financial}
        >
          <SubFactorBar label="Debt-to-income" value={result.financial.debtToIncome} max={10} color={FINANCIAL.color} />
          <SubFactorBar label="Down payment" value={result.financial.downPayment} max={10} color={FINANCIAL.color} />
          <SubFactorBar label="Emergency fund" value={result.financial.emergencyFund} max={8} color={FINANCIAL.color} />
          <SubFactorBar label="Credit health" value={result.financial.creditHealth} max={7} color={FINANCIAL.color} />
        </PillarCard>

        <PillarCard
          color={EMOTIONAL.color}
          name={EMOTIONAL.name}
          value={result.emotional.total}
          max={PILLAR_MAX_POINTS.emotional}
        >
          <SubFactorBar label="Life stability" value={result.emotional.lifeStability} max={9} color={EMOTIONAL.color} />
          <SubFactorBar label="Confidence" value={result.emotional.confidenceLevel} max={9} color={EMOTIONAL.color} />
          {!result.emotional.singleRedistribution && (
            <SubFactorBar label="Partner alignment" value={result.emotional.partnerAlignment} max={9} color={EMOTIONAL.color} />
          )}
          <SubFactorBar label="Pressure check" value={result.emotional.fomoCheck} max={8} color={EMOTIONAL.color} />
        </PillarCard>

        <PillarCard
          color={TIMING.color}
          name={TIMING.name}
          value={result.timing.total}
          max={PILLAR_MAX_POINTS.timing}
        >
          <SubFactorBar label="Time horizon" value={result.timing.timeHorizon} max={10} color={TIMING.color} />
          <SubFactorBar label="Savings rate" value={result.timing.savingsRate} max={10} color={TIMING.color} />
          <SubFactorBar label="Down payment progress" value={result.timing.downPaymentProgress} max={10} color={TIMING.color} />
        </PillarCard>
      </div>

      {/* Trinity bar — relative strength across the three pillars */}
      <div className="glass mt-8 p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-light">Relative strength</h2>
        <p className="mt-1 text-xs text-dim">
          How your three pillars compare to each other, not just to their own max.
        </p>
        <div className="mt-4">
          <TrinityBar
            financial={result.financial.total}
            emotional={result.emotional.total}
            timing={result.timing.total}
          />
        </div>
      </div>

      {/* Key insight */}
      <div className="glass mt-12 p-6 sm:p-8">
        <h2 className="font-display text-xl font-semibold text-light">What this means</h2>
        <p className="mt-3 text-base leading-relaxed text-light">{keyInsight}</p>
      </div>

      {/* Conflict check */}
      {conflictSignals.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold text-light">Conflict check</h2>
          <div className="mt-4 flex flex-col gap-3">
            {conflictSignals.map((signal) => (
              <div
                key={signal.code}
                className={`glass border p-4 ${
                  signal.severity === "protect"
                    ? "border-crimson/50"
                    : signal.severity === "warn"
                      ? "border-amber/40"
                      : "border-cyan/30"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    signal.severity === "protect"
                      ? "text-crimson"
                      : signal.severity === "warn"
                        ? "text-amber"
                        : "text-cyan"
                  }`}
                >
                  {signal.title}
                </p>
                <p className="mt-1 text-sm text-light">{signal.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {result.warnings.map((w) => (
            <div key={w.code} className="glass border border-yellow/40 p-4">
              <p className="text-sm text-light">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold text-light">Your next steps</h2>
        <div className="mt-4 flex flex-col gap-3">
          {nextSteps.map((step, i) => (
            <div key={i} className="glass flex items-start gap-4 p-4">
              <span className="score-numeral flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-surface text-sm font-bold text-cyan">
                {i + 1}
              </span>
              <p className="text-base text-light">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-12 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 sm:flex-row sm:justify-center">
        <Link href="/plan" className="btn btn-primary">
          Build your plan
        </Link>
        {isAnonymous && (
          <Link href="/auth/sign-up" className="btn btn-emerald">
            Save your progress
          </Link>
        )}
        <Link href={kind === "shadow" ? "/assessment" : "/shadow-score"} className="btn btn-ghost">
          {kind === "shadow" ? "Take the full assessment" : "Retake the assessment"}
        </Link>
        {stored.serverId && (
          <Link href={`/report/${stored.serverId}/credential`} className="btn btn-ghost">
            Get credential
          </Link>
        )}
        {/* Results are saved anonymously (no server id yet), so this gracefully
            shows the "sign in to share" variant until the user has an account. */}
        <ShareScoreButton assessmentId={null} />
      </div>

      <div className="mt-6 flex justify-center">
        <VerdictOverride hardStops={result.hardStops} assessmentId={stored.serverId ?? null} />
      </div>
    </div>
  );
}

function PillarCard({
  color,
  name,
  value,
  max,
  children,
}: {
  color: string;
  name: string;
  value: number;
  max: number;
  children: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center gap-6 p-6">
      <ScoreRing value={value} max={max} color={color} label={name} size={140} />
      <div className="flex w-full flex-col gap-3">{children}</div>
    </div>
  );
}
