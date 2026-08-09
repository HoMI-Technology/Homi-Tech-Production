import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RoleBadge, TierBadge } from "@/components/admin/Badge";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import { COLORS } from "@/lib/brand";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Users | Admin | HōMI",
  description: "Read-only directory of HōMI accounts.",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function AdminUsersPage() {
  const supabase = await createClient();

  let users: Profile[] = [];
  try {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    users = (data as Profile[] | null) ?? [];
  } catch {
    users = [];
  }

  const paid = users.filter((u) => u.subscription_tier && u.subscription_tier !== "free").length;
  const admins = users.filter((u) => u.role === "admin").length;
  const partners = users.filter((u) => u.role === "partner").length;

  return (
    <div>
      <PageHeader eyebrow="Admin" title="Users" description="Read-only directory of accounts." />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: users.length.toLocaleString(),
              footer: "Latest 200",
              color: COLORS.cyan,
            },
            {
              label: "Paid",
              value: paid.toLocaleString(),
              footer: "Non-free tiers",
              color: COLORS.yellow,
            },
            {
              label: "Partners",
              value: partners.toLocaleString(),
              footer: "Role = partner",
              color: COLORS.emerald,
            },
            {
              label: "Admins",
              value: admins.toLocaleString(),
              footer: "Role = admin",
              color: COLORS.amber,
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        {users.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No users yet.</p>
        ) : (
          <table className="table-premium min-w-[720px]">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Role</th>
                <th>Tier</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="max-w-[10rem] truncate sm:max-w-none" title={u.email}>
                    {u.email}
                  </td>
                  <td className="text-dim">{u.full_name || "—"}</td>
                  <td>
                    <RoleBadge role={u.role} />
                  </td>
                  <td>
                    <TierBadge tier={u.subscription_tier} />
                  </td>
                  <td className="text-dim">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
