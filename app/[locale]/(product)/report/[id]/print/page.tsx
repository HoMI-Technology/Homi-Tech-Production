import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PILLARS, VERDICT_META, LEGAL_DISCLAIMER } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import { Wordmark } from "@/components/brand/Wordmark";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import { getUserEntitlements } from "@/lib/entitlements";
import type { AssessmentRow } from "@/types/database";
import { AutoPrint } from "./AutoPrint";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

export default async function ReportPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const skipPrint = sp.noprint === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.fullReport) {
    return (
      <UpgradePanel
        feature="report-print"
        body="Printable full reports with detailed pillar breakdowns are part of HōMI Plus."
        minTier="plus"
      />
    );
  }

  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const assessment = data as AssessmentRow | null;

  if (!assessment) {
    notFound();
  }

  const verdict = assessment.verdict ?? "NOT_YET";
  const meta = VERDICT_META[verdict];
  const subScores = (assessment.sub_scores ?? {}) as {
    financial?: Record<string, number>;
    emotional?: Record<string, number>;
    timing?: Record<string, number>;
  };
  const insights = (assessment.insights ?? {}) as { keyInsight?: string; nextSteps?: string[] };
  const hardStops = (assessment.hard_stops ?? []) as { code: string; message: string }[];
  const completedAt = assessment.completed_at ? new Date(assessment.completed_at) : new Date(assessment.created_at);

  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <AutoPrint skip={skipPrint} />

      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="flex items-center justify-between border-b border-black/15 pb-6">
          <div className="flex items-center gap-3">
            <Wordmark size="text-2xl" />
            <span className="text-sm text-black/60">Decision Readiness Report</span>
          </div>
          <span className="text-xs text-black/50">
            {completedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-5xl font-bold" style={{ fontFamily: "var(--font-score, monospace)" }}>
              {assessment.overall_score ?? "—"}
            </p>
            <p className="text-sm uppercase tracking-widest text-black/60">HōMI-Score out of 100</p>
          </div>
          <span
            className="rounded-full border px-4 py-1.5 text-sm font-semibold"
            style={{ borderColor: `${meta.color}80`, color: meta.color, background: `${meta.color}14` }}
          >
            {meta.label}
          </span>
        </div>

        <p className="mt-6 text-base">{meta.line}</p>

        {hardStops.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold">Protection signals</h2>
            <div className="mt-3 flex flex-col gap-3">
              {hardStops.map((stop) => (
                <div key={stop.code} className="rounded-lg border border-black/15 p-4">
                  <p className="text-sm">{stop.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-lg font-semibold">Pillar breakdown</h2>
          <table className="mt-4 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-black/30">
                <th className="py-2 text-black/70">Pillar</th>
                <th className="py-2 text-black/70">Score</th>
                <th className="py-2 text-black/70">Max</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/10">
                <td className="py-2 font-medium">{FINANCIAL.name}</td>
                <td className="py-2">{assessment.financial_score ?? "—"}</td>
                <td className="py-2 text-black/60">{PILLAR_MAX_POINTS.financial}</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-2 font-medium">{EMOTIONAL.name}</td>
                <td className="py-2">{assessment.emotional_score ?? "—"}</td>
                <td className="py-2 text-black/60">{PILLAR_MAX_POINTS.emotional}</td>
              </tr>
              <tr>
                <td className="py-2 font-medium">{TIMING.name}</td>
                <td className="py-2">{assessment.timing_score ?? "—"}</td>
                <td className="py-2 text-black/60">{PILLAR_MAX_POINTS.timing}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {(subScores.financial || subScores.emotional || subScores.timing) && (
          <div className="mt-10 flex flex-col gap-6">
            {subScores.financial && <SubScoreList title="Financial Reality" scores={subScores.financial} />}
            {subScores.emotional && <SubScoreList title="Emotional Truth" scores={subScores.emotional} />}
            {subScores.timing && <SubScoreList title="Perfect Timing" scores={subScores.timing} />}
          </div>
        )}

        {insights.keyInsight && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">Key insight</h2>
            <p className="mt-3 text-base leading-relaxed">{insights.keyInsight}</p>
          </div>
        )}

        {insights.nextSteps && insights.nextSteps.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold">Next steps</h2>
            <ol className="mt-3 flex flex-col gap-2">
              {insights.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3 text-base">
                  <span className="font-semibold text-black/70">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-12 border-t border-black/15 pt-6">
          <p className="text-xs leading-relaxed text-black/60">{LEGAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}

function SubScoreList({ title, scores }: { title: string; scores: Record<string, number> }) {
  const entries = Object.entries(scores).filter(([key]) => key !== "total" && key !== "singleRedistribution");
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {entries.map(([key, value]) => (
          <li key={key} className="flex justify-between text-sm text-black/70">
            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="font-medium text-black">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
