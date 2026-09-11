import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContextualHomiV4 } from "@/components/v4/ask/ContextualHomiV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import {
  hardStopCodes,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import {
  buildAskV4View,
  parseV4AskVisualState,
  askV4VisualView,
} from "@/lib/v4/contextual-homi";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ask HōMI",
  description: "HōMI explains the last read and deep-links — never a second score.",
  robots: { index: false, follow: false },
};

/**
 * Contextual HōMI — V4_PENDING `/ask` in Shell v4 `main#main`.
 * Explain + deep-link only. Not a peer dashboard. Never writes a score.
 */
export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4AskVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <ContextualHomiV4 view={askV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const assessmentsR = user
    ? await supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] as AssessmentRow[], error: null };

  const latest = (assessmentsR.data ?? [])[0] ?? null;
  const stopCodes = hardStopCodes(latest?.hard_stops);

  const view = buildAskV4View(
    latest
      ? {
          decisionType: latest.decision_type ?? undefined,
          verdict: (latest.verdict as VerdictKey | null) ?? null,
          stopCode: leadingFoldHardStopCode(stopCodes),
          scoredAt: latest.completed_at ?? latest.created_at,
        }
      : null,
  );

  return <ContextualHomiV4 view={view} />;
}
