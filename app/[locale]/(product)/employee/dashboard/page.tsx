import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { canAccessEmployeeHub } from "@/lib/dashboard/employee-access";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
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
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const verdictMeta = verdict ? VERDICT_META[verdict] : null;

  return (
    <PageFrame role="employee" density="comfortable">
      <PageHeader
        eyebrow="Benefits"
        title={org ? `${org.name} benefits` : "Employee readiness hub"}
        description="Private workspace through your employer. Only you see individual scores and answers."
        badge={
          <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
            Private
          </span>
        }
        primaryAction={
          latest
            ? { label: "Personal dashboard", href: "/dashboard", variant: "ghost" }
            : { label: "Get your Shadow Score", href: "/shadow-score" }
        }
        secondaryAction={
          latest
            ? { label: "Retake assessment", href: "/assessment", variant: "ghost" }
            : { label: "Full assessment", href: "/assessment", variant: "ghost" }
        }
      />

      {/* Privacy boundary instrument */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="glass p-5">
          <p className="eyebrow text-emerald">You see</p>
          <ul className="mt-3 space-y-2 text-sm text-dim">
            <li className="text-light">Your score, verdict, and pillar breakdown</li>
            <li>Assessment answers and Companion conversations</li>
            <li>Tools, journal, and personal plan</li>
          </ul>
        </div>
        <div className="glass p-5">
          <p className="eyebrow">Employer may see</p>
          <ul className="mt-3 space-y-2 text-sm text-dim">
            <li className="text-light">Participation and de-identified cohort bands</li>
            <li>Never your individual score by name</li>
            <li>Never your answers or chat content</li>
          </ul>
        </div>
      </div>

      {latest && verdictMeta ? (
        <div
          className="glass mt-8 p-6 sm:p-8"
          style={{ ["--field-tint" as string]: `${verdictMeta.color}12` }}
        >
          <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex justify-center">
              <ThresholdCompass size={150} verdict={verdict ?? undefined} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-dim">
                Your private HōMI-Score
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <HeroScore
                  value={Math.round(latest.overall_score ?? 0)}
                  color={verdictMeta.color}
                />
                {verdict && <VerdictBadge verdict={verdict} size="lg" />}
              </div>
              <p className="mt-3 max-w-xl text-sm text-dim">{verdictMeta.line}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard" className="btn btn-primary">
                  Open full personal home
                </Link>
                <Link href="/advisor" className="btn btn-ghost">
                  Talk to the Companion
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass mt-8 p-10">
          <EmptyState
            title="One private measurement and this hub comes alive"
            body="Your employer sponsors the instrument. Only you see the reading. Start with a Shadow Score or the full assessment."
            actionHref="/shadow-score"
            actionLabel="Get your Shadow Score"
            secondaryHref="/assessment"
            secondaryLabel="Full assessment"
          />
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          label="Your score"
          value={
            latest?.overall_score != null ? String(Math.round(latest.overall_score)) : "—"
          }
          accent="#22d3ee"
          footer="Private to you"
        />
        <StatTile
          label="Assessments"
          value={String(assessments.length)}
          accent="#34d399"
          footer="Completed reads"
        />
        <StatTile
          label="Benefit"
          value={org?.name ? "Active" : "Linked"}
          accent="#facc15"
          footer="Employer-sponsored access"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/assessment", title: "Assessment", body: "Three-pillar readiness read" },
          { href: "/tools", title: "Tools", body: "Calculators for money decisions" },
          { href: "/advisor", title: "Companion", body: "Private coaching chat" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="glass glass-hover block p-5 transition-colors"
          >
            <SectionHeader eyebrow="Action" title={card.title} />
            <p className="mt-2 text-sm text-dim">{card.body}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Decision-support benefit — not medical or financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
