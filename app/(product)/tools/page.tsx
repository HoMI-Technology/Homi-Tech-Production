import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
    "Approved hub lenses. Educational estimates — they do not write your score or ledger.",
  robots: { index: false, follow: false },
};

/**
 * Tools v4 hub — V4_PENDING `/tools`. Ten-hub REUSE. Never a verdict factory.
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

  if (visual) {
    return <ToolsWorkspaceV4 view={toolsV4VisualView(visual)} />;
  }

  const reading = await loadSystemV4LastRead();
  return <ToolsWorkspaceV4 view={buildToolsV4View(reading)} />;
}
