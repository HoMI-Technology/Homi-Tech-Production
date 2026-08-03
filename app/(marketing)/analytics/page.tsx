import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Sparkline } from "@/components/ui/Sparkline";
import { BarSeries } from "@/components/admin/BarSeries";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Marketing Analytics | HōMI",
  description: "Platform growth and conversion metrics.",
  robots: { index: false, follow: false },
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function MarketingAnalyticsPage() {
  const user = await getCachedUser();
  if (!user) return signInRedirect("/analytics");

  const supabase = await getCachedClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);

  const { data: recentSignups } = await supabase
    .from("profiles")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .limit(10000);

  const signupBuckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    signupBuckets.set(dayKey(d), 0);
  }
  for (const r of recentSignups ?? []) {
    const key = dayKey(new Date(r.created_at));
    if (signupBuckets.has(key)) {
      signupBuckets.set(key, (signupBuckets.get(key) ?? 0) + 1);
    }
  }
  const dailySignups = Array.from(signupBuckets.entries()).map(([date, count]) => ({
    date: shortLabel(date),
    count,
  }));

  const { data: startedAssessments } = await supabase
    .from("assessments")
    .select("created_at, status, completed_at")
    .gte("created_at", since.toISOString())
    .limit(10000);

  const totalStarted = (startedAssessments ?? []).length;
  const totalCompleted = (startedAssessments ?? []).filter((a) => a.status === "completed").length;
  const completionRate = totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;

  const { data: waitlistEntries } = await supabase
    .from("waitlist")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .limit(10000);

  const waitlistBuckets = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    waitlistBuckets.set(dayKey(d), 0);
  }
  for (const w of waitlistEntries ?? []) {
    const key = dayKey(new Date(w.created_at));
    if (waitlistBuckets.has(key)) {
      waitlistBuckets.set(key, (waitlistBuckets.get(key) ?? 0) + 1);
    }
  }
  const dailyWaitlist = Array.from(waitlistBuckets.entries()).map(([date, count]) => ({
    date: shortLabel(date),
    count,
  }));

  const totalWaitlist = (waitlistEntries ?? []).length;
  const totalSignups30d = (recentSignups ?? []).length;

  const funnel = {
    visit: totalSignups30d + totalWaitlist,
    start: totalStarted,
    complete: totalCompleted,
  };

  return (
    <div className="field">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <p className="eyebrow">Mission control</p>
        <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Marketing analytics</h1>
        <p className="mt-1 text-sm text-dim">Growth, conversion, and engagement metrics.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Signups (30d)"
            value={totalSignups30d.toLocaleString()}
            accent="#22d3ee"
            footer="New accounts"
            spark={dailySignups.length >= 2 ? <Sparkline id="signups" values={dailySignups.map((d) => d.count)} color="#22d3ee" /> : undefined}
          />
          <StatTile
            label="Completion rate"
            value={`${completionRate}%`}
            accent="#34d399"
            footer={`${totalCompleted} of ${totalStarted} started`}
          />
          <StatTile
            label="Waitlist (30d)"
            value={totalWaitlist.toLocaleString()}
            accent="#facc15"
            footer="New signups"
            spark={dailyWaitlist.length >= 2 ? <Sparkline id="waitlist" values={dailyWaitlist.map((d) => d.count)} color="#facc15" /> : undefined}
          />
          <StatTile
            label="Conversion"
            value={funnel.visit > 0 ? `${Math.round((funnel.complete / funnel.visit) * 100)}%` : "—"}
            accent="#fab633"
            footer="Visit to complete"
          />
        </div>

        <Reveal delay={80} className="glass mt-8 p-6">
          <SectionHeader eyebrow="Funnel" title="Visit → Start → Complete (30 days)" />
          <div className="mt-6">
            {funnel.visit === 0 ? (
              <p className="py-10 text-center text-sm text-dim">No funnel data yet.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-light">Visit (approx.)</span>
                    <span className="score-numeral text-dim">{funnel.visit.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-surface">
                    <div className="flex h-full items-center rounded-lg px-3 text-xs font-medium" style={{ width: "100%", background: "linear-gradient(90deg, rgba(34,211,238,0.3), rgba(34,211,238,0.15))", color: "#22d3ee" }}>
                      100%
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-light">Start assessment</span>
                    <span className="score-numeral text-dim">{funnel.start.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-surface">
                    <div className="flex h-full items-center rounded-lg px-3 text-xs font-medium" style={{ width: funnel.visit > 0 ? `${Math.max(5, Math.round((funnel.start / funnel.visit) * 100))}%` : "5%", background: "linear-gradient(90deg, rgba(52,211,153,0.3), rgba(52,211,153,0.15))", color: "#34d399" }}>
                      {funnel.visit > 0 ? `${Math.round((funnel.start / funnel.visit) * 100)}%` : "0%"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-light">Complete</span>
                    <span className="score-numeral text-dim">{funnel.complete.toLocaleString()}</span>
                  </div>
                  <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-surface">
                    <div className="flex h-full items-center rounded-lg px-3 text-xs font-medium" style={{ width: funnel.visit > 0 ? `${Math.max(5, Math.round((funnel.complete / funnel.visit) * 100))}%` : "5%", background: "linear-gradient(90deg, rgba(250,204,21,0.3), rgba(250,204,21,0.15))", color: "#facc15" }}>
                      {funnel.visit > 0 ? `${Math.round((funnel.complete / funnel.visit) * 100)}%` : "0%"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Reveal delay={80} className="glass p-6">
            <SectionHeader eyebrow="Growth" title="Daily signups (30 days)" />
            <div className="mt-4">
              {dailySignups.every((d) => d.count === 0) ? (
                <p className="py-10 text-center text-sm text-dim">No signup data yet.</p>
              ) : (
                <BarSeries id="signups-30d" counts={dailySignups} color="#22d3ee" ariaLabel="Daily signups over the last 30 days" />
              )}
            </div>
          </Reveal>

          <Reveal delay={120} className="glass p-6">
            <SectionHeader eyebrow="Waitlist" title="Waitlist growth (30 days)" />
            <div className="mt-4">
              {dailyWaitlist.every((d) => d.count === 0) ? (
                <p className="py-10 text-center text-sm text-dim">No waitlist data yet.</p>
              ) : (
                <BarSeries id="waitlist-30d" counts={dailyWaitlist} color="#facc15" ariaLabel="Waitlist signups over the last 30 days" />
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
