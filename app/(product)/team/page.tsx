import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { OperateHeroMeta } from "@/components/operate/OperateHeroMeta";
import type { AssessmentRow, Organization, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Team Dashboard | HōMI",
  description: "Organization-level readiness aggregates.",
};

/**
 * /team — B2B team dashboard (marketing owns /b2b).
 * Aggregate only — no individual listing. Live route is /team, not /team/dashboard.
 */
export default async function TeamDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return signInRedirect("/team");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileData as Profile | null) ?? null;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Profile required"
          body="We couldn't load your profile."
          href="/auth/sign-in?next=/team"
          linkLabel="Sign in"
        />
      </div>
    );
  }

  const orgId = profile.organization_id;
  if (!orgId && profile.role !== "admin") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Enterprise team access"
          body="This dashboard is for organizations on a HōMI team plan."
          href="/b2b"
          linkLabel="Talk to enterprise sales"
        />
      </div>
    );
  }

  let org: Organization | null = null;
  if (orgId) {
    const { data } = await supabase.from("organizations").select("*").eq("id", orgId).maybeSingle();
    org = (data as Organization | null) ?? null;
  }

  let memberIds: string[] = [];
  if (orgId) {
    const { data: members } = await supabase
      .from("organization_members")
      .select("profile_id")
      .eq("organization_id", orgId);
    memberIds = ((members as { profile_id: string }[] | null) ?? []).map((r) => r.profile_id);
    if (memberIds.length === 0) {
      const { data: byOrg } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId);
      memberIds = ((byOrg as { id: string }[] | null) ?? []).map((r) => r.id);
    }
  }

  // De-identified cohort read: the security-definer function in 20260802000002 returns
  // only non-PII fields and enforces org membership server-side.
  let assessments: Pick<AssessmentRow, "verdict">[] = [];
  if (orgId) {
    const { data } = await supabase.rpc("get_org_assessment_summary", { org_id: orgId });
    assessments = (data as typeof assessments | null) ?? [];
  }

  const participation =
    memberIds.length > 0
      ? `${Math.min(100, Math.round((assessments.length / memberIds.length) * 100))}%`
      : "—";
  const pulse = assessments.length > 0 ? "Steady" : "—";

  return (
    <PageFrame role="team" density="compact">
      <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">
        Team · /team · aggregate only{org?.name ? ` · ${org.name}` : ""}
      </p>
      <OperateHeroMeta
        title="How the team is doing"
        description="Org pulse as a whole. No individual score walls. Live route is /team — not /team/dashboard."
      />
      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Members covered",
              value: String(memberIds.length),
              footer: "Headcount with access.",
            },
            {
              label: "Participation",
              value: participation,
              footer: "Aggregate · not a roster.",
            },
            {
              label: "Org pulse",
              value: pulse,
              footer: "No peer score listing.",
            },
          ]}
        />
      </div>

      <div className="dash-panel mt-6" data-team-aggregates="">
        <h2 className="text-base font-medium text-light">Privacy lock</h2>
        <p className="mt-2 text-sm text-dim">
          Team never paints individual readiness as a wall. Drill-downs that would expose peer
          scores stay out of this home. Individuals are not listed.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm text-dim">
        No employee score list here. Aggregate facts only. Personal Path stays on personal Home —
        not team primary.
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Aggregate metrics only. Not financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
