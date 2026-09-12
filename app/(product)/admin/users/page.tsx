import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RoleBadge, TierBadge } from "@/components/admin/Badge";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_USERS_CONSOLE_EMPTY,
  buildAdminUsersV4View,
  type AdminUsersV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Users | Admin | HōMI",
  description: "Read-only directory of HōMI accounts.",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  let rows: AdminUsersV4SourceRow[] = [];
  let loadError = false;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, created_at, role, subscription_tier")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      loadError = true;
      rows = [];
    } else {
      rows = (data as AdminUsersV4SourceRow[] | null) ?? [];
    }
  } catch {
    loadError = true;
    rows = [];
  }

  const view = buildAdminUsersV4View({ rows, loadError });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_USERS_CONSOLE_EMPTY} />
      ) : (
        <>
      <PageHeader eyebrow="Admin" title="Users" description="Read-only directory of accounts." />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(view.shown),
              footer: "Latest 200",
              color: COLORS.cyan,
            },
            {
              label: "Paid",
              value: String(view.paidCount),
              footer: "Non-free tiers",
              color: COLORS.yellow,
            },
            {
              label: "Partners",
              value: String(view.partnerCount),
              footer: "Role = partner",
              color: COLORS.emerald,
            },
            {
              label: "Admins",
              value: String(view.adminCount),
              footer: "Role = admin",
              color: COLORS.amber,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[720px]">
          <thead>
            <tr>
              <th>Id</th>
              <th>Created</th>
              <th>Role</th>
              <th>Tier</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td
                  className="max-w-[10rem] truncate font-mono text-xs sm:max-w-none"
                  title={row.id}
                >
                  {row.id}
                </td>
                <td className="text-dim">{row.createdLabel}</td>
                <td>
                  <RoleBadge role={row.roleLabel} />
                </td>
                <td>
                  <TierBadge tier={row.tierLabel} />
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
