import { SectionHeader } from "@/components/ui/SectionHeader";
import { SundayScorecardClient } from "@/components/admin/SundayScorecardClient";
import type { ScorecardMetrics } from "@/lib/admin/marketing-agency";

export type SundayScorecardProps = ScorecardMetrics & {
  /** True when ANTHROPIC_API_KEY is configured (hasAnthropic() on the server). */
  aiEnabled: boolean;
};

/**
 * Sunday scoreboard, assembled from numbers the page has already queried.
 *
 * A server shell around one small client island: the metrics are props, not a
 * second round of fetches, and only the button that assembles and copies the
 * markdown needs to run in the browser.
 */
export function SundayScorecard({ aiEnabled, ...metrics }: SundayScorecardProps) {
  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Sunday scorecard"
        subtitle="This week's numbers as pasteable markdown. Wins, blockers and focus stay hand-written."
      />
      <SundayScorecardClient metrics={metrics} aiEnabled={aiEnabled} />
    </div>
  );
}
