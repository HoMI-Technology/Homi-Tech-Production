import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LearnWorkspaceV4 } from "@/components/v4/learn/LearnWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  buildLearnV4View,
  parseV4LearnVisualState,
  learnV4VisualView,
} from "@/lib/v4/learn-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";

export const metadata: Metadata = {
  title: "Learn",
  description: "In-app Learn is an empty shell. Public guides stay on the live /guides route.",
  alternates: { canonical: "/learn" },
  robots: { index: false, follow: false },
};

/**
 * Learn v4 — V4_PENDING `/learn`. Empty or live public-guide catalog.
 * Never invent curriculum SKUs.
 */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4LearnVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <LearnWorkspaceV4 view={learnV4VisualView(visual)} />;
  }

  const reading = await loadSystemV4LastRead();
  return <LearnWorkspaceV4 view={buildLearnV4View(reading)} />;
}
