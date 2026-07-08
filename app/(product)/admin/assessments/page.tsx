import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { AssessmentRow } from "@/types/database";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Assessments | Admin | HōMI",
  description: "Recent assessment activity across the platform.",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function AdminAssessmentsPage() {
  const supabase = await createClient();

  let assessments: AssessmentRow[] = [];
  try {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    assessments = (data as AssessmentRow[] | null) ?? [];
  } catch {
    assessments = [];
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-light md:text-3xl">Assessments</h1>
      <p className="mt-1 text-sm text-dim">Most recent 50 assessments across all users.</p>

      <div className="glass mt-6 overflow-x-auto">
        {assessments.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No assessments yet.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-surface/60 text-xs uppercase tracking-wide text-dim">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Verdict</th>
                <th className="px-6 py-3 font-medium">Shadow</th>
                <th className="px-6 py-3 font-medium">Hard stops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-surface/40">
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-3 text-dim">{formatDate(a.created_at)}</td>
                  <td className="score-numeral px-6 py-3 font-semibold text-light">
                    {a.overall_score ?? "—"}
                  </td>
                  <td className="px-6 py-3">
                    {a.verdict ? (
                      <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                    ) : (
                      <span className="text-xs text-dim">In progress</span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {a.is_shadow ? (
                      <span className="text-xs font-semibold text-cyan">Shadow</span>
                    ) : (
                      <span className="text-xs text-dim">Full</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-dim">
                    {Array.isArray(a.hard_stops) ? a.hard_stops.length : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
