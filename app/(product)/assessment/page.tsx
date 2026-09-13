import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FullAssessmentFlow } from "@/components/assessment/FullAssessmentFlow";
import { AssessmentWalkFixtureV4 } from "@/components/v4/assessment/AssessmentWalkFixtureV4";
import { PRIMARY_CLOSE_HREF } from "@/components/marketing/first-moment-copy";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { isNextRedirectError } from "@/lib/dashboard/fold-truth";
import { parseV4AssessVisualState } from "@/lib/v4/assessment-walk";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import { getCachedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Full Assessment",
  description:
    "A calm, honest walk through Financial Reality, Emotional Truth, and Perfect Timing — your full Decision Readiness Score.",
  alternates: { canonical: "/assessment" },
};

/**
 * Account before assessment. Guests do not mount the walk or paint an official
 * score. First Moment is the guest path. Preview-only visual stills may skip
 * the session when HOMI_V4_VISUAL_FIXTURE is on.
 */
export default async function AssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4AssessVisualState(params.visual) : null;
  if (visual) {
    return <AssessmentWalkFixtureV4 state={visual} />;
  }

  try {
    const user = await getCachedUser();
    if (!user) redirect(PRIMARY_CLOSE_HREF);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(PRIMARY_CLOSE_HREF);
  }

  return <FullAssessmentFlow />;
}
