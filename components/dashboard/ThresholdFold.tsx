import type { CSSProperties } from "react";
import Link from "next/link";
import { COLORS, type VerdictKey } from "@/lib/brand";
import {
  CASH_EMPTY_LABEL,
  HOME_FOLD_INSTRUMENT,
  foldHardStopEyebrow,
  foldHardStopOverrideLine,
  foldHomeHoldSentence,
  foldRunwayLabel,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { formatCurrency } from "@/lib/tools/format";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { LoadErrorPanel } from "@/components/dashboard/LoadErrorPanel";
import { ThresholdFoldEmptyClose } from "@/components/dashboard/ThresholdFoldEmptyClose";
import { SaveStatusBanner } from "@/components/results/SaveStatusBanner";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

export type ThresholdFoldLatest = {
  id: string;
  overallScore: number | null;
};

/**
 * Signed-in first screen. The fold is the repo Threshold Compass — large,
 * one mark, last AssessmentResult only. Does not write the ledger or a score.
 * Score sits below the mark so the yellow keyhole stays visible.
 * Compass radii / yellow keyhole stay in ThresholdCompass — this file does not redraw them.
 */
export function ThresholdFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  stopCode = null,
  lastMoney,
  pathPrimary,
}: {
  assessmentsFailed: boolean;
  latest: ThresholdFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  stopCode?: FoldHardStopCode | null;
  lastMoney?: LastReadMoneyInputs | null;
  pathPrimary: FoldPathPrimary | null;
}) {
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const scoreInk = scorePct == null ? COLORS.light : COLORS.cyan;
  const liquidDollars = lastMoney?.liquidDollars;
  const connectedCash = liquidDollars != null && Number.isFinite(liquidDollars);
  const cashLabel = connectedCash ? formatCurrency(liquidDollars) : CASH_EMPTY_LABEL;
  const runwayLabel = foldRunwayLabel(lastMoney?.emergencyFundMonths);
  const shownPath = resolveFoldPathPrimary(pathPrimary, stopCode);
  const scoreLabel =
    scorePct != null
      ? `Overall Decision Readiness Score ${scorePct} out of 100`
      : "Decision Readiness Score Unknown";
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
      <div className="dash-instrument-inner flex flex-col items-center px-4 py-5 text-center sm:px-6 sm:py-6">
        {assessmentsFailed ? (
          <LoadErrorPanel
            title="Your readiness didn't load"
            body="Your assessments are safe - this is a loading hiccup on our side, not a change in your data."
          />
        ) : (
          <>
            {latest ? <SaveStatusBanner /> : null}

            <div
              className="relative mx-auto w-[min(92vw,22rem)]"
              data-home-threshold-compass=""
            >
              <ThresholdCompass
                size={352}
                className="mx-auto h-auto w-full"
                glow
                verdict={verdict ?? undefined}
              />
            </div>

            <p data-home-fold-score-plate="" className="mt-4">
              <span
                className="score-numeral text-2xl font-semibold tabular-nums sm:text-3xl"
                style={{ color: scoreInk }}
                aria-label={scoreLabel}
                data-home-fold-score=""
              >
                {scorePct != null ? scorePct : "\u2014"}
              </span>
            </p>

            {latest ? (
              <>
                <p className="mt-3 font-medium text-light" data-home-fold-runway="">
                  <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-dim">
                    Runway
                  </span>{" "}
                  <span className="score-numeral">{runwayLabel}</span>
                </p>
                <p className="mt-1 text-sm text-dim" data-home-fold-cash="">
                  {connectedCash ? (
                    <>
                      <span className="text-2xs font-semibold uppercase tracking-[0.14em]">
                        Cash
                      </span>{" "}
                      <span className="score-numeral text-light">{cashLabel}</span>
                    </>
                  ) : (
                    <span data-home-fold-cash-empty="">{CASH_EMPTY_LABEL}</span>
                  )}
                </p>

                {hardStopActive ? (
                  <div
                    className="mt-5 max-w-[22rem] text-center"
                    role="alert"
                    data-home-hard-stop=""
                  >
                    <p className="text-sm font-medium text-light" data-home-hard-stop-eyebrow="">
                      {foldHardStopEyebrow(stopCode)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-light/85" data-home-hard-stop-hold="">
                      {foldHomeHoldSentence(stopCode)}
                    </p>
                  </div>
                ) : null}

                {verdict ? (
                  <div
                    className={`flex justify-center ${hardStopActive ? "mt-3" : "mt-5"}`}
                    data-home-fold-verdict=""
                    data-home-verdict=""
                  >
                    <VerdictBadge
                      verdict={verdict}
                      size="md"
                      hideTemperature
                      className="border-0 bg-transparent px-0 py-0"
                    />
                  </div>
                ) : null}

                {hardStopActive && scorePct != null ? (
                  <p className="mt-3 max-w-[22rem] text-sm text-dim" data-home-fold-override="">
                    {foldHardStopOverrideLine(scorePct, stopCode)}
                  </p>
                ) : null}

                {shownPath ? (
                  <p className="mt-5">
                    <Link href={shownPath.href} className="btn btn-primary" data-path-fold-primary="">
                      {shownPath.title}
                    </Link>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-6">
                <ThresholdFoldEmptyClose />
              </p>
            )}

            <p className="mt-6 max-w-md text-xs leading-relaxed text-dim/80">
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
