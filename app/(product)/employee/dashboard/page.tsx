import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmployeeWorkspaceV4 } from "@/components/v4/employee/EmployeeWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { canAccessEmployeeHub } from "@/lib/dashboard/employee-access";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  buildEmployeeV4View,
  parseV4EmployeeVisualState,
  employeeV4VisualView,
} from "@/lib/v4/employee-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Employee",
  description:
    "Operate home — live workspace data only. Never invent teammate lists or scores.",
  robots: { index: false, follow: false },
};

/**
 * Employee v4 — V4_PENDING `/employee/dashboard` (covered by `/employee` prefix).
 * Shell v4 operate home. Empty or live SSOT. Never writes AssessmentResult.
 */
export default async function EmployeeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled()
    ? parseV4EmployeeVisualState(params.visual)
    : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <EmployeeWorkspaceV4 view={employeeV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  if (!user) return signInRedirect("/employee/dashboard");

  const supabase = await getCachedClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, employer_id")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileData as Pick<Profile, "role" | "employer_id"> | null) ?? null;

  const reading = await loadSystemV4LastRead();
  return (
    <EmployeeWorkspaceV4
      view={buildEmployeeV4View({
        reading,
        hasLiveWorkspace: canAccessEmployeeHub(profile),
      })}
    />
  );
}
