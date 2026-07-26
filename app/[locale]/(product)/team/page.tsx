import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { AssessmentRow, Organization, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Team Dashboard | HōMI",
  description: "Organization-level readiness aggregates.",
};

/**
 * /team — B2B team dashboard (marketing owns /b2b).
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
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .maybeSingle();
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

  let assessments: Pick<AssessmentRow, "verdict" | "overall_score">[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("assessments")
      .select("verdict, overall_score")
      .in("user_id", memberIds)
      .eq("status", "completed")
      .limit(2000);
    assessments = (data as typeof assessments | null) ?? [];
  } else if (orgId) {
    const { data } = await supabase
      .from("assessments")
      .select("verdict, overall_score")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .limit(2000);
    assessments = (data as typeof assessments | null) ?? [];
  }

  const scores = assessments
    .map((a) => a.overall_score)
    .filter((s): s is number => s != null);
  const avg =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

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

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12" data-operate-role="team" data-density="compact">
        <p className="eyebrow">Team</p>
        <h1 className="mt-1 font-display text-3xl text-light">
          {org?.name ?? "Organization"} readiness
        </h1>
        <p className="mt-2 max-w-2xl text-dim">
          Aggregate cohort view only — individuals are not listed. Scores shown as group distribution.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Members" value={String(memberIds.length)} accent="#22d3ee" footer="In organization" />
          <StatTile label="Assessments" value={String(assessments.length)} accent="#34d399" footer="Completed" />
          <StatTile label="Avg score" value={avg !== null ? String(avg) : "—"} accent="#facc15" footer="Cohort" />
          <StatTile
            label="Ready rate"
            value={
              assessments.length > 0
                ? `${Math.round((verdictCounts.READY / assessments.length) * 100)}%`
                : "—"
            }
            accent="#34d399"
            footer="Verdict = READY"
          />
        </div>

        <div className="glass mt-8 p-6">
          <SectionHeader eyebrow="Outcomes" title="Verdict distribution" />
          <div className="mt-5 space-y-4">
            {(Object.keys(verdictCounts) as VerdictKey[]).map((k) => {
              const meta = VERDICT_META[k];
              const count = verdictCounts[k];
              const pct =
                assessments.length > 0 ? Math.round((count / assessments.length) * 100) : 0;
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

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-ghost !px-4 !py-2 text-sm">
            Personal dashboard
          </Link>
          {profile.role === "admin" && (
            <Link href="/admin/organizations" className="btn btn-ghost !px-4 !py-2 text-sm">
              Manage organizations
            </Link>
          )}
          <Link href="/b2b" className="btn btn-ghost !px-4 !py-2 text-sm">
            Enterprise overview
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-dim">
          Aggregate metrics only. Not financial advice. HōMI Technologies LLC.
        </p>
      </div>
    </div>
  );
}
