import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsWorkspaceV4 } from "@/components/v4/settings/SettingsWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  buildSettingsV4View,
  parseV4SettingsVisualState,
  settingsV4VisualView,
} from "@/lib/v4/settings-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account · Privacy · Billing entry only. Quarantine everything else this pass.",
  robots: { index: false, follow: false },
};

/**
 * Settings v4 — V4_PENDING `/settings`. Account · Privacy · Billing only.
 * Never writes a score. Never invents $.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4SettingsVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <SettingsWorkspaceV4 view={settingsV4VisualView(visual)} />;
  }

  const reading = await loadSystemV4LastRead();
  return <SettingsWorkspaceV4 view={buildSettingsV4View(reading)} />;
}
