import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { ActionDock } from "@/components/operate/ActionDock";
import { OperateHeroMeta } from "@/components/operate/OperateHeroMeta";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { AssessmentRow, Organization, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Team Dashboard | HōMI",
  description: "Organization-level readiness aggregates.",
};

/**
 * /team — B2B team dashboard (marketing owns /b2b).
 * Aggregate only — no individual listing.
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

  const verdictCounts: Record<VerdictKey, number> = {
    READY: 0,
    ALMOST_THERE: 0,
    BUILD_FIRST: 0,
    NOT_YET: 0,
  };
  for (const a of assessments) {
    if (a.verdict && a.verdict in verdictCounts) {
      verdictCounts[a.verdict as VerdictKey] += 1;
    }
  }

  const waitCount = verdictCounts.BUILD_FIRST + verdictCounts.NOT_YET;
  const readyRate =
    assessments.length > 0
      ? `${Math.round((verdictCounts.READY / assessments.length) * 100)}%`
      : "—";

  return (
    <PageFrame role="team" density="compact">
      <OperateInstrument tint={COLORS.emerald}>
        <OperateHeroMeta
          title={
            <>
              {org?.name ?? "Organization"} <span className="text-aurora">readiness</span>
            </>
          }
          description="Aggregate cohort view only. Individuals are not listed."
        />
        <MetricRail
          cells={[
            {
              label: "Members",
              value: String(memberIds.length),
              footer: "In organization",
              color: COLORS.cyan,
            },
            {
              label: "Assessments",
              value: String(assessments.length),
              footer: "Completed",
              color: COLORS.emerald,
            },
            {
              label: "Wait",
              value: String(waitCount),
              footer: "BUILD FIRST + not yet",
              color: COLORS.yellow,
            },
            {
              label: "Ready rate",
              value: readyRate,
              footer: "Verdict = READY",
              color: COLORS.emerald,
            },
          ]}
        />
        <ActionDock kicker="Next move" title="Review cohort, not individuals">
          <Link href="/dashboard" className="btn btn-ghost">
            Personal dashboard
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin/organizations" className="btn btn-ghost">
              Manage organizations
            </Link>
          )}
          <Link href="/b2b" className="btn btn-ghost">
            Enterprise overview
          </Link>
        </ActionDock>
      </OperateInstrument>

      <div className="glass mt-6 p-5 sm:p-6" data-team-aggregates="">
        <div className="dash-section-head">
          <h2>Verdict distribution</h2>
          <p>Group bands only. No named individuals.</p>
        </div>
        <div className="mt-2 space-y-4">
          {(Object.keys(verdictCounts) as VerdictKey[]).map((k) => {
            const meta = VERDICT_META[k];
            const count = verdictCounts[k];
            const pct = assessments.length > 0 ? Math.round((count / assessments.length) * 100) : 0;
            return (
              <div key={k}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-light">{meta.label}</span>
                  <span className="score-numeral text-dim">
                    {count} · {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
                    }}
                  />
                </div>
              </div>
            );
          })}
          {assessments.length === 0 && (
            <p className="py-6 text-center text-sm text-dim">No team assessments yet.</p>
          )}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Aggregate metrics only. Not financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
