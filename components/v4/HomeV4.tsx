import { DecisionEvidenceV4 } from "@/components/v4/home/DecisionEvidenceV4";
import { HomiIntelligenceV4 } from "@/components/v4/home/HomiIntelligenceV4";
import { MoneyEvidenceV4 } from "@/components/v4/home/MoneyEvidenceV4";
import { ReadinessHeroV4 } from "@/components/v4/home/ReadinessHeroV4";
import { ASK_V4_PROMPTS, V4_ASK_PLACEHOLDER_FIELD } from "@/lib/v4/contextual-homi";
import type { HomeV4View } from "@/lib/v4/home-state";

/**
 * One fold. Empty = one job. After a read = verdict + one next move.
 * Path CTA lives on the hero. Empty tools / “what changed = age” stay off.
 */
export function HomeV4({ view }: { view: HomeV4View }) {
  const empty = !view.hasAssessment;

  return (
    <div className="v4-home" data-home-v4="" data-home-state={empty ? "empty" : "read"}>
      <div className="v4-home-grid" data-workspace-grid="">
        {empty ? null : (
          <p className="v4-home-context" data-home-v4-context="">
            {view.decisionContext ?? "This decision"}
          </p>
        )}

        <ReadinessHeroV4 view={view} />

        {empty ? null : <DecisionEvidenceV4 pillars={view.pillars} />}

        {empty ? null : (
          <div className="v4-support-pair">
            <MoneyEvidenceV4 view={view} />
          </div>
        )}

        <HomiIntelligenceV4
          decisionContext={view.decisionContext}
          commandLabel={view.decisionContext}
          prompts={
            empty
              ? ASK_V4_PROMPTS.empty
              : view.hardStopActive
                ? ASK_V4_PROMPTS["hard-stop"]
                : ASK_V4_PROMPTS.default
          }
          askPlaceholder={V4_ASK_PLACEHOLDER_FIELD}
        />
      </div>
    </div>
  );
}
