import Link from "next/link";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { HOME_FOLD_INSTRUMENT } from "@/lib/dashboard/fold-truth";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { VerdictCelebrate } from "@/components/dashboard/VerdictCelebrate";
import { PathNextMove } from "@/components/dashboard/PathNextMove";
import { DashboardResumeRamp } from "@/components/dashboard/DashboardResumeRamp";
import { OutcomeSurveyPrompt } from "@/components/dashboard/OutcomeSurveyPrompt";
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
 * First viewport of signed-in Home. One instrument (hero), the verdict,
 * one honest sentence, Path next step + See results. No compass, no
 * second chrome, no money ledger.
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
}) {
  const verdictMeta = VERDICT_META[verdict ?? "BUILD_FIRST"];
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;

  return (
    <div
      className="glass relative p-5 sm:p-7 lg:p-8"
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

          <p className="text-3xs font-bold uppercase tracking-[0.16em] text-dim">
            HōMI-Score
          </p>

          {scorePct != null && (
            <div className="mt-1.5" data-home-hero="">
              <HeroScore
                value={scorePct}
                color={hardStopActive ? COLORS.crimson : instrumentTint}
              />
            </div>
          )}

          {verdict && (
            <div className="mt-3" data-home-verdict="">
              <Link href="/results" aria-label="See results">
                <VerdictBadge verdict={verdict} size="lg" />
              </Link>
            </div>
          )}

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-light/90">
            {foldSentence}
          </p>

          {staleDays !== null && staleDays > 30 && (
            <p className="mt-4 rounded-lg border border-amber/35 bg-verdict-build/90 px-4 py-2.5 text-sm text-light">
              It has been {staleDays} days since your last assessment. Life
              changes - consider a retest.
            </p>
          )}

          <PathNextMove />

          <div className="mt-3">
            <Link href="/results" className="btn btn-ghost">
              See results
            </Link>
          </div>

          {dueSurvey && (
            <div className="mt-5">
              <OutcomeSurveyPrompt surveyId={dueSurvey.id} kind={dueSurvey.kind} />
            </div>
          )}
        </>
      ) : (
        <DashboardResumeRamp />
      )}
    </div>
  );
}
