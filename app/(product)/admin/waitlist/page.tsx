import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { WaitlistEntry } from "@/types/database";

export const metadata: Metadata = {
  title: "Waitlist | Admin | HōMI",
  description: "Waitlist signups and interest areas.",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export default async function AdminWaitlistPage() {
  const supabase = await createClient();

  let entries: WaitlistEntry[] = [];
  try {
    const { data } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    entries = (data as WaitlistEntry[] | null) ?? [];
  } catch {
    entries = [];
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-light md:text-3xl">Waitlist</h1>
      <p className="mt-1 text-sm text-dim">{entries.length.toLocaleString()} entries shown.</p>

      <div className="glass mt-6 overflow-x-auto">
        {entries.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No waitlist signups yet.</p>
        ) : (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-surface/60 text-xs uppercase tracking-wide text-dim">
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Interests</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-surface/40">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-6 py-3 text-light">{e.email}</td>
                  <td className="px-6 py-3 text-dim">
                    {e.interested_in && e.interested_in.length > 0 ? e.interested_in.join(", ") : "—"}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center rounded-full border border-slate-high/60 bg-slate-surface px-2.5 py-0.5 text-xs font-semibold capitalize text-light">
                      {e.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-dim">{formatDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
