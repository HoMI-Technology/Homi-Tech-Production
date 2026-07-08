import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/StatCard";
import { AssessmentsBarChart } from "@/components/admin/AssessmentsBarChart";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import type { Profile } from "@/types/database";

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

  const totalVerdicts = VERDICT_KEYS.reduce((acc, k) => acc + verdictCounts[k], 0);

  return (
    <div>
      <h1 className="font-display text-2xl text-light md:text-3xl">Overview</h1>
      <p className="mt-1 text-sm text-dim">Platform-wide activity and readiness signal.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={totalUsers.toLocaleString()} accent="#22d3ee" />
        <StatCard label="Assessments completed" value={assessmentsCompleted.toLocaleString()} accent="#34d399" />
        <StatCard label="Average score" value={avgScore !== null ? String(avgScore) : "—"} accent="#facc15" />
        <StatCard label="Waitlist" value={waitlistCount.toLocaleString()} accent="#fab633" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-light">Assessments — last 30 days</h2>
          <div className="mt-4">
            {dailyCounts.length === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No assessment activity yet.</p>
            ) : (
              <AssessmentsBarChart counts={dailyCounts} />
            )}
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-light">Verdict distribution</h2>
          <div className="mt-4 space-y-4">
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
                      <span style={{ color: meta.color }} className="font-semibold">
                        {meta.label}
                      </span>
                      <span className="text-dim">
                        {count.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 glass p-6">
        <h2 className="text-lg font-semibold text-light">Recent signups</h2>
        {recentSignups.length === 0 ? (
          <p className="mt-4 py-6 text-center text-sm text-dim">No signups yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-surface/60">
            {recentSignups.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-sm font-medium text-light">{p.full_name || "Unnamed"}</p>
                  <p className="text-xs text-dim">{p.email}</p>
                </div>
                <span className="text-xs text-dim">
                  {new Date(p.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
