import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { AssessmentRow, Profile } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partner Dashboard | HōMI",
  description: "Referred clients and aggregate readiness.",
};

/**
 * /partner/dashboard — product surface (marketing owns /partner).
 * Access: role partner|admin. Clients: profiles.partner_id = me, or
 * assessments.referral_source / attribution.ref tagged to partner.
 */
export default async function PartnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return signInRedirect("/partner/dashboard");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const profile = (profileData as Profile | null) ?? null;

  if (!profile || (profile.role !== "partner" && profile.role !== "admin")) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Partner access required"
          body="This dashboard is for HōMI partners. Apply to the partner program or request an account upgrade."
          href="/partner"
          linkLabel="Learn about the partner program"
        />
      </div>
    );
  }

  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const clients =
    (clientRows as Pick<Profile, "id" | "full_name" | "created_at">[] | null) ?? [];
  const clientIds = clients.map((c) => c.id);

  let assessments: Pick<
    AssessmentRow,
    "id" | "user_id" | "verdict" | "overall_score" | "completed_at" | "created_at"
  >[] = [];

  if (clientIds.length > 0) {
    const { data } = await supabase
      .from("assessments")
      .select("id, user_id, verdict, overall_score, completed_at, created_at")
      .in("user_id", clientIds)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);
    assessments = (data as typeof assessments | null) ?? [];
  }

  // referral_source = partner profile id
  const { data: referred } = await supabase
    .from("assessments")
    .select("id, user_id, verdict, overall_score, completed_at, created_at")
    .eq("referral_source", user.id)
    .eq("status", "completed")
    .limit(50);
  const seen = new Set(assessments.map((a) => a.id));
  for (const r of (referred as typeof assessments | null) ?? []) {
    if (!seen.has(r.id)) assessments.push(r);
  }

  const scores = assessments
    .map((a) => a.overall_score)
    .filter((s): s is number => s != null);
  const avg =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const readyCount = assessments.filter((a) => a.verdict === "READY").length;

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow">Partner</p>
        <h1 className="mt-1 font-display text-3xl text-light">Partner dashboard</h1>
        <p className="mt-2 max-w-2xl text-dim">
          Aggregate readiness for referred clients. Individual emails stay private.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Clients" value={String(clients.length)} accent="#22d3ee" footer="Linked via partner_id" />
          <StatTile label="Assessments" value={String(assessments.length)} accent="#34d399" footer="Completed" />
          <StatTile label="Avg score" value={avg !== null ? String(avg) : "—"} accent="#facc15" footer="Cohort" />
          <StatTile label="Ready" value={String(readyCount)} accent="#34d399" footer="Verdict = READY" />
        </div>

        <div className="glass mt-8 p-6">
          <SectionHeader
            eyebrow="Pipeline"
            title="Recent client readiness"
            action={
              <Link href="/partner/portal" className="btn btn-ghost !px-3 !py-1.5 text-xs">
                Portal resources
              </Link>
            }
          />
          {assessments.length === 0 ? (
            <p className="mt-6 py-8 text-center text-sm text-dim">
              No client assessments yet. Share your invite link from the partner portal.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="table-premium min-w-[520px]">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Score</th>
                    <th>Verdict</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.slice(0, 20).map((a) => {
                    const client = clients.find((c) => c.id === a.user_id);
                    return (
                      <tr key={a.id}>
                        <td className="text-sm text-light">
                          {client?.full_name || "Client"}
                          <span className="ml-2 font-mono text-[0.625rem] text-dim">
                            {a.user_id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="score-numeral text-dim">
                          {a.overall_score != null ? Math.round(a.overall_score) : "—"}
                        </td>
                        <td>
                          {a.verdict ? (
                            <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="text-xs text-dim">
                          {new Date(a.completed_at ?? a.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-dim">
          Decision-support for clients — not financial advice. HōMI Technologies LLC.
        </p>
      </div>
    </div>
  );
}
