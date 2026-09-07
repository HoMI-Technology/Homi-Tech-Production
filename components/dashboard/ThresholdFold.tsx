import type { CSSProperties } from "react";
import Link from "next/link";
import { COLORS, type VerdictKey } from "@/lib/brand";
import {
  HOME_FOLD_INSTRUMENT,
  MONEY_WAIT_LINE,
  foldHardStopEyebrow,
  foldHomeHoldSentence,
  foldHardStopOverrideLine,
  foldRunwayLabel,
  foldScoreAgeLine,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { formatCurrency } from "@/lib/tools/format";
import { verdictMetaFor } from "@/components/ui/verdict-ssot";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { ThresholdFoldEmptyClose } from "@/components/dashboard/ThresholdFoldEmptyClose";
import { SIGNED_IN_ASSESS_HREF } from "@/components/marketing/first-moment-copy";

export type ThresholdFoldLatest = {
  id: string;
  overallScore: number | null;
  scoredAt?: string | null;
};

/**
 * Signed-in first screen inside SHELL_CRAFT v3.
 * HOME_CRAFT order: verdict → score/— → age → hard stop → hold → Path/Assess.
 * Compass never mounts here — the quiet top bar owns the one mark.
 * Score is last AssessmentResult only. Money waits below the fold until
 * connected cash exists. Empty is blank above the em dash, then Assess only.
 */
export function ThresholdFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  stopCode = null,
  decisionType = "home_buying",
  lastMoney,
  pathPrimary,
}: {
  assessmentsFailed: boolean;
  latest: ThresholdFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  stopCode?: FoldHardStopCode | null;
  decisionType?: string;
  lastMoney?: LastReadMoneyInputs | null;
  pathPrimary: FoldPathPrimary | null;
}) {
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const liquidDollars = lastMoney?.liquidDollars;
  const connectedCash = liquidDollars != null && Number.isFinite(liquidDollars);
  const cashLabel = connectedCash ? formatCurrency(liquidDollars) : null;
  const runwayLabel = foldRunwayLabel(lastMoney?.emergencyFundMonths);
  const shownPath = resolveFoldPathPrimary(pathPrimary, stopCode);
  const scoreLabel =
    scorePct != null
      ? `Overall Decision Readiness Score ${scorePct} out of 100`
      : "Decision Readiness Score Unknown";
  const ageLine = latest ? foldScoreAgeLine(scorePct, latest.scoredAt) : null;
  const verdictMeta = verdict ? verdictMetaFor(verdict) : null;
  const instrumentStyle = {
    "--instrument-tint": COLORS.cyan,
  } as CSSProperties;

  return (
    <div
      className="dash-instrument"
      data-home-fold=""
      data-threshold-fold=""
      data-home-instrument={latest ? HOME_FOLD_INSTRUMENT : "empty"}
      data-hard-stop={hardStopActive ? "1" : "0"}
      style={instrumentStyle}
    >
      <div className="dash-instrument-inner flex flex-col items-start px-4 py-6 text-left sm:px-6 sm:py-8">
        {assessmentsFailed ? (
          <LoadErrorPanel
            title="Your readiness didn't load"
            body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
          />
        ) : (
          <>
            {latest && verdictMeta ? (
              <h1
                className="font-display text-4xl font-medium italic leading-tight tracking-tight sm:text-5xl"
                style={{ color: verdictMeta.color }}
                data-home-fold-verdict=""
                data-home-verdict=""
                aria-label={verdictMeta.label}
              >
                {verdictMeta.label}
              </h1>
            ) : null}

            <p data-home-fold-score-plate="" className={latest ? "mt-6" : undefined}>
              <span
                className="score-numeral text-5xl font-semibold tabular-nums text-light sm:text-6xl"
                style={{ color: COLORS.light }}
                aria-label={scoreLabel}
                data-home-fold-score=""
              >
                {scorePct != null ? scorePct : "\u2014"}
              </span>
              {ageLine ? (
                <span className="ml-3 text-sm text-dim" data-home-fold-age="">
                  {ageLine}
                </span>
              ) : null}
            </p>

            {latest ? (
              <>
                {hardStopActive ? (
                  <div
                    className="mt-6 max-w-xl"
                    role="alert"
                    data-home-hard-stop=""
                  >
                    <p
                      className="text-sm font-medium text-light"
                      data-home-hard-stop-eyebrow=""
                    >
                      {foldHardStopEyebrow(stopCode, decisionType)}
                    </p>
                    <p
                      className="mt-2 text-sm leading-relaxed text-light/85"
                      data-home-hard-stop-hold=""
                    >
                      {foldHomeHoldSentence(stopCode, decisionType)}
                    </p>
                  </div>
                ) : null}

                {hardStopActive && scorePct != null ? (
                  <p
                    className="mt-3 max-w-xl text-sm text-dim"
                    data-home-fold-override=""
                  >
                    {foldHardStopOverrideLine(scorePct, stopCode, decisionType)}
                  </p>
                ) : null}

                <p className="mt-8">
                  {shownPath ? (
                    <Link
                      href={shownPath.href}
                      className="btn btn-primary"
                      data-path-fold-primary=""
                    >
                      {shownPath.title}
                    </Link>
                  ) : (
                    <Link href={SIGNED_IN_ASSESS_HREF} className="btn btn-primary">
                      Assess
                    </Link>
                  )}
                </p>
              </>
            ) : (
              <p className="mt-8">
                <ThresholdFoldEmptyClose />
              </p>
            )}

            {latest ? (
              <div
                className="mt-10 w-full max-w-xl border-t border-white/10 pt-6"
                data-home-money-below-fold=""
              >
                {connectedCash ? (
                  <>
                    <p className="text-sm text-dim" data-home-fold-runway="">
                      <span className="text-2xs font-semibold uppercase tracking-[0.14em]">
                        Runway
                      </span>{" "}
                      <span className="score-numeral text-light">{runwayLabel}</span>
                    </p>
                    <p className="mt-1 text-sm text-dim" data-home-fold-cash="">
                      <span className="text-2xs font-semibold uppercase tracking-[0.14em]">
                        Cash
                      </span>{" "}
                      <span className="score-numeral text-light">{cashLabel}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-dim" data-home-fold-cash-empty="">
                    {MONEY_WAIT_LINE}
                  </p>
                )}
              </div>
            ) : null}

            <p className="mt-8 max-w-md text-xs leading-relaxed text-dim/80">
              Educational guidance only.{" "}
              <Link href="/legal/disclaimer" className="text-cyan underline-offset-2 hover:underline">
                Full disclaimer
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
