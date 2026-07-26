import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import {
  ActionDock,
  OperateHeroMeta,
  OperateInstrument,
} from "@/components/operate/OperateInstrument";
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
  const tint = verdictMeta?.color ?? "#22d3ee";
  const scorePct = latest?.overall_score != null ? Math.round(latest.overall_score) : null;

  return (
    <PageFrame role="employee" density="compact">
      <OperateInstrument tint={tint}>
        <OperateHeroMeta
          title={
            <>
              {org ? (
                <>
                  {org.name} <span className="text-aurora">benefits</span>
                </>
              ) : (
                <>
                  Employee <span className="text-aurora">readiness</span>
                </>
              )}
            </>
          }
          description="Private through your employer. Only you see individual scores and answers."
        />

        {latest && verdictMeta ? (
          <>
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,160px)_1fr] lg:gap-10">
              <div className="flex justify-center lg:justify-start">
                <ThresholdCompass size={148} verdict={verdict ?? undefined} />
              </div>
              <div className="min-w-0 text-center lg:text-left">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-dim">
                  Private HōMI-Score
                </p>
                <div className="mt-1.5 flex flex-wrap items-end justify-center gap-3 lg:justify-start">
                  <HeroScore value={scorePct ?? 0} color={tint} />
                  {verdict && <div className="mb-1.5"><VerdictBadge verdict={verdict} size="lg" /></div>}
                </div>
                <p className="mt-2.5 max-w-xl text-sm text-light/90">{verdictMeta.line}</p>
              </div>
            </div>
            <ActionDock kicker="Next move" title="Open your full personal home">
              <Link href="/dashboard" className="btn btn-primary">
                Personal dashboard
              </Link>
              <Link href="/advisor" className="btn btn-ghost">
                Companion
              </Link>
            </ActionDock>
          </>
        ) : (
          <EmptyState
            title="One private measurement and this hub comes alive"
            body="Your employer sponsors the instrument. Only you see the reading."
            actionHref="/shadow-score"
            actionLabel="Get your Shadow Score"
            secondaryHref="/assessment"
            secondaryLabel="Full assessment"
          />
        )}
      </OperateInstrument>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="dash-panel">
          <h3 className="text-emerald">You see</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-dim">
            <li className="text-light">Your score, verdict, and pillars</li>
            <li>Answers and Companion conversations</li>
            <li>Tools, journal, and personal plan</li>
          </ul>
        </div>
        <div className="dash-panel">
          <h3>Employer may see</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-dim">
            <li className="text-light">Participation and de-identified bands</li>
            <li>Never your score by name</li>
            <li>Never answers or chat content</li>
          </ul>
        </div>
      </div>

      <div className="mt-5">
        <MetricRail
          cells={[
            {
              label: "Your score",
              value: scorePct != null ? String(scorePct) : "—",
              footer: "Private to you",
              color: tint,
            },
            {
              label: "Assessments",
              value: String(assessments.length),
              footer: "Completed reads",
              color: "#34d399",
            },
            {
              label: "Benefit",
              value: org?.name ? "Active" : "Linked",
              footer: "Employer-sponsored",
              color: "#facc15",
            },
          ]}
        />
      </div>

      {latest && (
        <div className="mt-5">
          <div className="dash-section-head">
            <h2>Three pillars</h2>
            <p>Private to you. Your employer never sees these numbers by name.</p>
          </div>
          <div className="dash-rail">
            <div className="dash-rail-cell">
              <p className="dash-rail-label">Financial</p>
              <p className="dash-rail-value" style={{ color: "#22d3ee" }}>
                {latest.financial_score != null ? Math.round(latest.financial_score) : "—"}
              </p>
              <p className="dash-rail-footer">Reality</p>
            </div>
            <div className="dash-rail-cell">
              <p className="dash-rail-label">Emotional</p>
              <p className="dash-rail-value" style={{ color: "#34d399" }}>
                {latest.emotional_score != null ? Math.round(latest.emotional_score) : "—"}
              </p>
              <p className="dash-rail-footer">Truth</p>
            </div>
            <div className="dash-rail-cell">
              <p className="dash-rail-label">Timing</p>
              <p className="dash-rail-value" style={{ color: "#facc15" }}>
                {latest.timing_score != null ? Math.round(latest.timing_score) : "—"}
              </p>
              <p className="dash-rail-footer">Perfect window</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/assessment", title: "Assessment", body: "Three-pillar readiness read" },
          { href: "/tools", title: "Tools", body: "Calculators for money decisions" },
          { href: "/advisor", title: "Companion", body: "Private coaching chat" },
          { href: "/journal", title: "Journal", body: "Log decisions as you make them" },
          { href: "/daily", title: "Daily pulse", body: "Mood and stress check-in" },
          { href: "/plan", title: "Plan", body: "Personalized next steps" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="glass glass-hover block p-4 transition-colors"
          >
            <p className="font-semibold text-light">{card.title}</p>
            <p className="mt-1 text-sm text-dim">{card.body}</p>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Decision-support benefit. Not medical or financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
