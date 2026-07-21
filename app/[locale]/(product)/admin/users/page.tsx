import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RoleBadge, TierBadge } from "@/components/admin/Badge";
import type { Profile } from "@/types/database";

export const metadata: Metadata = {
  title: "Users | Admin | HōMI",
  description: "Read-only directory of HōMI accounts.",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

  return (
    <div>
      <p className="eyebrow">Directory</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Users</h1>
      <p className="mt-1 text-sm text-dim">
        Read-only directory. {users.length.toLocaleString()} shown
        {paid > 0 ? ` · ${paid.toLocaleString()} on paid tiers` : ""}.
      </p>

      <div className="glass mt-6 overflow-x-auto">
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
                  <td>{u.email}</td>
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
