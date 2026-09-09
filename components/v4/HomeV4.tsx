import { DecisionEvidenceV4 } from "@/components/v4/home/DecisionEvidenceV4";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import { MoneyEvidenceV4 } from "@/components/v4/home/MoneyEvidenceV4";
import { NextPathV4 } from "@/components/v4/home/NextPathV4";
import { ReadinessHeroV4 } from "@/components/v4/home/ReadinessHeroV4";
import { RelevantToolsV4 } from "@/components/v4/home/RelevantToolsV4";
import { WhatChangedV4 } from "@/components/v4/home/WhatChangedV4";
import type { HomeV4View } from "@/lib/v4/home-state";

/**
 * HOME_CRAFT v4 — orchestration only.
 * Layer 1 truth stays in HomeV4View. Anatomy + craft live in the home family.
 * 1440 grid: hero | 320 HōMI, evidence | changed, then full-width support + tools.
 */
export function HomeV4({ view }: { view: HomeV4View }) {
  return (
    <div className="v4-home" data-home-v4="" data-home-state={view.hasAssessment ? "read" : "empty"}>
      <div className="v4-home-grid" data-workspace-grid="">
        <p className="v4-home-context" data-home-v4-context="">
          {view.decisionContext ?? "No decision read yet"}
        </p>

        <ReadinessHeroV4 view={view} />
        <DecisionEvidenceV4 pillars={view.pillars} />

        <div className="v4-support-pair">
          <MoneyEvidenceV4 view={view} />
          <NextPathV4 view={view} />
        </div>

        <RelevantToolsV4 tools={view.tools} />
        <HomiIntelligenceV4 decisionContext={view.decisionContext} />
        <WhatChangedV4 line={view.whatChanged} hardStopActive={view.hardStopActive} />
      </div>
    </div>
  );
}
