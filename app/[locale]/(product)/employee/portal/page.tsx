import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VERDICT_META } from "@/lib/brand";
import type { Profile, AssessmentRow } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Employee Portal | HōMI",
  description: "Your private readiness hub — assessments, tools, and your decision companion.",
};

const LINKS = [
  {
    href: "/assessment",
    title: "Take the full assessment",
    body: "A complete read on Financial Reality, Emotional Truth, and Perfect Timing.",
  },
  {
    href: "/tools",
    title: "Finance tools",
    body: "Calculators and checklists to sanity-check the numbers before you decide.",
  },
  {
    href: "/advisor",
    title: "Talk to your decision companion",
    body: "Work through what's actually driving the decision, privately.",
  },
];

const TIPS = [
  {
    title: "Separate excitement from readiness",
    body: "A decision can feel exciting and still not be ready. Let the assessment hold both.",
  },
  {
    title: "Revisit, don't just repeat",
    body: "Readiness changes. Retake the assessment when your situation shifts.",
  },
  {
    title: "Use \"not yet\" as a plan",
    body: "A not-ready verdict comes with the specific things to work on next.",
  },
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

export default async function EmployeePortalPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AccessPanel
        title="Sign in required"
        body="Sign in to open your employee benefit portal."
        href="/auth/sign-in?next=/employee/portal"
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

  if (!profile || (profile.role !== "employee" && profile.role !== "admin")) {
    return (
      <AccessPanel
        title="Employee benefit access required"
        body="This portal is available to employees whose employer offers HōMI as a benefit. If your company offers HōMI, check with HR for your access link."
        href="/employee"
        linkLabel="Learn about the employee benefit"
      />
    );
  }

  let latest: AssessmentRow | null = null;
  try {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latest = (data as AssessmentRow | null) ?? null;
  } catch {
    latest = null;
  }

  const verdictColor =
    latest?.verdict ? VERDICT_META[latest.verdict as VerdictKey].color : "#22d3ee";

  return (
    <div className="field">
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-8">
        <Reveal>
          <p className="eyebrow !text-emerald/80">Employee benefit</p>
          <h1 className="mt-2 font-display text-3xl text-light md:text-4xl">
            Welcome back{profile.full_name ? (
              <>
                , <span className="text-aurora">{profile.full_name}</span>
              </>
            ) : (
              ""
            )}
            .
          </h1>
          <p className="mt-2 max-w-2xl text-dim">
            Your private readiness hub. Nothing here is visible to your employer.
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={80}>
          <div className="glass sweep relative overflow-hidden p-6 md:p-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-20 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full"
              style={{ background: `radial-gradient(circle, ${verdictColor}1c, transparent 70%)`, filter: "blur(18px)" }}
            />
            <div className="relative">
              {latest && latest.overall_score !== null && latest.verdict ? (
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  <ScoreRing value={latest.overall_score} color={verdictColor} size={140} sublabel="/ 100" />
                  <div>
                    <p className="eyebrow">Your latest verdict</p>
                    <div className="mt-2">
                      <VerdictBadge verdict={latest.verdict as VerdictKey} size="lg" />
                    </div>
                    <p className="mt-3 text-xs text-dim">
                      Completed {formatDate(latest.completed_at ?? latest.created_at)}
                    </p>
                  </div>
                  <Link href="/assessment" className="btn btn-ghost ml-auto shrink-0 self-start sm:self-center">
                    Retake assessment
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-light">No assessment yet</h2>
                    <p className="mt-1 max-w-md text-sm text-dim">
                      Take your first assessment to get a private readiness verdict.
                    </p>
                  </div>
                  <Link href="/assessment" className="btn btn-primary shrink-0">
                    Start assessment
                  </Link>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={100}>
          <div className="grid gap-6 md:grid-cols-3">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="glass glass-hover sweep flex h-full flex-col p-6">
                <h3 className="text-lg font-semibold text-light">{l.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-dim">{l.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cyan">
                  Open
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 4l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={80}>
          <div
            className="glass p-8"
            style={{
              borderColor: "rgba(52, 211, 153, 0.28)",
              boxShadow:
                "inset 0 1px 0 rgba(226,232,240,0.07), 0 24px 48px -18px rgba(2,6,16,0.7), 0 0 44px -18px rgba(52,211,153,0.4)",
            }}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-surface">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-emerald">
                  <rect x="4" y="9" width="12" height="8" rx="1.5" />
                  <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-light">
                  Your employer never sees your individual results. Ever.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
                  Your employer can see that the benefit is being used, in
                  aggregate, across the whole team. They never see your score,
                  your verdict, or your answers.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal delay={80}>
          <SectionHeader eyebrow="Perspective" title="Wellness tips" />
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {TIPS.map((t) => (
              <div key={t.title} className="glass glass-hover p-6">
                <h3 className="text-base font-semibold text-light">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{t.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
