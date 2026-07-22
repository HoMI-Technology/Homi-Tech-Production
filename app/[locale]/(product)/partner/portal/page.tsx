import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { CopyButton } from "@/components/b2b/CopyButton";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { Reveal } from "@/components/ui/Reveal";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Profile } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

/** Identity-stripped row returned by partner_recent_assessments (00024). */
interface PartnerRecentRow {
  created_at: string | null;
  verdict: string | null;
  overall_score: number | null;
  is_shadow: boolean | null;
}

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

  // Per-partner invite code (00019): mint on first visit, stable forever.
  // Every assessment taken through the link is stamped with this ref, which
  // is what makes the scoped stats below — and the invite panel's promise —
  // actually true.
  let partnerCode: string | null = null;
  try {
    const { data: existing } = await supabase
      .from("partner_codes")
      .select("code")
      .eq("partner_user_id", user.id)
      .maybeSingle();
    if (existing?.code) {
      partnerCode = existing.code as string;
    } else {
      const minted = `ptr_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
      const { data: inserted } = await supabase
        .from("partner_codes")
        .insert({ code: minted, partner_user_id: user.id })
        .select("code")
        .maybeSingle();
      partnerCode = (inserted?.code as string | undefined) ?? null;
    }
  } catch {
    partnerCode = null;
  }

  const inviteLink = partnerCode ? `${SITE_URL}/shadow-score?ref=${partnerCode}` : null;

  // Anonymized, partner-scoped stats via SECURITY DEFINER RPCs (00024) — the
  // only partner read path into client assessment data. Aggregates and
  // identity-stripped rows only.
  let assessmentCount = 0;
  let recentCount = 0;
  let avgScore: number | null = null;
  let recent: PartnerRecentRow[] = [];

  if (partnerCode) {
    try {
      const { data } = await supabase.rpc("partner_code_stats", { p_code: partnerCode });
      const stats = (data as
        | { assessment_count: number; recent_count: number; avg_score: number | null }[]
        | null)?.[0];
      if (stats) {
        assessmentCount = Number(stats.assessment_count ?? 0);
        recentCount = Number(stats.recent_count ?? 0);
        avgScore = stats.avg_score === null ? null : Math.round(Number(stats.avg_score));
      }
    } catch {
      // Leave zeros — the portal renders honestly empty rather than erroring.
    }

    try {
      const { data } = await supabase.rpc("partner_recent_assessments", {
        p_code: partnerCode,
        p_limit: 10,
      });
      recent = (data as PartnerRecentRow[] | null) ?? [];
    } catch {
      recent = [];
    }
  }

  return (
    <div className="field">
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-8">
        <Reveal>
          <p className="eyebrow">Partner portal</p>
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
            Invite clients, track aggregate readiness, and reach the resources
            that help you use HōMI in your practice.
          </p>
          <div className="mt-5">
            <Link href="/partner/dashboard" className="btn btn-ghost !px-4 !py-2 text-sm">
              Partner dashboard
            </Link>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={80}>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Assessments taken"
              value={assessmentCount.toLocaleString()}
              accent="#22d3ee"
              footer="Lifetime, from your invite link"
            />
            <StatTile
              label="Last 30 days"
              value={recentCount.toLocaleString()}
              accent="#34d399"
              footer="New assessments from your invites"
            />
            <StatTile
              label="Average readiness score"
              value={avgScore !== null ? String(avgScore) : "—"}
              accent="#facc15"
              footer="Across your invited assessments"
            />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={120}>
          <div className="glass panel-focus sweep p-6 md:p-8">
            <SectionHeader
              eyebrow="Grow your practice"
              title="Your invite link"
              subtitle="Share this with clients. Every assessment they take is tagged to your partner account — no commission, no per-conversion fee."
            />
            {partnerCode && inviteLink ? (
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <code className="input flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-light">
                  {inviteLink}
                </code>
                <CopyButton value={inviteLink} className="shrink-0" />
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-crimson/30 bg-crimson/5 p-4 text-sm text-dim">
                <p className="font-medium text-light">Invite link unavailable</p>
                <p className="mt-1">
                  We couldn&apos;t mint your partner referral code, so a bare Shadow Score
                  link would not attribute clients to you. Refresh this page, or contact
                  support if it keeps failing.
                </p>
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-8">
        <Reveal delay={80} className="glass block p-6 md:p-8">
          <SectionHeader
            eyebrow="Signal"
            title="Recent anonymized assessments"
            subtitle="Verdict, score, and date only — never names or personal details."
          />
          <div className="mt-4">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-dim">
                No assessments yet. Once clients start using your invite link,
                activity will show up here.
              </div>
            ) : (
              <div className="divide-y divide-slate-surface/40">
                {recent.map((a, i) => (
                  <div
                    key={`${a.created_at ?? "row"}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-2 py-4 transition-colors hover:bg-cyan/5"
                  >
                    <div className="flex items-center gap-4">
                      {a.verdict ? (
                        <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                      ) : (
                        <span className="chip !text-xs !text-dim">In progress</span>
                      )}
                      <span className="score-numeral text-sm font-semibold text-light">
                        {a.overall_score ?? "—"}
                      </span>
                      {a.is_shadow && <span className="text-xs font-semibold text-cyan">Shadow</span>}
                    </div>
                    <span className="text-xs text-dim">{formatDate(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal delay={80}>
          <SectionHeader eyebrow="Toolkit" title="Resources" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {RESOURCES.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="glass glass-hover sweep flex items-center justify-between p-5 text-sm font-medium text-light"
              >
                {r.label}
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan">
                  <path d="M7 4l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </Reveal>
      </section>
    </div>
  );
}
