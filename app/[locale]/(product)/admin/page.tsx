import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/ui/StatTile";
import { Sparkline } from "@/components/ui/Sparkline";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { BarSeries } from "@/components/admin/BarSeries";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  dailySucceededCents,
  formatUsdFromCents,
  sumSucceededCents,
} from "@/lib/dashboard/revenue";
import type { Payment, Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Admin Overview | HōMI",
  description: "Platform overview — users, assessments, verdicts, and waitlist.",
};

const VERDICT_KEYS: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  let totalUsers = 0;
  let assessmentsCompleted = 0;
  let waitlistCount = 0;
  let avgScore: number | null = null;
  const verdictCounts: Record<VerdictKey, number> = {
    READY: 0,
    ALMOST_THERE: 0,
    BUILD_FIRST: 0,
    NOT_YET: 0,
  };
  let recentSignups: Profile[] = [];
  let dailyCounts: { date: string; count: number }[] = [];
  let payments: Payment[] = [];

  try {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    totalUsers = count ?? 0;
  } catch {
    totalUsers = 0;
  }

  try {
    const { count } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");
    assessmentsCompleted = count ?? 0;
  } catch {
    assessmentsCompleted = 0;
  }

  try {
    const { count } = await supabase.from("waitlist").select("*", { count: "exact", head: true });
    waitlistCount = count ?? 0;
  } catch {
    waitlistCount = 0;
  }

  try {
    const { data } = await supabase
      .from("assessments")
      .select("overall_score, verdict")
      .eq("status", "completed")
      .not("overall_score", "is", null)
      .limit(2000);
    const rows = (data as { overall_score: number | null; verdict: VerdictKey | null }[] | null) ?? [];
    if (rows.length > 0) {
      const sum = rows.reduce((acc, r) => acc + (r.overall_score ?? 0), 0);
      avgScore = Math.round(sum / rows.length);
    }
    for (const r of rows) {
      if (r.verdict && r.verdict in verdictCounts) {
        verdictCounts[r.verdict] += 1;
      }
    }
  } catch {
    avgScore = null;
  }

  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    recentSignups = (data as Profile[] | null) ?? [];
  } catch {
    recentSignups = [];
  }

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("assessments")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .limit(10000);
    const rows = (data as { created_at: string }[] | null) ?? [];

    const buckets = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      buckets.set(dayKey(d), 0);
    }
    for (const r of rows) {
      const key = dayKey(new Date(r.created_at));
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }
    dailyCounts = Array.from(buckets.entries()).map(([date, count]) => ({
      date: shortLabel(date),
      count,
    }));
  } catch {
    dailyCounts = [];
  }

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .gte("created_at", since.toISOString())
      .limit(5000);
    payments = (data as Payment[] | null) ?? [];
  } catch {
    payments = [];
  }

  const totalVerdicts = VERDICT_KEYS.reduce((acc, k) => acc + verdictCounts[k], 0);
  const last7 = dailyCounts.slice(-7).reduce((acc, d) => acc + d.count, 0);
  const revenue30dCents = sumSucceededCents(payments);
  const revenueDaily = dailySucceededCents(payments, 30);
  const revenueSpark = revenueDaily.map((d) => d.cents / 100);

  return (
    <div>
      <p className="eyebrow">Mission control</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Overview</h1>
      <p className="mt-1 text-sm text-dim">Platform-wide activity and readiness signal.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total users" value={totalUsers.toLocaleString()} accent="#22d3ee" footer="All accounts" />
        <StatTile
          label="Assessments completed"
          value={assessmentsCompleted.toLocaleString()}
          accent="#34d399"
          footer={`${last7.toLocaleString()} in the last 7 days`}
          spark={
            dailyCounts.length >= 2 ? (
              <Sparkline id="admin-assessments" values={dailyCounts.map((d) => d.count)} color="#34d399" />
            ) : undefined
          }
        />
        <StatTile label="Average score" value={avgScore !== null ? String(avgScore) : "—"} accent="#facc15" footer="Across completed assessments" />
        <StatTile label="Waitlist" value={waitlistCount.toLocaleString()} accent="#fab633" footer="Signups captured" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <SectionHeader
            eyebrow="Revenue"
            title="Succeeded payments — last 30 days"
            subtitle="From the payments ledger (Stripe webhook)."
          />
          <div className="mt-4 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs text-dim">Gross (succeeded)</p>
              <p className="score-numeral mt-1 text-3xl text-light">
                {formatUsdFromCents(revenue30dCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-dim">Events</p>
              <p className="score-numeral mt-1 text-xl text-light">
                {payments.filter((p) => p.status === "succeeded").length}
              </p>
            </div>
            {revenueSpark.some((v) => v > 0) && (
              <div className="ml-auto w-40">
                <Sparkline id="admin-revenue" values={revenueSpark} color="#34d399" />
              </div>
            )}
          </div>
          {revenue30dCents === 0 && (
            <p className="mt-4 text-sm text-dim">
              No succeeded payments in the last 30 days yet. New Checkout and
              invoice events land here once the Stripe webhook is delivering
              <span className="font-mono text-xs text-light"> checkout.session.completed </span>
              / <span className="font-mono text-xs text-light">invoice.payment_succeeded</span>.
            </p>
          )}
        </div>
        <SystemHealthCard />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <SectionHeader eyebrow="Volume" title="Assessments — last 30 days" />
          <div className="mt-4">
            {dailyCounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No assessment activity yet.</p>
            ) : (
              <BarSeries id="assessments-30d" counts={dailyCounts} color="#22d3ee" ariaLabel="Assessments completed over the last 30 days" />
            )}
          </div>
        </div>

        <div className="glass p-6">
          <SectionHeader eyebrow="Outcomes" title="Verdict distribution" />
          <div className="mt-5 space-y-4">
            {totalVerdicts === 0 ? (
              <p className="py-6 text-center text-sm text-dim">No completed assessments yet.</p>
            ) : (
              VERDICT_KEYS.map((k) => {
                const meta = VERDICT_META[k];
                const count = verdictCounts[k];
                const pct = totalVerdicts > 0 ? Math.round((count / totalVerdicts) * 100) : 0;
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-light">
                        <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
                        {meta.label}
                      </span>
                      <span className="score-numeral text-dim">
                        {count.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="glass mt-8 p-6">
        <SectionHeader
          eyebrow="Momentum"
          title="Recent signups"
          action={
            recentSignups.length > 0 ? (
              <CsvExportButton
                filename={`homitechnology-signups-${new Date().toISOString().slice(0, 10)}.csv`}
                headers={["Email", "Joined", "Role"]}
                rows={recentSignups.map((s) => ({
                  Email: s.email,
                  Joined: s.created_at,
                  Role: s.role,
                }))}
              />
            ) : undefined
          }
        />
        {recentSignups.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-dim">No signups yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="table-premium min-w-[480px]">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Joined</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {recentSignups.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="text-sm font-medium text-light">{p.full_name || "Unnamed"}</p>
                      <p className="text-xs text-dim">{p.email}</p>
                    </td>
                    <td className="text-dim">
                      {new Date(p.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="text-dim">{p.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-dim">
        Decision-support software — not financial, legal, or tax advice. HōMI Technologies LLC.
      </p>
    </div>
  );
}
