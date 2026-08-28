import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  COMPANION_ESCALATION_HREF,
  HOME_FOLD_INSTRUMENT,
  buildProgressLabel,
  companionFoldLine,
} from "@/lib/dashboard/fold-truth";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ScoreRail, type ScoreRailPillars } from "@/components/score/ScoreRail";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { VerdictCelebrate } from "@/components/dashboard/VerdictCelebrate";
import { PathNextMove } from "@/components/dashboard/PathNextMove";
import { PathStepLedger } from "@/components/dashboard/PathStepLedger";
import { HomeMoneyStanding } from "@/components/dashboard/HomeMoneyStanding";
import { LastReadChrome } from "@/components/dashboard/LastReadChrome";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { DashboardResumeRamp } from "@/components/dashboard/DashboardResumeRamp";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
import { SaveStatusBanner } from "@/components/results/SaveStatusBanner";
import type { OutcomeSurveyKind } from "@/types/database";

export type HomeFoldLatest = {
  id: string;
  overallScore: number | null;
  /** Raw pillar points from the assessment record; null = never measured. */
  pillars: ScoreRailPillars;
};

export type HomeFoldSurvey = {
  id: string;
  kind: OutcomeSurveyKind;
};

/**
 * First viewport of signed-in Home. DESIGN.md OPERATE + HOME_FOLD_INSTRUMENT:
 * Path next move + hard stops lead the fold; Decision Readiness Score sits as
 * a compact ScoreRail reading. HomeMoneyStanding is the cash strip. No compass
 * theater on the scored fold.
 */
export function HomeFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  suppressBuildPercent,
  improved,
  foldSentence,
  instrumentTint,
  dueSurvey,
  staleDays,
  lastReadAt,
  lastMoney,
  hasPath,
  pathDone,
  pathTotal,
}: {
  assessmentsFailed: boolean;
  latest: HomeFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  suppressBuildPercent: boolean;
  improved: boolean;
  foldSentence: string;
  instrumentTint: string;
  dueSurvey: HomeFoldSurvey | null;
  staleDays: number | null;
  lastReadAt?: string | null;
  lastMoney?: LastReadMoneyInputs | null;
  hasPath: boolean;
  pathDone: number;
  pathTotal: number;
}) {
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const companionLine = companionFoldLine({
    hasHardStops: hardStopActive,
    hasPath,
    hasAssessment: latest !== null,
  });
  const progressLabel = buildProgressLabel({
    done: pathDone,
    total: pathTotal,
    hardStopCount: stopMessages.length,
  });

  return (
    <div
      className="dash-instrument"
      data-home-fold=""
      data-home-instrument={latest ? HOME_FOLD_INSTRUMENT : "empty"}
      data-hard-stop={hardStopActive ? "1" : "0"}
    >
      <div className="dash-instrument-inner p-5 sm:p-7 lg:p-8">
        {assessmentsFailed ? (
          <LoadErrorPanel
            title="Your readiness didn't load"
            body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
          />
        ) : latest ? (
          <>
            <SaveStatusBanner />

            {latest && !suppressBuildPercent && (
              <VerdictCelebrate
                assessmentId={latest.id}
                improved={improved}
                label={verdictMeta.label}
              />
            )}

            {hardStopActive && (
              <div
                className="mb-5 rounded-xl border border-crimson/45 bg-crimson/10 px-4 py-3"
                role="alert"
                data-home-hard-stop=""
              >
                <p className="text-3xs font-bold uppercase tracking-[0.14em] text-crimson">
                  Hard stop
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-light">
                  {stopMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="dash-hero-meta">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Wordmark size="text-xl sm:text-2xl" />
                  <p className="eyebrow">Your build</p>
                </div>
                <p
                  className="mt-2 max-w-xl text-sm leading-relaxed text-light/90"
                  style={{ textWrap: "pretty" }}
                >
                  {foldSentence}
                </p>
              </div>
              {progressLabel ? (
                <p
                  className="score-numeral text-sm text-light/80"
                  data-home-build-progress=""
                >
                  {progressLabel}
                </p>
              ) : null}
            </div>

            {staleDays !== null && staleDays > 30 && (
              <p className="mb-4 rounded-lg border border-amber/35 bg-verdict-build/90 px-4 py-2.5 text-sm text-light">
                It has been {staleDays} days since your last assessment. Life
                changes - consider a retest.
              </p>
            )}

            {/* Path next move leads. DESIGN.md OPERATE + HOME_FOLD_INSTRUMENT = "build". */}
            <div data-home-build-hero="">
              <PathNextMove variant="fold" />
            </div>

            {/* Compact score reading — supporting, never the hero. */}
            <div
              className="mt-6 border-t border-white/5 pt-6"
              data-home-score-rail=""
              data-home-score-role="context"
            >
              <ScoreRail
                variant="compact"
                score={scorePct}
                verdict={verdict}
                pillars={latest.pillars}
                tint={hardStopActive ? COLORS.crimson : instrumentTint}
              />
              {verdict && (
                <div className="mt-3">
                  <LastReadChrome
                    verdict={verdict}
                    lastReadAt={lastReadAt ?? null}
                    showAge={staleDays === null || staleDays <= 30}
                    lastMoney={lastMoney ?? null}
                  />
                </div>
              )}
            </div>

            <PathStepLedger suppress={hardStopActive || suppressBuildPercent} />

            {/* Presence only — escalation opens at COMPANION_ESCALATION_HREF; no chat on fold. */}
            <p
              className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
              data-companion-fold-line=""
              data-companion-escalate-href={COMPANION_ESCALATION_HREF}
            >
              <span className="font-medium text-cyan/90">Companion · </span>
              {companionLine}
            </p>

            {/* Reality strip — enhanced, never gutted; CTAs stay ghost/sm. */}
            <HomeMoneyStanding />

            {dueSurvey && (
              <div className="mt-5">
                <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />
              </div>
            )}

            {/* Compliance chrome on the scored fold: one quiet line + the full
                disclaimer page. The verbatim LEGAL_DISCLAIMER stays on report /
                share surfaces; the fold links there instead of restating it. */}
            <p className="mt-6 max-w-xl text-xs leading-relaxed text-dim/80">
              Educational guidance only.{" "}
              <Link href="/legal/disclaimer" className="text-cyan underline-offset-2 hover:underline">
                Full disclaimer
              </Link>
            </p>
          </>
        ) : (
          <>
            <DashboardResumeRamp />
            {/* First-run presence line — Assess owns the primary CTA; no chat on fold. */}
            <p
              className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
              data-companion-fold-line=""
              data-companion-escalate-href={COMPANION_ESCALATION_HREF}
            >
              <span className="font-medium text-cyan/90">Companion · </span>
              {companionLine}
            </p>
            <HomeMoneyStanding />
          </>
        )}
      </div>
    </div>
  );
}
