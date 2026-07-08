import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { CopyButton } from "@/components/b2b/CopyButton";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { Profile, AssessmentRow } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partner Portal | HōMI",
  description: "Invite clients, review aggregate readiness, and access partner resources.",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";

const RESOURCES = [
  { href: "/guides", label: "Client-facing guides" },
  { href: "/method", label: "The HōMI method" },
  { href: "/how-it-works", label: "How the assessment works" },
];

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function PartnerPortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AccessPanel
        title="Sign in required"
        body="Sign in to your partner account to open the portal."
        href="/auth/sign-in?next=/partner/portal"
        linkLabel="Sign in"
      />
    );
  }

  let profile: Profile | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = (data as Profile | null) ?? null;
  } catch {
    profile = null;
  }

  if (!profile || (profile.role !== "partner" && profile.role !== "admin")) {
    return (
      <AccessPanel
        title="Partner access required"
        body="This portal is reserved for HōMI partners — advisors, coaches, and consultants who've joined the partner program. If that's you, reach out to get your account upgraded."
        href="/partner"
        linkLabel="Learn about the partner program"
      />
    );
  }

  const inviteLink = `${SITE_URL}/shadow-score?ref=partner`;

  let assessmentCount = 0;
  let avgScore: number | null = null;
  let recent: AssessmentRow[] = [];

  try {
    const { count } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true });
    assessmentCount = count ?? 0;
  } catch {
    assessmentCount = 0;
  }

  try {
    const { data } = await supabase
      .from("assessments")
      .select("overall_score")
      .not("overall_score", "is", null)
      .limit(500);
    const rows = (data as { overall_score: number | null }[] | null) ?? [];
    if (rows.length > 0) {
      const sum = rows.reduce((acc, r) => acc + (r.overall_score ?? 0), 0);
      avgScore = Math.round(sum / rows.length);
    }
  } catch {
    avgScore = null;
  }

  try {
    const { data } = await supabase
      .from("assessments")
      .select("id, verdict, overall_score, created_at, is_shadow, user_id, decision_type, status, financial_score, emotional_score, timing_score, inputs, sub_scores, insights, hard_stops, completed_at")
      .order("created_at", { ascending: false })
      .limit(10);
    recent = (data as AssessmentRow[] | null) ?? [];
  } catch {
    recent = [];
  }

  const stats = [
    { label: "Assessments taken", value: assessmentCount.toLocaleString() },
    { label: "Average readiness score", value: avgScore !== null ? String(avgScore) : "—" },
  ];

  return (
    <div className="field">
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan">Partner Portal</p>
        <h1 className="mt-3 font-display text-3xl text-light md:text-4xl">
          Welcome back{profile.full_name ? `, ${profile.full_name}` : ""}.
        </h1>
        <p className="mt-2 max-w-2xl text-dim">
          Invite clients, track aggregate readiness, and reach the resources
          that help you use HōMI in your practice.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="glass p-6 md:p-8">
          <h2 className="text-lg font-semibold text-light">Your invite link</h2>
          <p className="mt-1 text-sm text-dim">
            Share this with clients. Every assessment they take is tagged to
            your partner account — no commission, no per-conversion fee.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="input flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-light">
              {inviteLink}
            </code>
            <CopyButton value={inviteLink} className="shrink-0" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="grid gap-6 sm:grid-cols-2">
          {stats.map((s) => (
            <div key={s.label} className="glass p-6">
              <p className="text-sm text-dim">{s.label}</p>
              <p className="score-numeral mt-2 text-4xl font-bold text-light">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <h2 className="text-lg font-semibold text-light">Recent anonymized assessments</h2>
        <p className="mt-1 text-sm text-dim">
          Verdict, score, and date only — never names or personal details.
        </p>
        <div className="glass mt-5 overflow-hidden">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-dim">
              No assessments yet. Once clients start using your invite link,
              activity will show up here.
            </div>
          ) : (
            <div className="divide-y divide-slate-surface/60">
              {recent.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-4">
                    {a.verdict ? (
                      <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                    ) : (
                      <span className="text-xs text-dim">In progress</span>
                    )}
                    <span className="score-numeral text-sm font-semibold text-light">
                      {a.overall_score ?? "—"}
                    </span>
                  </div>
                  <span className="text-xs text-dim">{formatDate(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-lg font-semibold text-light">Resources</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {RESOURCES.map((r) => (
            <Link key={r.href} href={r.href} className="glass glass-hover flex items-center justify-between p-5 text-sm font-medium text-light">
              {r.label}
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="text-dim">
                <path d="M7 4l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
