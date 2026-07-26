import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
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

  const completed = assessments.filter((a) => a.verdict !== null).length;
  const scores = assessments
    .map((a) => a.overall_score)
    .filter((s): s is number => s != null);
  const avg =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const shadows = assessments.filter((a) => a.is_shadow).length;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Assessments"
        description="Most recent 50 assessments across all users."
      />

      <div className="mt-6">
        <MetricRail
          cells={[
            {
              label: "Shown",
              value: String(assessments.length),
              footer: "Latest window",
              color: "#22d3ee",
            },
            {
              label: "Completed",
              value: String(completed),
              footer: "With verdict",
              color: "#34d399",
            },
            {
              label: "Avg score",
              value: avg !== null ? String(avg) : "—",
              footer: "In window",
              color: "#facc15",
            },
            {
              label: "Shadow",
              value: String(shadows),
              footer: "Quick reads",
              color: "#fab633",
            },
          ]}
        />
      </div>

      <div className="glass mt-6 table-scroll">
        {assessments.length === 0 ? (
          <p className="p-10 text-center text-sm text-dim">No assessments yet.</p>
        ) : (
          <table className="table-premium min-w-[760px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Verdict</th>
                <th>Type</th>
                <th>Hard stops</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="text-dim">{formatDate(a.created_at)}</td>
                  <td className="score-numeral font-semibold">{a.overall_score ?? "—"}</td>
                  <td>
                    {a.verdict ? (
                      <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                    ) : (
                      <span className="chip !border-slate-high/50 !text-xs !text-dim">In progress</span>
                    )}
                  </td>
                  <td>
                    {a.is_shadow ? (
                      <span className="text-xs font-semibold text-cyan">Shadow</span>
                    ) : (
                      <span className="text-xs text-dim">Full</span>
                    )}
                  </td>
                  <td>
                    {Array.isArray(a.hard_stops) && a.hard_stops.length > 0 ? (
                      <span className="score-numeral text-sm font-semibold text-crimson">{a.hard_stops.length}</span>
                    ) : (
                      <span className="text-dim">0</span>
                    )}
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
