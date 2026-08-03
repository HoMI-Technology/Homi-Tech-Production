import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { AccessPanel } from "@/components/b2b/AccessPanel";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageFrame } from "@/components/operate/PageFrame";
import { MetricRail } from "@/components/operate/MetricRail";
import { InviteShareRow } from "@/components/operate/InviteShareRow";
import {
  ActionDock,
  OperateHeroMeta,
  OperateInstrument,
} from "@/components/operate/OperateInstrument";
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
      <OperateInstrument tint="#22d3ee">
        <OperateHeroMeta
          title={
            <>
              Partner <span className="text-aurora">book</span>
            </>
          }
          description="Where your book stands. Invite link attributes readiness. Emails stay private."
        />
        <MetricRail
          cells={[
            {
              label: "Assessments",
              value: String(assessmentCount),
              footer: "Attributed to you",
              color: "#22d3ee",
            },
            {
              label: "Avg score",
              value: avg !== null ? String(avg) : "—",
              footer: "Cohort",
              color: "#facc15",
            },
            {
              label: "Ready",
              value: readyRate !== null ? `${readyRate}%` : String(readyCount),
              footer: "Verdict = READY",
              color: "#34d399",
            },
            {
              label: "Roster",
              value: String(clients.length),
              footer: "Named partner_id only",
              color: "#34d399",
            },
          ]}
        />
        <ActionDock
          kicker="Next move"
          title={hasBook ? "Share your invite link" : "Share your link to open the book"}
        >
          {inviteUrl ? (
            <InviteShareRow url={inviteUrl} />
          ) : (
            <p className="text-sm text-dim">Could not mint an invite code. Refresh or contact support.</p>
          )}
        </ActionDock>
      </OperateInstrument>

      {!hasBook && (
        <div className="glass mt-6 p-8">
          <EmptyState
            title="Share your link to open the book"
            body="When clients complete a Shadow Score or full assessment through your invite, readiness appears here. No emails. No guesswork."
          />
        </div>
      )}

      {hasBook && (
        <>
          <div className="mt-6">
            <div className="dash-section-head">
              <h2>Verdict mix</h2>
              <p>Distribution across your attributed book.</p>
            </div>
            <div className="dash-rail">
              {VERDICT_KEYS.map((k) => (
                <div key={k} className="dash-rail-cell">
                  <p className="dash-rail-label">{VERDICT_META[k].label}</p>
                  <p className="dash-rail-value" style={{ color: VERDICT_META[k].color }}>
                    {verdictCounts[k]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass mt-6 p-5 sm:p-6">
            <div className="dash-section-head">
              <h2>Recent readiness</h2>
              <p>Roster names only when linked. Never emails.</p>
            </div>
            <div className="table-scroll">
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

      {clients.length > 0 && (
        <div className="glass mt-6 p-5 sm:p-6">
          <div className="dash-section-head">
            <h2>Named roster</h2>
            <p>Explicit partner_id links only. Invite traffic is separate.</p>
          </div>
          <ul className="divide-y divide-white/5">
            {clients.slice(0, 25).map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="font-medium text-light">{c.full_name || "Linked client"}</span>
                <span className="text-xs text-dim">
                  Joined{" "}
                  {new Date(c.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/guides", title: "Client guides", body: "Share ready explainers" },
          { href: "/method", title: "HōMI method", body: "How the instrument works" },
          { href: "/how-it-works", title: "Assessment", body: "What clients complete" },
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
        Decision-support for clients. Not financial advice. HōMI Technologies LLC.
      </p>
    </PageFrame>
  );
}
