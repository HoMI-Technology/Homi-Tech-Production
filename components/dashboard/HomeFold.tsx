import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  COMPANION_ESCALATION_HREF,
  HOME_FOLD_INSTRUMENT,
  companionFoldLine,
  hardStopEyebrow,
  shouldShowDay30OutcomePrompt,
  shouldShowHomeMoneyStanding,
} from "@/lib/dashboard/fold-truth";
import Link from "next/link";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
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
};

export type HomeFoldSurvey = {
  id: string;
  kind: OutcomeSurveyKind;
};

/**
 * First viewport of signed-in Home. Brand PASS crop:
 * 1. Hard stop (if any) + verdict word once (Fraunces).
 * 2. PathNextMove — the only primary.
 * 3. Compact score · age + optional stronger/weaker.
 * Nothing else in the first viewport.
 */
export function HomeFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  stopCodes = [],
  foldSentence,
  dueSurvey,
  staleDays,
  lastReadAt,
  lastMoney,
  hasPath,
  pathHeldDays = null,
}: {
  assessmentsFailed: boolean;
  latest: HomeFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  stopCodes?: string[];
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
  pathHeldDays?: number | null;
}) {
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0 || stopCodes.length > 0;
  const companionLine = companionFoldLine({
    hasHardStops: hardStopActive,
    hasPath,
    hasAssessment: latest !== null,
  });
  const showMoneyStanding = shouldShowHomeMoneyStanding({
    verdict,
    hardStopActive,
  });
  const showDay30 =
    dueSurvey != null &&
    shouldShowDay30OutcomePrompt({
      kind: dueSurvey.kind,
      pathHeldDays,
      lastReadAgeDays: staleDays,
    });
  const showSurvey = dueSurvey != null && (dueSurvey.kind !== "day30" || showDay30);
  const eyebrow = hardStopActive ? hardStopEyebrow(stopCodes[0] ?? null) : null;
  const showVerdictHero = Boolean(latest) && (hardStopActive || verdict !== "READY");

  return (
    <div
      data-home-fold=""
      data-home-instrument={latest ? HOME_FOLD_INSTRUMENT : "empty"}
      data-hard-stop={hardStopActive ? "1" : "0"}
    >
      {assessmentsFailed ? (
        <LoadErrorPanel
          title="Your readiness didn't load"
          body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
        />
      ) : latest ? (
        <>
          <div data-home-first-viewport="" className="max-w-xl">
            {showVerdictHero ? (
              <div data-home-verdict-hero="">
                {eyebrow ? (
                  <p
                    className="text-sm font-medium text-yellow"
                    data-home-hard-stop=""
                    role={hardStopActive ? "alert" : undefined}
                  >
                    {eyebrow}
                  </p>
                ) : null}
                <h1
                  data-home-verdict=""
                  className="type-display mt-3 italic font-semibold"
                >
                  {verdictMeta.label}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-light/80">
                  {foldSentence}
                </p>
              </div>
            ) : null}

            <div
              className={showVerdictHero ? "mt-8" : undefined}
              data-home-build-hero=""
            >
              <PathNextMove variant="fold" />
            </div>

            {scorePct != null ? (
              <div
                className="mt-10 border-b border-white/10 pb-4"
                data-home-score-rail=""
                data-home-score-role="context"
              >
                <LastReadChrome
                  score={scorePct}
                  lastReadAt={lastReadAt ?? null}
                  showAge
                  lastMoney={lastMoney ?? null}
                />
              </div>
            ) : null}
          </div>

          <div data-home-below-fold="" className="mt-8 max-w-xl">
            <SaveStatusBanner />

            {staleDays !== null && staleDays > 30 && (
              <p className="mb-4 rounded-lg border border-amber/35 bg-verdict-build/90 px-4 py-2.5 text-sm text-light">
                It has been {staleDays} days since your last assessment. Life
                changes - consider a retest.
              </p>
            )}

            <PathStepLedger suppress={hardStopActive} />

            <p
              className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
              data-companion-fold-line=""
              data-companion-escalate-href={COMPANION_ESCALATION_HREF}
            >
              <span className="font-medium text-cyan/90">Companion · </span>
              {companionLine}
            </p>

            {showMoneyStanding ? <HomeMoneyStanding /> : null}

            {showSurvey && dueSurvey ? (
              <div className="mt-5">
                <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />
              </div>
            ) : null}

            <p className="mt-6 max-w-xl text-xs leading-relaxed text-dim/80">
              Educational guidance only.{" "}
              <Link href="/legal/disclaimer" className="text-cyan underline-offset-2 hover:underline">
                Full disclaimer
              </Link>
            </p>
          </div>
        </>
      ) : (
        <>
          <div data-home-first-viewport="">
            <DashboardResumeRamp />
          </div>
          <p
            className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
            data-companion-fold-line=""
            data-companion-escalate-href={COMPANION_ESCALATION_HREF}
          >
            <span className="font-medium text-cyan/90">Companion · </span>
            {companionLine}
          </p>
        </>
      )}
    </div>
  );
}
