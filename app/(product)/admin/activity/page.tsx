import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { BarSeries } from "@/components/admin/BarSeries";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata: Metadata = {
  title: "Activity | HōMI Admin",
  description: "Recent audit log activity across the platform.",
};

interface AuditLogRow {
  id: string;
  user_id: string | null;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function shortLabel(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function truncateId(id: string | null) {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

const ACTION_COLORS = ["#22d3ee", "#34d399", "#facc15", "#fab633", "#f24822", "#94a3b8"];

export default async function AdminActivityPage() {
  const supabase = await createClient();

  let entries: AuditLogRow[] = [];
  let dailyCounts: { date: string; count: number }[] = [];
  let actionCounts: { action: string; count: number }[] = [];

  try {
    const { data } = await supabase
      .from("audit_log")
      .select("id, user_id, action_type, resource_type, resource_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    entries = (data as AuditLogRow[] | null) ?? [];
  } catch {
    entries = [];
  }

  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 13);
    since.setUTCHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("audit_log")
      .select("created_at, action_type")
      .gte("created_at", since.toISOString())
      .limit(20000);
    const rows = (data as { created_at: string; action_type: string }[] | null) ?? [];

    const buckets = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
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

    const actionMap = new Map<string, number>();
    for (const r of rows) {
      actionMap.set(r.action_type, (actionMap.get(r.action_type) ?? 0) + 1);
    }
    actionCounts = Array.from(actionMap.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  } catch {
    dailyCounts = [];
    actionCounts = [];
  }

  const totalActions = actionCounts.reduce((acc, a) => acc + a.count, 0);

  return (
    <div>
      <p className="eyebrow">Audit trail</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Activity</h1>
      <p className="mt-1 text-sm text-dim">Recent audit log entries across the platform.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <SectionHeader eyebrow="Volume" title="Activity — last 14 days" />
          <div className="mt-4">
            {dailyCounts.length === 0 || dailyCounts.every((d) => d.count === 0) ? (
              <p className="py-10 text-center text-sm text-dim">No activity recorded yet.</p>
            ) : (
              <BarSeries
                id="activity-14d"
                counts={dailyCounts}
                color="#34d399"
                height={160}
                ariaLabel="Audit log activity over the last 14 days"
              />
            )}
          </div>
        </div>

        <div className="glass p-6">
          <SectionHeader eyebrow="Breakdown" title="By action type" />
          <div className="mt-5 space-y-4">
            {actionCounts.length === 0 ? (
              <p className="py-6 text-center text-sm text-dim">No actions recorded in the last 14 days.</p>
            ) : (
              actionCounts.map((a, i) => {
                const pct = totalActions > 0 ? Math.round((a.count / totalActions) * 100) : 0;
                const color = ACTION_COLORS[i % ACTION_COLORS.length];
                return (
                  <div key={a.action}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold text-light">
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
                        />
                        {a.action}
                      </span>
                      <span className="score-numeral text-dim">
                        {a.count.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
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
        <SectionHeader eyebrow="Log" title="Recent entries" />
        {entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-dim">No audit log entries yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="table-premium min-w-[680px]">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>User</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium">{e.action_type}</td>
                    <td className="text-dim">
                      {e.resource_type ?? "—"}
                      {e.resource_id ? ` · ${truncateId(e.resource_id)}` : ""}
                    </td>
                    <td className="score-numeral text-dim">{truncateId(e.user_id)}</td>
                    <td className="text-dim">
                      {new Date(e.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
