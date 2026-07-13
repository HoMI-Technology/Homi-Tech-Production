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

  // Interest → count over the fetched window, sorted by demand.
  const interestCounts = entries
    .flatMap((e) => e.interested_in ?? [])
    .reduce<Record<string, number>>((acc, i) => {
      acc[i] = (acc[i] ?? 0) + 1;
      return acc;
    }, {});
  const topInterests = Object.entries(interestCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <p className="eyebrow">Demand</p>
      <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Waitlist</h1>
      <p className="mt-1 text-sm text-dim">{entries.length.toLocaleString()} entries shown.</p>

      {topInterests.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {topInterests.map(([interest, count]) => (
            <span key={interest} className="chip">
              {interest}
              <span className="score-numeral text-dim">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="glass mt-6 overflow-x-auto">
        {entries.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No waitlist signups yet.</p>
        ) : (
          <table className="table-premium min-w-[680px]">
            <thead>
              <tr>
                <th>Email</th>
                <th>Interests</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.email}</td>
                  <td className="text-dim">
                    {e.interested_in && e.interested_in.length > 0 ? e.interested_in.join(", ") : "—"}
                  </td>
                  <td>
                    <span className="chip !text-xs capitalize">{e.status}</span>
                  </td>
                  <td className="text-dim">{formatDate(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
