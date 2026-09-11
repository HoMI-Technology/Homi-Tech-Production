import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { AdminRoomEmptyV4 } from "@/components/v4/admin/AdminRoomEmptyV4";
import { PageFrame } from "@/components/operate/PageFrame";
import { PageHeader } from "@/components/operate/PageHeader";
import { MetricRail } from "@/components/operate/MetricRail";
import type { AssessmentRow } from "@/types/database";
import { COLORS, type VerdictKey } from "@/lib/brand";
import { scoreBand, type ScoreBand } from "@/lib/receipts";

const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  high: "High",
  moderate: "Moderate",
  emerging: "Emerging",
  early: "Early",
};

export const metadata: Metadata = {
  title: "Assessments | Admin | HōMI",
  description: "Recent assessment activity across the platform.",
};

function receiptBandLabel(score: number | null): string {
  if (score == null) return "—";
  return SCORE_BAND_LABEL[scoreBand(score)];
}

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
  const waitCount = assessments.filter(
    (a) => a.verdict === "BUILD_FIRST" || a.verdict === "NOT_YET",
  ).length;
  const shadows = assessments.filter((a) => a.is_shadow).length;

  return (
    <PageFrame role="admin" density="compact">
      {assessments.length === 0 ? (
        <AdminRoomEmptyV4 title="No assessments yet." />
      ) : (
        <>
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
              color: COLORS.cyan,
            },
            {
              label: "Completed",
              value: String(completed),
              footer: "With verdict",
              color: COLORS.emerald,
            },
            {
              label: "Wait",
              value: String(waitCount),
              footer: "BUILD FIRST + not yet",
              color: COLORS.yellow,
            },
            {
              label: "Shadow",
              value: String(shadows),
              footer: "Quick reads",
              color: COLORS.amber,
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
                <th>Band</th>
                <th>Verdict</th>
                <th>Type</th>
                <th>Hard stops</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id}>
                  <td className="text-dim">{formatDate(a.created_at)}</td>
                  <td className="text-sm text-dim">{receiptBandLabel(a.overall_score)}</td>
                  <td>
                    {a.verdict ? (
                      <VerdictBadge verdict={a.verdict as VerdictKey} size="sm" />
                    ) : (
                      <span className="chip !border-slate-high/50 !text-xs !text-dim">
                        In progress
                      </span>
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
                      <span className="score-numeral text-sm font-semibold text-crimson">
                        {a.hard_stops.length}
                      </span>
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
        </>
      )}
    </PageFrame>
  );
}
