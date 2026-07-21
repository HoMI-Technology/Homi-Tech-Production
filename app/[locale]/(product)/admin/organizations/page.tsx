import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/components/ui/StatTile";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { Organization } from "@/types/database";

export const metadata: Metadata = {
  title: "Organizations | HōMI Admin",
  description: "Employer and partner organizations, membership, and family accounts.",
};

interface OrgWithCount extends Organization {
  member_count: number;
}

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();

  let organizations: OrgWithCount[] = [];
  let familyAccountsCount = 0;
  let totalMembers = 0;

  try {
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const orgs = (data as Organization[] | null) ?? [];

    let counts: Record<string, number> = {};
    if (orgs.length > 0) {
      const { data: memberRows } = await supabase
        .from("organization_members")
        .select("organization_id")
        .limit(20000);
      const rows = (memberRows as { organization_id: string }[] | null) ?? [];
      counts = rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.organization_id] = (acc[r.organization_id] ?? 0) + 1;
        return acc;
      }, {});
      totalMembers = rows.length;
    }

    organizations = orgs.map((o) => ({ ...o, member_count: counts[o.id] ?? 0 }));
  } catch {
    organizations = [];
  }

  try {
    const { count } = await supabase.from("family_accounts").select("*", { count: "exact", head: true });
    familyAccountsCount = count ?? 0;
  } catch {
    familyAccountsCount = 0;
  }

  return (
    <div>
      <p className="eyebrow">B2B</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Organizations</h1>
      <p className="mt-1 text-sm text-dim">Employer and partner accounts, membership, and family households.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="Organizations" value={organizations.length.toLocaleString()} accent="#22d3ee" footer="Employer + partner" />
        <StatTile label="Organization members" value={totalMembers.toLocaleString()} accent="#34d399" footer="Across all orgs" />
        <StatTile label="Family accounts" value={familyAccountsCount.toLocaleString()} accent="#facc15" footer="Households" />
      </div>

      <div className="glass mt-8 p-6">
        <SectionHeader eyebrow="Accounts" title="All organizations" />
        {organizations.length === 0 ? (
          <p className="py-12 text-center text-sm text-dim">
            No organizations yet. Employer and partner accounts will appear here once created.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
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
                {organizations.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.name}</td>
                    <td className="text-dim">{o.slug}</td>
                    <td>
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize"
                        style={{
                          color: o.kind === "employer" ? "#22d3ee" : "#34d399",
                          borderColor: o.kind === "employer" ? "#22d3ee59" : "#34d39959",
                          background: o.kind === "employer" ? "#22d3ee1a" : "#34d3991a",
                        }}
                      >
                        {o.kind}
                      </span>
                    </td>
                    <td className="text-dim capitalize">{o.plan}</td>
                    <td className="score-numeral">{o.member_count.toLocaleString()}</td>
                    <td className="text-dim">
                      {new Date(o.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
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
