import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { COLORS, type VerdictKey } from "@/lib/brand";
import { V4_SHELL_ASSESS_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { ReadinessGaugeV4 } from "@/components/v4/home/ReadinessGaugeV4";
import { foldHoldClose, foldHoldLead } from "@/lib/dashboard/fold-truth";
import {
  HOME_V4_EMPTY_FOLLOW,
  HOME_V4_EMPTY_HOLD,
  HOME_V4_PATH_CTA,
  type HomeV4View,
} from "@/lib/v4/home-state";

function verdictTone(key: VerdictKey | null, hardStopActive: boolean): string {
  if (hardStopActive) return COLORS.crimson;
  if (!key) return COLORS.light;
  switch (key) {
    case "READY":
      return COLORS.emerald;
    case "ALMOST_THERE":
      return COLORS.yellow;
    case "BUILD_FIRST":
      return COLORS.amber;
    case "NOT_YET":
      return COLORS.crimson;
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function primaryCtaLabel(view: HomeV4View): string {
  if (!view.hasAssessment) return "Assess";
  if (view.pathPrimary?.title === HOME_V4_PATH_CTA) return HOME_V4_PATH_CTA;
  return view.pathPrimary?.title ?? "Assess";
}

export function ReadinessHeroV4({ view }: { view: HomeV4View }) {
  const scoreLabel =
    view.scorePct != null
      ? `Overall Decision Readiness Score ${view.scorePct} out of 100`
      : "Decision Readiness Score unknown";
  const holdLead = view.holdSentence ? foldHoldLead(view.holdSentence) : null;
  const holdClose = view.holdSentence ? foldHoldClose(view.holdSentence) : null;
  const humanLine = view.hardStopActive
    ? holdLead ?? "Hold this decision."
    : view.diagnosticSentence ?? "One read. One next move.";
  const primaryHref = view.pathPrimary ? V4_SHELL_PATH_HREF : V4_SHELL_ASSESS_HREF;
  const primaryLabel = primaryCtaLabel(view);
  const verdictColor = verdictTone(view.verdictKey, view.hardStopActive);

  return (
    <section className="v4-hero" data-home-v4-readiness="" aria-label="Readiness">
      <ReadinessGaugeV4
        scorePct={view.scorePct}
        scoreAge={view.scoreAge}
        scoreLabel={scoreLabel}
      />

      <div className="v4-hero-narrative">
        {view.hasAssessment ? (
          <>
            {view.verdictLabel ? (
              <p
                className="v4-hero-verdict"
                data-home-v4-verdict=""
                style={{ color: verdictColor }}
              >
                {view.verdictLabel}
              </p>
            ) : null}

            {view.hardStopActive ? (
              <div role="alert" data-home-v4-hard-stop="">
                {view.hardStopEyebrow ? (
                  <p className="v4-hero-stop-eyebrow">{view.hardStopEyebrow}</p>
                ) : null}
                <p className="v4-hero-runway" data-home-v4-runway="">
                  Runway {view.runwayLabel}
                </p>
              </div>
            ) : null}

            <p className="v4-hero-hold" data-home-v4-hold="">
              {humanLine}
            </p>
            {view.hardStopActive && holdClose ? (
              <p className="v4-hero-hold-close">{holdClose}</p>
            ) : null}

            <div className="v4-hero-actions">
              <Link
                href={primaryHref}
                className="btn btn-primary v4-hero-primary"
                data-home-v4-path-cta=""
              >
                {primaryLabel}
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          </>
        ) : (
          <div data-home-v4-empty="">
            <p className="v4-hero-hold">{HOME_V4_EMPTY_HOLD}</p>
            <p className="v4-hero-hold-close">{HOME_V4_EMPTY_FOLLOW}</p>
            <div className="v4-hero-actions">
              <Link
                href={V4_SHELL_ASSESS_HREF}
                className="btn btn-primary v4-hero-primary"
                data-home-v4-assess=""
              >
                Assess
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
