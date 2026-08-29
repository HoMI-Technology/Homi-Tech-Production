import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  COMPANION_ESCALATION_HREF,
  HOME_FOLD_INSTRUMENT,
  companionFoldLine,
} from "@/lib/dashboard/fold-truth";
import Link from "next/link";
import { ScoreRail, type ScoreRailPillars } from "@/components/score/ScoreRail";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { VerdictCelebrate } from "@/components/dashboard/VerdictCelebrate";
import { PathNextMove } from "@/components/dashboard/PathNextMove";
import { PathStepLedger } from "@/components/dashboard/PathStepLedger";
import { HomeMoneyStanding } from "@/components/dashboard/HomeMoneyStanding";
import { HomeMoneyRecheck } from "@/components/dashboard/HomeMoneyRecheck";
import { LastReadChrome } from "@/components/dashboard/LastReadChrome";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { DashboardResumeRamp } from "@/components/dashboard/DashboardResumeRamp";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
import { SaveStatusBanner } from "@/components/results/SaveStatusBanner";
import type { OutcomeSurveyKind } from "@/types/database";

export type HomeFoldLatest = {
  id: string;
  overallScore: number | null;
  /** Raw pillar points from the assessment record; unused on compact rail. */
  pillars: ScoreRailPillars;
};

export type HomeFoldSurvey = {
  id: string;
  kind: OutcomeSurveyKind;
};

/**
 * First viewport of signed-in HōMI. DESIGN.md OPERATE + HOME_FOLD_INSTRUMENT:
 * hard-stop eyebrow → Path + one primary → compact ScoreRail → money strip.
 * Compass lives in the page shell, not on this fold.
 */
export function HomeFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  suppressBuildPercent,
  improved,
  instrumentTint,
  dueSurvey,
  lastReadAt,
  lastMoney,
  hasPath,
  bankLinked,
}: {
  assessmentsFailed: boolean;
  latest: HomeFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  suppressBuildPercent: boolean;
  improved: boolean;
  instrumentTint: string;
  dueSurvey: HomeFoldSurvey | null;
  lastReadAt?: string | null;
  lastMoney?: LastReadMoneyInputs | null;
  hasPath: boolean;
  bankLinked: boolean | null;
}) {
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const companionLine = companionFoldLine({
    hasHardStops: hardStopActive,
    hasPath,
    hasAssessment: latest !== null,
  });
  const celebrateOk =
    Boolean(latest) && !suppressBuildPercent && verdict !== "NOT_YET";

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

            {celebrateOk && verdict && (
              <VerdictCelebrate
                assessmentId={latest.id}
                improved={improved}
                label={VERDICT_META[verdict].label}
              />
            )}

            {hardStopActive && (
              <p
                className="eyebrow text-crimson"
                role="alert"
                data-home-hard-stop=""
              >
                Hard stop · {stopMessages[0]}
              </p>
            )}

            {/* Path next move leads. DESIGN.md OPERATE + HOME_FOLD_INSTRUMENT = "build". */}
            <div className={hardStopActive ? "mt-4" : undefined} data-home-build-hero="">
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
                href="/results"
              />
              {verdict && (
                <div className="mt-3">
                  <LastReadChrome
                    verdict={verdict}
                    lastReadAt={lastReadAt ?? null}
                  />
                </div>
              )}
            </div>

            <HomeMoneyStanding
              lastMoney={lastMoney ?? null}
              hardStopFlags={stopMessages}
              bankLinked={bankLinked}
            />

            <p
              className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
              data-companion-fold-line=""
              data-companion-escalate-href={COMPANION_ESCALATION_HREF}
            >
              <span className="font-medium text-cyan/90">Companion · </span>
              {companionLine}
            </p>

            {dueSurvey && (
              <div className="mt-5">
                <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />
              </div>
            )}

            <HomeMoneyRecheck />

            <p
              className="mt-5 text-sm text-dim"
              data-home-plaid-presence={bankLinked ? "present" : "absent"}
            >
              {bankLinked ? "Bank linked" : "Bank not linked"}
            </p>

            <p className="mt-4">
              <Link href="/scenarios" className="btn btn-ghost btn-sm">
                Saved scenarios
              </Link>
            </p>

            <PathStepLedger suppress={hardStopActive || suppressBuildPercent} />

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
            <p
              className="panel-focus mt-5 max-w-xl rounded-xl border border-cyan/20 bg-cyan/[0.04] px-4 py-3 text-sm leading-relaxed text-dim"
              data-companion-fold-line=""
              data-companion-escalate-href={COMPANION_ESCALATION_HREF}
            >
              <span className="font-medium text-cyan/90">Companion · </span>
              {companionLine}
            </p>
            <HomeMoneyStanding lastMoney={null} hardStopFlags={[]} bankLinked={bankLinked} />
            <p
              className="mt-5 text-sm text-dim"
              data-home-plaid-presence={bankLinked ? "present" : "absent"}
            >
              {bankLinked ? "Bank linked" : "Bank not linked"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
