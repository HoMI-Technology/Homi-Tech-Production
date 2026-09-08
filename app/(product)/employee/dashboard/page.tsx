import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { OperateHeroMeta } from "@/components/operate/OperateHeroMeta";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { canAccessEmployeeHub } from "@/lib/dashboard/employee-access";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import type { AssessmentRow, Organization, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Employee Benefits | HōMI",
  description: "Private employer-sponsored readiness hub.",
};

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return signInRedirect("/employee/dashboard");

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

  const hasEmployer = canAccessEmployeeHub(profile);

  if (!hasEmployer) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <AccessPanel
          title="Connect your employer benefit"
          body="This hub is for employees whose organization sponsors HōMI. Ask benefits for your access link, or use the personal dashboard."
          href="/employee"
          linkLabel="Learn about employee benefits"
        />
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
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = ((assessmentData as Pick<AssessmentRow, "id">[] | null) ?? [])[0] ?? null;

  return (
    <PageFrame role="employee" density="compact">
      <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">
        Employee · /employee/dashboard
      </p>
      <OperateInstrument tint="transparent">
        <OperateHeroMeta
          title={
            <>
              Employee readiness for{" "}
              <span className="text-aurora">{org?.name ?? "your employer"}</span>
            </>
          }
          description="Your employer never sees a personal score. Privacy stays on. Operate chrome — not a second personal Home."
        />

        {latest ? (
          <Link href="/path" className="btn btn-ghost">
            Path to Ready
          </Link>
        ) : (
          <EmptyState
            tone="operate"
            title="One private measurement and this hub comes alive"
            body="Your employer sponsors the instrument. Only you see the reading — on personal Home, not here."
            actionHref="/assessment"
            actionLabel="Assess"
          />
        )}
      </OperateInstrument>

      <div className="mt-5 grid gap-3 sm:grid-cols-2" data-employee-privacy="">
        <div className="dash-panel">
          <h3>What your employer sees</h3>
          <p className="mt-2 text-sm text-dim">
            Participation and program fit only. No personal verdict. No peer score listing.
          </p>
        </div>
        <div className="dash-panel">
          <h3>What stays yours</h3>
          <p className="mt-2 text-sm text-dim">
            Assessment detail, Path, and money reality stay on your personal Home — not here.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <MetricRail
          cells={[
            {
              label: "Org coverage",
              value: "—",
              footer: "Aggregate only",
            },
            {
              label: "Benefits open",
              value: org ? "1" : "—",
              footer: "Employer-sponsored",
            },
            {
              label: "Your score here",
              value: "—",
              footer: "Personal Home only",
            },
          ]}
        />
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Decision-support benefit. Not medical or financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
