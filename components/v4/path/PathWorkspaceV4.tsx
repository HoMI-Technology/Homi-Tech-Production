"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { COLORS } from "@/lib/brand";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import { useAssessmentWalkChrome } from "@/components/v4/assessment/AssessmentWalkChrome";
import {
  V4_ASK_PLACEHOLDER_PATH,
  V4_ASK_PLACEHOLDER_DEFAULT,
} from "@/lib/v4/assessment-walk";
import {
  PATH_V4_EMPTY_BODY,
  PATH_V4_EMPTY_TITLE,
  V4_PATH_ASSESS_HREF,
  type PathV4Step,
  type PathV4View,
} from "@/lib/v4/path-workspace";

function StepCta({ step }: { step: PathV4Step }) {
  if (!step.cta) {
    return (
      <span className="v4-path-cta-empty" aria-hidden>
        —
      </span>
    );
  }
  if (step.ctaEmphasis === "primary") {
    return (
      <Link href={step.cta.href} className="btn btn-primary v4-path-open" data-path-v4-cta="">
        {step.cta.label}
        <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.75} />
      </Link>
    );
  }
  return (
    <Link href={step.cta.href} className="v4-path-assess" data-path-v4-cta="">
      {step.cta.label}
    </Link>
  );
}

export function PathWorkspaceV4({ view }: { view: PathV4View }) {
  const { setChrome } = useAssessmentWalkChrome();

  useEffect(() => {
    setChrome({
      commandLabel: view.decisionContext,
      askPlaceholder: V4_ASK_PLACEHOLDER_PATH,
    });
    return () =>
      setChrome({
        commandLabel: null,
        askPlaceholder: V4_ASK_PLACEHOLDER_DEFAULT,
      });
  }, [setChrome, view.decisionContext]);

  return (
    <div className="v4-path" data-path-v4="" data-path-v4-kind={view.kind}>
      <div className="v4-path-grid" data-path-v4-grid="">
        <div className="v4-path-main">
          {view.kind === "empty" ? (
            <section data-path-v4-empty="">
              <h1 className="v4-path-title">{PATH_V4_EMPTY_TITLE}</h1>
              <p className="v4-path-body">{PATH_V4_EMPTY_BODY}</p>
              <div className="v4-path-actions">
                <Link
                  href={V4_PATH_ASSESS_HREF}
                  className="btn btn-primary v4-hero-primary"
                  data-path-v4-assess=""
                >
                  Assess
                  <ArrowRight aria-hidden className="size-4" strokeWidth={1.75} />
                </Link>
              </div>
            </section>
          ) : (
            <section
              data-path-v4-list=""
              aria-label="Path"
              data-path-v4-hard-stop={view.hardStopActive ? "" : undefined}
            >
              {view.verdictLabel ? (
                <p
                  className="v4-hero-verdict"
                  data-path-v4-verdict=""
                  style={{
                    color: view.hardStopActive ? COLORS.crimson : COLORS.emerald,
                    borderColor: view.hardStopActive ? COLORS.crimson : COLORS.emerald,
                  }}
                >
                  {view.verdictLabel}
                </p>
              ) : null}
              {view.holdLead ? <h1 className="v4-path-title">{view.holdLead}</h1> : null}
              {!view.holdLead && view.steps[0] ? (
                <h1 className="v4-path-title">{view.steps[0].title}</h1>
              ) : null}
              {view.holdMeta ? <p className="v4-path-meta">{view.holdMeta}</p> : null}

              <ol className="v4-path-steps" aria-label="Path steps">
                {view.steps.map((step, index) => (
                  <li key={step.id} className="v4-path-step" data-path-v4-step={step.status}>
                    <span className="v4-path-index" aria-hidden>
                      {index + 1}
                    </span>
                    <div className="v4-path-step-copy">
                      <p className="v4-path-step-title">{step.title}</p>
                      <p className="v4-path-step-follow">{step.follow}</p>
                    </div>
                    <StepCta step={step} />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <HomiIntelligenceV4
          surface="path"
          showContext={false}
          commandLabel={view.decisionContext}
          prompts={view.prompts}
          askPlaceholder={V4_ASK_PLACEHOLDER_PATH}
        />
      </div>
    </div>
  );
}
