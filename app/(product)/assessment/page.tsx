import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FullAssessmentFlow } from "@/components/assessment/FullAssessmentFlow";
import { PRIMARY_CLOSE_HREF } from "@/components/marketing/first-moment-copy";
import { isNextRedirectError } from "@/lib/dashboard/fold-truth";
import { getCachedUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Full Assessment",
  description:
    "A calm, honest walk through Financial Reality, Emotional Truth, and Perfect Timing — your full Decision Readiness Score.",
  alternates: { canonical: "/assessment" },
};

/**
 * Account before assessment. Guests do not mount the 45-q or paint /results.
 * First Moment is the guest path. Middleware leaves this route public on
 * purpose — a protected-route bounce would skip First Moment and land on
 * sign-in. Signed-in users still render the flow.
 */
export default async function AssessmentPage() {
  try {
    const user = await getCachedUser();
    if (!user) redirect(PRIMARY_CLOSE_HREF);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    redirect(PRIMARY_CLOSE_HREF);
  }

  return <FullAssessmentFlow />;
}
