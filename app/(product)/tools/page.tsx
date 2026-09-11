import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { ToolsWorkspaceV4 } from "@/components/v4/tools/ToolsWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  buildToolsV4View,
  parseV4ToolsVisualState,
  toolsV4VisualView,
} from "@/lib/v4/tools-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Answer one math question at a time — honest educational lenses. Estimates never write your official score. Educational estimates — they do not write your score or ledger. They do not provide financial, tax, mortgage, or investment advice.",
  robots: { index: false, follow: false },
};

/**
 * Tools v4 hub — V4_PENDING `/tools`. Ten-hub REUSE. Never a verdict factory.
 * Guest Assess close stays PRIMARY_CLOSE_HREF / PRIMARY_CLOSE_LABEL (First Moment).
 */
export default async function ToolsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4ToolsVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  const view = visual ? toolsV4VisualView(visual) : buildToolsV4View(await loadSystemV4LastRead());

  return (
    <>
      <Link href={PRIMARY_CLOSE_HREF} className="sr-only">
        {PRIMARY_CLOSE_LABEL}
      </Link>
      <ToolsWorkspaceV4 view={view} />
    </>
  );
}
