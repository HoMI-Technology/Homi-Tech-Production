import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/StatCard";
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
      <h1 className="font-display text-2xl text-light md:text-3xl">Organizations</h1>
      <p className="mt-1 text-sm text-dim">Employer and partner accounts, membership, and family households.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Organizations" value={organizations.length.toLocaleString()} accent="#22d3ee" />
        <StatCard label="Organization members" value={totalMembers.toLocaleString()} accent="#34d399" />
        <StatCard label="Family accounts" value={familyAccountsCount.toLocaleString()} accent="#facc15" />
      </div>

      <div className="mt-8 glass overflow-hidden p-0">
        <div className="p-6 pb-0">
          <h2 className="text-lg font-semibold text-light">All organizations</h2>
        </div>
        {organizations.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-dim">
            No organizations yet. Employer and partner accounts will appear here once created.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-t border-slate-surface/60 text-xs uppercase tracking-wide text-dim">
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium">Kind</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Members</th>
                  <th className="px-6 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-surface/60">
                {organizations.map((o) => (
                  <tr key={o.id}>
                    <td className="px-6 py-3 font-medium text-light">{o.name}</td>
                    <td className="px-6 py-3 text-dim">{o.slug}</td>
                    <td className="px-6 py-3">
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
                    <td className="px-6 py-3 text-dim capitalize">{o.plan}</td>
                    <td className="px-6 py-3 score-numeral text-light">{o.member_count.toLocaleString()}</td>
                    <td className="px-6 py-3 text-dim">
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
