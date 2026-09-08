import type { CSSProperties } from "react";
import Link from "next/link";
import { COLORS, type VerdictKey } from "@/lib/brand";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  FOLD_FLAGS_NONE_INVENTED,
  FOLD_LIQUID_CONNECTED_LABEL,
  FOLD_MONEY_CONNECTED_HEADING,
  FOLD_MONEY_DEPTH_LABEL,
  FOLD_MONEY_EMPTY_HEADING,
  FOLD_MONEY_HREF,
  HOME_FOLD_INSTRUMENT,
  MONEY_WAIT_LINE,
  foldHardStopEyebrow,
  foldHardStopEyebrowParts,
  foldHomeHoldSentence,
  foldRunwayLabel,
  foldScoreAgeLine,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
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
 * HOME_HARDSTOP_CRAFT: verdict label → one score+age line → hard stop → hold → Path.
 * Compass never mounts here — the quiet top bar owns the one mark.
 * Score is last AssessmentResult only. Money waits below the fold.
 * Empty is blank above the em dash, then Assess only.
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
  const runwayMonths = lastMoney?.emergencyFundMonths;
  const runwayLabel = foldRunwayLabel(runwayMonths);
  const runwayUnderOne =
    runwayMonths != null && Number.isFinite(runwayMonths) && runwayMonths < 1;
  const shownPath = resolveFoldPathPrimary(pathPrimary, stopCode);
  const holdSentence = foldHomeHoldSentence(stopCode, decisionType);
  const hardStopEyebrow = foldHardStopEyebrow(stopCode, decisionType);
  const hardStopParts = foldHardStopEyebrowParts(hardStopEyebrow);
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
                className="font-display text-xl font-medium italic leading-snug tracking-tight"
                style={{ color: verdictMeta.color }}
                data-home-fold-verdict=""
                data-home-verdict=""
                aria-label={verdictMeta.label}
              >
                {verdictMeta.label}
              </h1>
            ) : null}

            <p
              data-home-fold-score-plate=""
              className={latest ? "mt-4 flex flex-wrap items-baseline" : undefined}
            >
              <span
                className="score-numeral type-fold-score tabular-nums text-light"
                style={{ color: COLORS.light }}
                aria-label={scoreLabel}
                data-home-fold-score=""
              >
                {scorePct != null ? scorePct : "\u2014"}
              </span>
              {ageLine ? (
                <>
                  <span className="mx-2 text-dim" aria-hidden="true">
                    {"\u00b7"}
                  </span>
                  <span className="text-sm text-light" data-home-fold-age="">
                    {ageLine}
                  </span>
                </>
              ) : null}
            </p>

            {latest ? (
              <>
                {hardStopActive ? (
                  <div
                    className="mt-5 max-w-xl"
                    role="alert"
                    data-home-hard-stop=""
                  >
                    <p
                      className="text-sm font-medium text-light"
                      data-home-hard-stop-eyebrow=""
                    >
                      {hardStopParts.lead}
                      {hardStopParts.accent ? (
                        <span className="text-crimson">{hardStopParts.accent}</span>
                      ) : null}
                    </p>
                    {holdSentence ? (
                      <p
                        className="mt-2 text-sm leading-relaxed text-dim"
                        data-home-hard-stop-hold=""
                      >
                        {holdSentence}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <p className="mt-6">
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
                <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-dim">
                  {connectedCash ? FOLD_MONEY_CONNECTED_HEADING : FOLD_MONEY_EMPTY_HEADING}
                </p>
                {connectedCash ? (
                  <>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4" data-home-fold-cash="">
                        <span className="text-light">Liquid cash</span>
                        <span className="text-dim">{FOLD_LIQUID_CONNECTED_LABEL}</span>
                      </div>
                      <div className="flex justify-between gap-4" data-home-fold-runway="">
                        <span className="text-light">Runway</span>
                        <span className={runwayUnderOne ? "text-amber" : "text-dim"}>
                          {runwayLabel}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4" data-home-fold-flags="">
                        <span className="text-light">Flags</span>
                        <span className="text-dim">{FOLD_FLAGS_NONE_INVENTED}</span>
                      </div>
                    </div>
                    <p className="mt-3">
                      <Link
                        href={FOLD_MONEY_HREF}
                        className="text-sm text-dim underline underline-offset-2 hover:text-cyan"
                        data-home-fold-money-depth=""
                      >
                        {FOLD_MONEY_DEPTH_LABEL}
                      </Link>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-light" data-home-fold-cash-empty="">
                      {MONEY_WAIT_LINE}
                    </p>
                    <p className="mt-3">
                      <Link
                        href={FOLD_CONNECTIONS_HREF}
                        className="btn border border-cyan bg-transparent text-cyan"
                        data-home-fold-connect=""
                      >
                        {FOLD_CONNECT_ACCOUNTS_LABEL}
                      </Link>
                    </p>
                  </>
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
