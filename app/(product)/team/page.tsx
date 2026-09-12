import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamWorkspaceV4 } from "@/components/v4/team/TeamWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import {
  buildTeamV4View,
  parseV4TeamVisualState,
  teamV4VisualView,
  type TeamV4Source,
} from "@/lib/v4/team-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { AssessmentRow, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Organization-level readiness aggregates only. Live route is /team — not /team/dashboard.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Team v4 — V4_PENDING `/team` only.
 * Team · aggregate only. Shell v4 org viewer. No individual score walls.
 * Preview-only fixtures. Live SSOT — never invent $.
 */
export default async function TeamDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled()
    ? parseV4TeamVisualState(params.visual)
    : null;

  if (visual) {
    return <TeamWorkspaceV4 view={teamV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  if (!user) return signInRedirect("/team");

  const supabase = await getCachedClient();

  let profile: Profile | null = null;
  try {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = (profileData as Profile | null) ?? null;
  } catch {
    return <TeamWorkspaceV4 view={buildTeamV4View({ ...emptySource(), fetchFailed: true })} />;
  }

  const orgId = profile?.organization_id ?? null;
  if (!orgId) {
    return <TeamWorkspaceV4 view={buildTeamV4View(emptySource())} />;
  }

  const source = await loadTeamV4Source(orgId);
  return <TeamWorkspaceV4 view={buildTeamV4View(source)} />;
}

function emptySource(): TeamV4Source {
  return {
    orgConnected: false,
    memberCount: 0,
    assessmentCount: 0,
    fetchFailed: false,
  };
}

async function loadTeamV4Source(orgId: string): Promise<TeamV4Source> {
  const supabase = await getCachedClient();
  try {
    let memberIds: string[] = [];
    const { data: members, error: memberError } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", orgId);
    if (memberError) {
      return { orgConnected: true, memberCount: 0, assessmentCount: 0, fetchFailed: true };
    }
    memberIds = ((members as { profile_id: string }[] | null) ?? []).map((r) => r.profile_id);
    if (memberIds.length === 0) {
      const { data: byOrg, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId);
      if (profileError) {
        return { orgConnected: true, memberCount: 0, assessmentCount: 0, fetchFailed: true };
      }
      memberIds = ((byOrg as { id: string }[] | null) ?? []).map((r) => r.id);
    }

    const { data, error: summaryError } = await supabase.rpc("get_org_assessment_summary", {
      org_id: orgId,
    });
    if (summaryError) {
      return { orgConnected: true, memberCount: 0, assessmentCount: 0, fetchFailed: true };
    }
    const assessments = (data as Pick<AssessmentRow, "verdict">[] | null) ?? [];

    return {
      orgConnected: true,
      memberCount: memberIds.length,
      assessmentCount: assessments.length,
      fetchFailed: false,
    };
  } catch {
    return { orgConnected: true, memberCount: 0, assessmentCount: 0, fetchFailed: true };
  }
}
