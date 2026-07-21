import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { AssessmentRow, Organization, Profile } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Employee Benefits | HōMI",
  description: "Employer-sponsored readiness hub.",
};

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in?next=/employee/dashboard");

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
          href="/auth/sign-in?next=/employee/dashboard"
          linkLabel="Sign in"
        />
      </div>
    );
  }

  const hasEmployer =
    Boolean(profile.employer_id) || profile.role === "employee" || profile.role === "admin";

  if (!hasEmployer) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Connect your employer benefit"
          body="This hub is for employees whose organization sponsors HōMI. Ask benefits to link your account, or use the personal dashboard."
          href="/employee"
          linkLabel="Learn about employee benefits"
        />
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="btn btn-ghost text-sm">
            Personal dashboard
          </Link>
        </div>
      </div>
    );
  }

  let org: Organization | null = null;
  if (profile.employer_id) {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.employer_id)
      .maybeSingle();
    org = (data as Organization | null) ?? null;
  }

  const { data: assessmentData } = await supabase
    .from("assessments")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);
  const assessments = (assessmentData as AssessmentRow[] | null) ?? [];
  const latest = assessments[0] ?? null;

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow">Benefits</p>
        <h1 className="mt-1 font-display text-3xl text-light">
          {org ? `${org.name} benefits` : "Employee readiness hub"}
        </h1>
        <p className="mt-2 max-w-2xl text-dim">
          Private workspace through your employer. Employers see only de-identified aggregates when reporting is enabled.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatTile
            label="Your score"
            value={latest?.overall_score != null ? String(Math.round(latest.overall_score)) : "—"}
            accent="#22d3ee"
            footer="Latest assessment"
          />
          <StatTile label="Assessments" value={String(assessments.length)} accent="#34d399" footer="Completed" />
          <StatTile label="Plan" value={profile.subscription_tier} accent="#facc15" footer="Subscription tier" />
        </div>

        {latest ? (
          <div className="glass mt-8 p-6">
            <SectionHeader eyebrow="Latest" title="Your readiness" />
            <div className="mt-4 flex flex-wrap items-center gap-4">
              {latest.verdict && <VerdictBadge verdict={latest.verdict as VerdictKey} size="lg" />}
              <p className="text-sm text-dim">
                Measured{" "}
                {new Date(latest.completed_at ?? latest.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/assessment" className="btn btn-primary !px-4 !py-2 text-sm">
                Retake assessment
              </Link>
              <Link href="/advisor" className="btn btn-ghost !px-4 !py-2 text-sm">
                Talk to companion
              </Link>
              <Link href="/employee/portal" className="btn btn-ghost !px-4 !py-2 text-sm">
                Full portal
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass mt-8 p-8 text-center">
            <h2 className="font-display text-xl text-light">Get your first readiness read</h2>
            <p className="mt-2 text-sm text-dim">Your benefit covers the full assessment and tools.</p>
            <Link href="/assessment" className="btn btn-primary mt-6">
              Start assessment
            </Link>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-dim">
          Decision-support software — not financial, legal, or tax advice. HōMI Technologies LLC.
        </p>
      </div>
    </div>
  );
}
