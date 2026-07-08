import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

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

function ActivityBarChart({ counts }: { counts: { date: string; count: number }[] }) {
  const width = 720;
  const height = 160;
  const padding = 8;
  const max = Math.max(1, ...counts.map((c) => c.count));
  const barGap = 4;
  const barWidth = counts.length > 0 ? (width - padding * 2) / counts.length - barGap : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Audit log activity over the last 14 days"
      >
        {counts.map((c, i) => {
          const barHeight = (c.count / max) * (height - padding * 2 - 20);
          const x = padding + i * (barWidth + barGap);
          const y = height - padding - 20 - barHeight;
          return (
            <g key={c.date}>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, c.count > 0 ? 2 : 0)}
                rx={2}
                fill="#22d3ee"
                opacity={c.count > 0 ? 0.85 : 0.15}
              />
              {c.count === 0 && (
                <rect x={x} y={height - padding - 20 - 2} width={Math.max(barWidth, 1)} height={2} rx={1} fill="#334155" />
              )}
            </g>
          );
        })}
        <line
          x1={padding}
          y1={height - padding - 20}
          x2={width - padding}
          y2={height - padding - 20}
          stroke="rgba(148,163,184,0.25)"
          strokeWidth={1}
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-dim">
        <span>{counts[0]?.date}</span>
        <span>{counts[counts.length - 1]?.date}</span>
      </div>
    </div>
  );
}

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
      <h1 className="font-display text-2xl text-light md:text-3xl">Activity</h1>
      <p className="mt-1 text-sm text-dim">Recent audit log entries across the platform.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-light">Activity — last 14 days</h2>
          <div className="mt-4">
            {dailyCounts.length === 0 || dailyCounts.every((d) => d.count === 0) ? (
              <p className="py-10 text-center text-sm text-dim">No activity recorded yet.</p>
            ) : (
              <ActivityBarChart counts={dailyCounts} />
            )}
          </div>
        </div>

        <div className="glass p-6">
          <h2 className="text-lg font-semibold text-light">By action type</h2>
          <div className="mt-4 space-y-4">
            {actionCounts.length === 0 ? (
              <p className="py-6 text-center text-sm text-dim">No actions recorded in the last 14 days.</p>
            ) : (
              actionCounts.map((a, i) => {
                const pct = totalActions > 0 ? Math.round((a.count / totalActions) * 100) : 0;
                const color = ACTION_COLORS[i % ACTION_COLORS.length];
                return (
                  <div key={a.action}>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color }} className="font-semibold">
                        {a.action}
                      </span>
                      <span className="text-dim">
                        {a.count.toLocaleString()} · {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 glass overflow-hidden p-0">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold text-light">Recent entries</h2>
        </div>
        {entries.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-dim">No audit log entries yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-t border-slate-surface/60 text-xs uppercase tracking-wide text-dim">
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Resource</th>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-surface/60">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-6 py-3 font-medium text-light">{e.action_type}</td>
                    <td className="px-6 py-3 text-dim">
                      {e.resource_type ?? "—"}
                      {e.resource_id ? ` · ${truncateId(e.resource_id)}` : ""}
                    </td>
                    <td className="px-6 py-3 score-numeral text-dim">{truncateId(e.user_id)}</td>
                    <td className="px-6 py-3 text-dim">
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
