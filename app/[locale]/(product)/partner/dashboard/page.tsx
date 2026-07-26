import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { CopyButton } from "@/components/b2b/CopyButton";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import type { Profile } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";
import { VERDICT_META } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Partner Dashboard | HōMI",
  description: "Book pulse, invite link, and readiness for your referred clients.",
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";

const VERDICT_KEYS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

/**
 * Partner home — single operate surface (portal redirects here).
 * Book pulse: assessments.referral_source + RPC attribution path.
 * Named roster: profiles.partner_id only (explicit relationship).
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

  // Stable invite code (mint on first visit).
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
      const code = `ptr_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
      const { data: inserted } = await supabase
        .from("partner_codes")
        .insert({ code, partner_user_id: user.id })
        .select("code")
        .maybeSingle();
      partnerCode = (inserted?.code as string | undefined) ?? code;
    }
  } catch {
    partnerCode = null;
  }

  const inviteUrl = partnerCode ? `${SITE_URL}/shadow-score?ref=${partnerCode}` : null;

  // L0 — attributed assessments via denormalized referral_source (invite path).
  const { data: referredRows } = await supabase
    .from("assessments")
    .select("id, user_id, verdict, overall_score, completed_at, created_at, is_shadow")
    .eq("referral_source", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  type BookRow = {
    id: string;
    user_id: string;
    verdict: VerdictKey | null;
    overall_score: number | null;
    completed_at: string | null;
    created_at: string;
    is_shadow: boolean | null;
  };

  let attributed: BookRow[] =
    ((referredRows as BookRow[] | null) ?? []).map((r) => ({
      ...r,
      verdict: (r.verdict as VerdictKey | null) ?? null,
    }));

  // Fallback: portal RPC if denorm empty but code exists (pre-I0 traffic).
  let rpcCount: number | null = null;
  let rpcAvg: number | null = null;
  if (partnerCode && attributed.length === 0) {
    try {
      const { data: stats } = await supabase.rpc("partner_code_stats", {
        p_code: partnerCode,
      });
      const row = Array.isArray(stats) ? stats[0] : stats;
      if (row) {
        rpcCount = Number(row.assessment_count ?? 0);
        rpcAvg = row.avg_score != null ? Number(row.avg_score) : null;
      }
      const { data: recent } = await supabase.rpc("partner_recent_assessments", {
        p_code: partnerCode,
        p_limit: 20,
      });
      if (Array.isArray(recent) && recent.length > 0) {
        attributed = recent.map(
          (
            r: {
              created_at: string | null;
              verdict: string | null;
              overall_score: number | null;
              is_shadow: boolean | null;
            },
            i: number,
          ) => ({
            id: `rpc-${i}`,
            user_id: "",
            verdict: (r.verdict as VerdictKey | null) ?? null,
            overall_score: r.overall_score,
            completed_at: r.created_at,
            created_at: r.created_at ?? new Date().toISOString(),
            is_shadow: r.is_shadow,
          }),
        );
      }
    } catch {
      // RPC unavailable — keep empty
    }
  }

  // L1 — explicit roster (names allowed; no emails).
  const { data: clientRows } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("partner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const clients =
    (clientRows as Pick<Profile, "id" | "full_name" | "created_at">[] | null) ?? [];

  const scores = attributed
    .map((a) => a.overall_score)
    .filter((s): s is number => s != null);
  const avgFromRows =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const avg = avgFromRows ?? rpcAvg;
  const assessmentCount = attributed.length > 0 ? attributed.length : (rpcCount ?? 0);
  const readyCount = attributed.filter((a) => a.verdict === "READY").length;
  const readyRate =
    assessmentCount > 0 ? Math.round((readyCount / Math.max(attributed.length, 1)) * 100) : null;

  const verdictCounts: Record<VerdictKey, number> = {
    READY: 0,
    ALMOST_THERE: 0,
    BUILD_FIRST: 0,
    NOT_YET: 0,
  };
  for (const a of attributed) {
    if (a.verdict && a.verdict in verdictCounts) {
      verdictCounts[a.verdict as VerdictKey] += 1;
    }
  }

  const hasBook = assessmentCount > 0;

  return (
    <PageFrame role="partner" density="compact">
      <PageHeader
        eyebrow="Partner"
        title="Partner home"
        description="Book pulse from your invite link. Individual emails stay private."
        badge={
          <span className="rounded-full bg-slate-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-dim">
            Channel
          </span>
        }
        primaryAction={
          inviteUrl
            ? undefined
            : { label: "Create invite code", href: "/partner/dashboard" }
        }
      />

      {/* Invite OS — primary action when book is empty */}
      <div className={`glass mt-8 p-6 ${!hasBook ? "panel-focus" : ""}`}>
        <SectionHeader
          eyebrow="Invite"
          title="Your client link"
          subtitle="Every assessment taken through this link is attributed to your book."
        />
        {inviteUrl ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="block flex-1 truncate rounded-lg border border-slate-surface bg-navy-light px-3 py-2 font-mono text-xs text-cyan sm:text-sm">
              {inviteUrl}
            </code>
            <CopyButton value={inviteUrl} label="Copy invite link" />
          </div>
        ) : (
          <p className="mt-4 text-sm text-dim">
            Could not mint an invite code. Refresh or contact support.
          </p>
        )}
      </div>

      {/* Book pulse hero */}
      <div className="glass mt-8 p-6 sm:p-8">
        <SectionHeader
          eyebrow="Book pulse"
          title="Where your book stands"
          subtitle="Attributed assessments from your invite (and roster links)."
        />
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Assessments"
            value={String(assessmentCount)}
            accent="#22d3ee"
            footer="Attributed to you"
          />
          <StatTile
            label="Avg score"
            value={avg !== null ? String(avg) : "—"}
            accent="#facc15"
            footer="Cohort"
          />
          <StatTile
            label="Ready"
            value={readyRate !== null ? `${readyRate}%` : String(readyCount)}
            accent="#34d399"
            footer="Verdict = READY"
          />
          <StatTile
            label="Roster"
            value={String(clients.length)}
            accent="#34d399"
            footer="Named via partner_id"
          />
        </div>
      </div>

      {!hasBook && (
        <div className="glass mt-8 p-10">
          <EmptyState
            title="Share your link to open the book"
            body="When clients complete a Shadow Score or full assessment through your invite, readiness appears here — no emails, no guesswork. Use Copy invite link above."
          />
        </div>
      )}

      {hasBook && (
        <>
          <div className="glass mt-8 p-6">
            <SectionHeader eyebrow="Distribution" title="Verdict mix" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {VERDICT_KEYS.map((k) => (
                <div key={k} className="rounded-lg border border-slate-surface/60 px-3 py-3">
                  <p className="text-xs text-dim">{VERDICT_META[k].label}</p>
                  <p className="score-numeral mt-1 text-2xl text-light">{verdictCounts[k]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass mt-8 p-6">
            <SectionHeader
              eyebrow="Pipeline"
              title="Recent readiness"
              subtitle="Identity-stripped by default; roster names only when linked."
            />
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
                  {attributed.slice(0, 20).map((a) => {
                    const client = a.user_id
                      ? clients.find((c) => c.id === a.user_id)
                      : undefined;
                    return (
                      <tr key={a.id}>
                        <td className="text-sm text-light">
                          {client?.full_name || "Client"}
                          {a.is_shadow && (
                            <span className="ml-2 text-[0.625rem] uppercase text-dim">Shadow</span>
                          )}
                          {a.user_id && (
                            <span className="ml-2 font-mono text-[0.625rem] text-dim">
                              {a.user_id.slice(0, 8)}
                            </span>
                          )}
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
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/guides" className="text-cyan hover:underline">
          Client guides
        </Link>
        <Link href="/method" className="text-cyan hover:underline">
          The HōMI method
        </Link>
        <Link href="/how-it-works" className="text-cyan hover:underline">
          How the assessment works
        </Link>
      </div>

      <p className="mt-10 text-center text-xs text-dim">
        Decision-support for clients — not financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
