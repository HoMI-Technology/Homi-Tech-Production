import Link from "next/link";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  HOME_FOLD_INSTRUMENT,
  foldRunwayLabel,
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
 */
export function ThresholdFold({
  assessmentsFailed,
  latest,
  verdict,
  stopMessages,
  lastMoney,
  pathPrimary,
}: {
  assessmentsFailed: boolean;
  latest: ThresholdFoldLatest | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  lastMoney?: LastReadMoneyInputs | null;
  pathPrimary: FoldPathPrimary | null;
}) {
  const scorePct =
    latest?.overallScore != null ? Math.round(latest.overallScore) : null;
  const hardStopActive = stopMessages.length > 0;
  const instrumentTint = hardStopActive
    ? COLORS.crimson
    : verdict
      ? VERDICT_META[verdict].color
      : COLORS.yellow;
  const runwayLabel = foldRunwayLabel(lastMoney?.emergencyFundMonths);
  const cashLabel =
    lastMoney?.liquidDollars != null && Number.isFinite(lastMoney.liquidDollars)
      ? formatCurrency(lastMoney.liquidDollars)
      : "—";
  const scoreLabel =
    scorePct != null
      ? `Overall Decision Readiness Score ${scorePct} out of 100`
      : "Decision Readiness Score Unknown";

  return (
    <div
      className="dash-instrument"
      data-home-fold=""
      data-threshold-fold=""
      data-home-instrument={latest ? HOME_FOLD_INSTRUMENT : "empty"}
      data-hard-stop={hardStopActive ? "1" : "0"}
    >
      <div className="dash-instrument-inner flex flex-col items-center px-5 py-8 text-center sm:px-7 sm:py-10 lg:px-8">
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
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span
                  className="score-numeral text-5xl font-semibold tabular-nums sm:text-6xl"
                  style={{
                    color: instrumentTint,
                    textShadow: `0 0 28px ${instrumentTint}55`,
                  }}
                  aria-label={scoreLabel}
                  data-home-fold-score=""
                >
                  {scorePct != null ? scorePct : "—"}
                </span>
              </div>
            </div>

            {latest ? (
              <>
                <p
                  className="mt-5 font-medium text-light"
                  data-home-fold-runway=""
                >
                  <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-dim">
                    Runway
                  </span>{" "}
                  <span className="score-numeral">{runwayLabel}</span>
                </p>
                <p className="mt-1 text-sm text-dim" data-home-fold-cash="">
                  <span className="text-2xs font-semibold uppercase tracking-[0.14em]">
                    Cash
                  </span>{" "}
                  <span className="score-numeral text-light">{cashLabel}</span>
                </p>

                {hardStopActive ? (
                  <p
                    className="eyebrow mt-6 text-crimson"
                    role="alert"
                    data-home-hard-stop=""
                  >
                    Hard stop · {stopMessages[0]}
                  </p>
                ) : null}

                {verdict ? (
                  <div
                    className={`flex justify-center ${hardStopActive ? "mt-3" : "mt-6"}`}
                    data-home-fold-verdict=""
                    data-home-verdict=""
                  >
                    <VerdictBadge
                      verdict={verdict}
                      size="md"
                      hideTemperature={false}
                      className="border-0 bg-transparent px-0 py-0"
                    />
                  </div>
                ) : null}

                {pathPrimary ? (
                  <p className="mt-8">
                    <Link
                      href={pathPrimary.href}
                      className="btn btn-primary"
                      data-path-fold-primary=""
                    >
                      {pathPrimary.title}
                    </Link>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="mt-8">
                <ThresholdFoldEmptyClose />
              </p>
            )}

            <p className="mt-8 max-w-xl text-xs leading-relaxed text-dim/80">
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
