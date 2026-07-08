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

  return (
    <div>
      <h1 className="font-display text-2xl text-light md:text-3xl">Users</h1>
      <p className="mt-1 text-sm text-dim">Read-only directory. {users.length.toLocaleString()} shown.</p>

      <div className="glass mt-6 overflow-x-auto">
        {users.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No users yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-surface/60 text-xs uppercase tracking-wide text-dim">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Tier</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-surface/40">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-3 text-light">{u.email}</td>
                  <td className="px-6 py-3 text-dim">{u.full_name || "—"}</td>
                  <td className="px-6 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-6 py-3">
                    <TierBadge tier={u.subscription_tier} />
                  </td>
                  <td className="px-6 py-3 text-dim">{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
