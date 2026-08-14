"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { LEGAL_DISCLAIMER, PILLARS, VERDICT_META } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { isShadowAssessmentKind, type StoredAssessment } from "@/lib/assessment/storage";
import { deriveConflictSignals } from "@/lib/conflict/engine";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ReadinessBar } from "@/components/ui/ReadinessBar";
import { SubMetricPill } from "@/components/ui/SubMetricPill";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { CountUpScore } from "@/components/assessment/CountUpScore";
import { SubFactorBar } from "@/components/assessment/SubFactorBar";
import { TrinityBar } from "@/components/assessment/TrinityBar";
import { ShareScoreButton } from "@/components/share/ShareScoreButton";
import { ShareShadowButton } from "@/components/share/ShareShadowButton";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";
import { ReasoningTrail } from "@/components/results/ReasoningTrail";
import { DataQualityChip } from "@/components/results/DataQualityChip";
import { VerdictOverride } from "@/components/assessment/VerdictOverride";
import { SaveStatusBanner } from "@/components/results/SaveStatusBanner";
import { PathToReadyCard } from "@/components/readiness";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

/**
 * Verdict moment UI for /results. Loaded only when a stored result exists so
 * the empty /results Lighthouse path does not download Path/trail/share weight.
 */
export function ResultsVerdictView({
  stored,
  isAnonymous,
  fullReport,
  keyInsight,
  nextSteps,
}: {
  stored: StoredAssessment;
  isAnonymous: boolean;
  fullReport: boolean;
  keyInsight: string;
  nextSteps: string[];
}) {
  const { result, kind } = stored;
  // Compare on a raw string before any union narrowing (TS2367).
  const isShadowRead = isShadowAssessmentKind(String(kind));

  // Packet B: leftover kind:"shadow" must never print a HōMI-Score.
  if (isShadowRead) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <div className="glass p-10">
          <h1 className="font-display text-2xl font-semibold text-light">No results yet</h1>
          <p className="mt-3 text-sm text-dim">
            That read is not a HōMI verdict. Take the full assessment.
          </p>
          <div className="mt-6">
            <Link href="/assessment" className="btn btn-primary">
              Assess
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const meta = VERDICT_META[result.verdict];
  const conflictSignals = deriveConflictSignals({
    fomoLevel: stored.inputs.fomoLevel,
    timeHorizonMonths: stored.inputs.timeHorizonMonths,
    referralSource: stored.inputs.referralSource,
    deadlineOrigin: stored.inputs.deadlineOrigin,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <SaveStatusBanner />

      {/* Score reveal — flagship moment */}
      <div className="glass relative flex flex-col items-center gap-8 overflow-hidden p-8 text-center sm:p-12 md:flex-row md:text-left">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
        />
        <div className="shrink-0">
          <ThresholdCompass size={220} verdict={result.verdict} />
        </div>
        <div className="flex flex-col items-center md:items-start">
          <h1 className="text-3xs font-semibold uppercase tracking-[0.25em] text-dim">
            Decision readiness
          </h1>
          <CountUpScore value={result.score} />
          <p className="mt-1 text-sm uppercase tracking-widest text-dim">HōMI-Score out of 100</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <VerdictBadge score={result.score} hardStops={result.hardStops} size="lg" />
            {stored.previous && (
              <ScoreDeltaBadge
                current={result.score}
                previous={stored.previous.score}
                previousDate={stored.previous.completedAt}
              />
            )}
          </div>
          <DataQualityChip
            rawScore={result.score}
            assessmentCompletedAt={stored.completedAt}
          />
          <ReadinessBar
            score={result.score}
            hardStops={result.hardStops}
            className="mt-5 w-full max-w-md"
            showLegend={false}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <SubMetricPill
              label="Financial"
              value={result.financial.total}
              max={PILLAR_MAX_POINTS.financial}
            />
            <SubMetricPill
              label="Emotional"
              value={result.emotional.total}
              max={PILLAR_MAX_POINTS.emotional}
            />
            <SubMetricPill
              label="Timing"
              value={result.timing.total}
              max={PILLAR_MAX_POINTS.timing}
            />
          </div>
          <p className="mt-4 max-w-md text-base text-light">{meta.line}</p>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-dim/80">
            {LEGAL_DISCLAIMER}
          </p>
          {result.verdict !== "READY" && (
            <>
              <p className="mt-3 max-w-md text-sm text-dim">
                Not a judgment — a protective map. Your Path to Ready is built from the binding
                constraint first.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="#path-to-ready" className="btn btn-primary btn-sm">
                  Continue Path to Ready
                </a>
                <Link href="/path" className="btn btn-ghost btn-sm">
                  Open full path
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reasoning trail — confidence + blockers + optional magnitude movement */}
      <ReasoningTrail stored={stored} />

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

      {/* Path to Ready — binding-constraint sequence (primary operate move) */}
      <PathToReadyCard
        result={result}
        assessmentCompletedAt={stored.completedAt}
        isAnonymous={isAnonymous}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/tools/preflight" className="btn btn-ghost btn-sm">
          Decision Pre-Flight
        </Link>
        <Link href="/scenarios" className="btn btn-ghost btn-sm">
          Scenario studio
        </Link>
        <Link href="/path" className="btn btn-ghost btn-sm">
          Full path
        </Link>
      </div>

      {/* Pillar rings */}
      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <PillarCard
          color={FINANCIAL.color}
          name={FINANCIAL.name}
          value={result.financial.total}
          max={PILLAR_MAX_POINTS.financial}
        >
          <SubFactorBar
            label="Debt-to-income"
            value={result.financial.debtToIncome}
            max={10}
            color={FINANCIAL.color}
          />
          <SubFactorBar
            label="Down payment"
            value={result.financial.downPayment}
            max={10}
            color={FINANCIAL.color}
          />
          <SubFactorBar
            label="Emergency fund"
            value={result.financial.emergencyFund}
            max={8}
            color={FINANCIAL.color}
          />
          <SubFactorBar
            label="Credit health"
            value={result.financial.creditHealth}
            max={7}
            color={FINANCIAL.color}
          />
        </PillarCard>

        <PillarCard
          color={EMOTIONAL.color}
          name={EMOTIONAL.name}
          value={result.emotional.total}
          max={PILLAR_MAX_POINTS.emotional}
        >
          <SubFactorBar
            label="Life stability"
            value={result.emotional.lifeStability}
            max={9}
            color={EMOTIONAL.color}
          />
          <SubFactorBar
            label="Confidence"
            value={result.emotional.confidenceLevel}
            max={9}
            color={EMOTIONAL.color}
          />
          {!result.emotional.singleRedistribution && (
            <SubFactorBar
              label="Partner alignment"
              value={result.emotional.partnerAlignment}
              max={9}
              color={EMOTIONAL.color}
            />
          )}
          <SubFactorBar
            label="Pressure check"
            value={result.emotional.fomoCheck}
            max={8}
            color={EMOTIONAL.color}
          />
        </PillarCard>

        <PillarCard
          color={TIMING.color}
          name={TIMING.name}
          value={result.timing.total}
          max={PILLAR_MAX_POINTS.timing}
        >
          <SubFactorBar
            label="Time horizon"
            value={result.timing.timeHorizon}
            max={10}
            color={TIMING.color}
          />
          <SubFactorBar
            label="Savings rate"
            value={result.timing.savingsRate}
            max={10}
            color={TIMING.color}
          />
          <SubFactorBar
            label="Down payment progress"
            value={result.timing.downPaymentProgress}
            max={10}
            color={TIMING.color}
          />
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

      {/* Activation path — ordered first-run after the verdict moment */}
      <div className="glass mt-12 border border-cyan/20 p-6">
        <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">What next</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-light">
          Your activation path
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-dim">
          Educational guidance only — not approval. Use the map in order; skip nothing that still
          feels unclear.
        </p>
        <ol className="mt-5 space-y-3 text-sm text-light">
          <li className="flex gap-3">
            <span className="score-numeral flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-surface text-xs font-bold text-cyan">
              1
            </span>
            <span>
              <span className="font-semibold">Read the verdict as a map</span>
              <span className="text-dim">
                {" "}
                — Build First and not yet are protection, not a grade.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="score-numeral flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-surface text-xs font-bold text-cyan">
              2
            </span>
            <span>
              <span className="font-semibold">Follow Path to Ready / plan</span>
              <span className="text-dim">
                {" "}
                — close the binding constraint before you escalate the commitment.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="score-numeral flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-surface text-xs font-bold text-cyan">
              3
            </span>
            <span>
              <span className="font-semibold">
                {isAnonymous ? "Save your progress" : "Return when life moves"}
              </span>
              <span className="text-dim">
                {isAnonymous
                  ? " — create an account so this read isn’t lost on a single device."
                  : " — re-check when money, feeling, or timing changes."}
              </span>
            </span>
          </li>
        </ol>
        <p className="mt-4 text-xs text-dim">
          HōMI is not a lender and does not replace a credit score. If someone asked whether we
          approve loans: we don’t — we help you see if you’ll be okay.
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-col items-center gap-4 border-t border-slate-surface/60 pt-10 sm:flex-row sm:justify-center">
        <Link href="/plan" className="btn btn-primary">
          Build your plan
        </Link>
        <a href="#path-to-ready" className="btn btn-ghost">
          Path to Ready
        </a>
        {isAnonymous && (
          <Link href="/auth/sign-up" className="btn btn-emerald">
            Save your progress
          </Link>
        )}
        <Link href={isShadowRead ? "/assessment" : "/shadow-score"} className="btn btn-ghost">
          {isShadowRead ? "Take the full assessment" : "Retake the assessment"}
        </Link>
        {stored.serverId && fullReport && (
          <Link href={`/report/${stored.serverId}`} className="btn btn-ghost">
            View full report
          </Link>
        )}
        {stored.serverId && fullReport && (
          <Link href={`/report/${stored.serverId}/credential`} className="btn btn-ghost">
            Get credential
          </Link>
        )}
        {stored.serverId && !fullReport && !isAnonymous && (
          <Link href="/pricing" className="btn btn-ghost">
            Unlock credential (Plus)
          </Link>
        )}
        {/* Results are saved anonymously (no server id yet), so this gracefully
            shows the "sign in to share" variant until the user has an account. */}
        {!isAnonymous && <ShareScoreButton assessmentId={null} />}
      </div>

      {isAnonymous && (
        <div className="mt-6 flex justify-center">
          {/* Anonymous funnel's shareable exit: journey card, no account needed. */}
          <ShareShadowButton inputs={stored.inputs} />
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <VerdictOverride hardStops={result.hardStops} assessmentId={stored.serverId ?? null} />
      </div>

      {/* One number is a reading; the line is the story. /timeline owns the line. */}
      {!isAnonymous && (
        <div className="mt-8 flex justify-center">
          <Link href="/timeline" className="text-sm font-semibold text-cyan hover:underline">
            View score history &rarr;
          </Link>
        </div>
      )}
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
  children: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center gap-6 p-6">
      <ScoreRing value={value} max={max} color={color} label={name} size={140} />
      <div className="flex w-full flex-col gap-3">{children}</div>
    </div>
  );
}
