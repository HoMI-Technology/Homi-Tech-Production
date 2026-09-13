import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_ASSESSMENTS_EMPTY,
  buildAdminAssessmentsV4View,
  type AdminAssessmentsV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Assessments | Admin | HōMI",
  description: "Recent assessment activity across the platform.",
};

export default async function AdminAssessmentsPage() {
  const supabase = await createClient();

  let rows: AdminAssessmentsV4SourceRow[] = [];
  try {
    const { data } = await supabase
      .from("assessments")
      .select("id, created_at, verdict, is_shadow, hard_stops")
      .order("created_at", { ascending: false })
      .limit(50);
    rows = (data as AdminAssessmentsV4SourceRow[] | null) ?? [];
  } catch {
    rows = [];
  }

  const view = buildAdminAssessmentsV4View(rows);

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_ASSESSMENTS_EMPTY} />
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Assessments"
        description="Most recent 50 assessments across all users."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Latest window",
              color: COLORS.cyan,
            },
            {
              label: "Completed",
              value: String(view.completed),
              footer: "With a read",
              color: COLORS.emerald,
            },
            {
              label: "Wait",
              value: String(view.waitCount),
              footer: "Hold + not yet",
              color: COLORS.yellow,
            },
            {
              label: "Shadow",
              value: String(view.shadowCount),
              footer: "Quick reads",
              color: COLORS.amber,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[760px]">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Type</th>
              <th>Hard stops</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td className="text-dim">{row.dateLabel}</td>
                <td className="text-sm text-dim">{row.statusLabel}</td>
                <td>
                  {row.kindLabel === "Shadow" ? (
                    <span className="text-xs font-semibold text-cyan">Shadow</span>
                  ) : (
                    <span className="text-xs text-dim">Full</span>
                  )}
                </td>
                <td>
                  {row.holdCount > 0 ? (
                    <span className="text-sm font-semibold text-crimson">
                      {row.holdCount}
                    </span>
                  ) : (
                    <span className="text-dim">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </>
      )}
    </PageFrame>
  );
}
