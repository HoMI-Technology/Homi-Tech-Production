import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import {
  ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY,
  buildAdminOrganizationsV4View,
  type AdminOrganizationsV4MemberRow,
  type AdminOrganizationsV4SourceRow,
} from "@/lib/v4/admin-workspace";

export const metadata: Metadata = {
  title: "Organizations | Admin | HōMI",
  description: "Employer and partner organizations, membership, and family accounts.",
};

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();

  let rows: AdminOrganizationsV4SourceRow[] = [];
  let members: AdminOrganizationsV4MemberRow[] = [];
  let familyCount = 0;
  let loadError = false;

  try {
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, slug, kind, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (orgError) {
      loadError = true;
    } else {
      rows = (orgData as AdminOrganizationsV4SourceRow[] | null) ?? [];
    }

    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .limit(20000);
    if (memberError) {
      loadError = true;
      members = [];
    } else {
      members = (memberData as AdminOrganizationsV4MemberRow[] | null) ?? [];
    }

    const { count, error: familyError } = await supabase
      .from("family_accounts")
      .select("id", { count: "exact", head: true });
    if (familyError) {
      loadError = true;
      familyCount = 0;
    } else {
      familyCount = count ?? 0;
    }
  } catch {
    loadError = true;
    rows = [];
    members = [];
    familyCount = 0;
  }

  const view = buildAdminOrganizationsV4View({
    rows,
    members,
    familyCount,
    loadError,
  });

  return (
    <PageFrame role="admin" density="compact">
      {view.kind === "empty" ? (
        <AdminRoomEmptyV4 title={ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY} />
      ) : (
        <>
      <PageHeader
        eyebrow="Admin"
        title="Organizations"
        description="Employer and partner accounts, membership, and family households."
      />

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
              label: "Members",
              value: String(view.memberCount),
              footer: "Across loaded orgs",
              color: COLORS.emerald,
            },
            {
              label: "Family",
              value: String(view.familyCount),
              footer: "Households",
              color: COLORS.yellow,
            },
            {
              label: "Employers",
              value: String(view.employerCount),
              footer: "Kind = employer",
              color: COLORS.amber,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        <table className="table-premium min-w-[720px]">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Kind</th>
              <th>Plan</th>
              <th>Members</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((row) => (
              <tr key={row.id}>
                <td className="font-medium">{row.nameLabel}</td>
                <td className="text-dim">{row.slugLabel}</td>
                <td className="text-dim capitalize">{row.kindLabel}</td>
                <td className="text-dim capitalize">{row.planLabel}</td>
                <td className="text-dim">{String(row.memberCount)}</td>
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
