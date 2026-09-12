import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_ACTIVITY_CONSOLE_EMPTY,
  buildAdminActivityV4View,
  type AdminActivityV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Activity | Admin | HōMI",
  description: "Recent audit log activity across the platform.",
};

export default async function AdminActivityPage() {
  const supabase = await createClient();

  let rows: AdminActivityV4SourceRow[] = [];
  let loadError = false;
  try {
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, created_at, action_type, resource_type")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      loadError = true;
      rows = [];
    } else {
      rows = (data as AdminActivityV4SourceRow[] | null) ?? [];
    }
  } catch {
    loadError = true;
    rows = [];
  }

  const view = buildAdminActivityV4View({ rows, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_ACTIVITY_CONSOLE_EMPTY} />
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Activity"
        description="Recent audit log entries across the platform."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Latest 100",
              color: COLORS.cyan,
            },
            {
              label: "Actions",
              value: String(view.actionCount),
              footer: "Distinct types",
              color: COLORS.emerald,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[640px]">
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.actionLabel}</td>
                <td className="text-dim">{row.resourceLabel}</td>
                <td className="text-dim">{row.createdLabel}</td>
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
