import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signInRedirect } from "@/lib/auth/signInRedirect";
import { PILLARS, VERDICT_META, LEGAL_DISCLAIMER } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { Wordmark } from "@/components/brand/Wordmark";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { PrintButton } from "@/components/assessment/PrintButton";
import { ShareScoreButton } from "@/components/share/ShareScoreButton";
import { VerdictOverride } from "@/components/assessment/VerdictOverride";
import { TrinityBar } from "@/components/assessment/TrinityBar";
import { UpgradePanel } from "@/components/ui/UpgradePanel";
import { getUserEntitlements } from "@/lib/entitlements";
import type { AssessmentRow } from "@/types/database";

const FINANCIAL = PILLARS.find((p) => p.key === "financial")!;
const EMOTIONAL = PILLARS.find((p) => p.key === "emotional")!;
const TIMING = PILLARS.find((p) => p.key === "timing")!;

/**
 * Surface roles (D4 — all four readiness surfaces stay, each with one job):
 * - /results — the verdict MOMENT: score reveal, pillars, insight, immediate CTAs.
 * - /path    — the ongoing plan-to-ready: binding-constraint sequence over time.
 * - /plan    — simple next-steps checklist derived from the latest result.
 * - /report/{id} — the persisted, shareable/printable RECORD of one assessment.
 * Don't duplicate one surface's job on another — link across instead.
 */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return signInRedirect(`/report/${id}`);
  }

  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.fullReport) {
    return (
      <UpgradePanel
        feature="full-report"
        body="The detailed pillar breakdown, printable report, and readiness credential are part of HōMI Plus."
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
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 print:max-w-full print:px-8 print:py-8">
      <div className="flex items-center justify-between border-b border-slate-surface/60 pb-6 print:border-black/20">
        <div className="flex items-center gap-3">
          <Wordmark size="text-2xl" />
          <span className="text-sm text-dim print:text-black/60">Decision Readiness Report</span>
        </div>
        <PrintButton assessmentId={assessment.id} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-dim print:text-black/60">
            {completedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <p className="score-numeral mt-2 text-5xl font-bold text-light print:text-black">
            {assessment.overall_score ?? "—"}
          </p>
          <p className="text-sm uppercase tracking-widest text-dim print:text-black/60">HōMI-Score out of 100</p>
        </div>
        <VerdictBadge verdict={verdict} size="lg" />
      </div>

      <p className="mt-6 text-base text-light print:text-black">{meta.line}</p>

      {hardStops.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-light print:text-black">Protection signals</h2>
          <div className="mt-3 flex flex-col gap-3">
            {hardStops.map((stop) => (
              <div key={stop.code} className="glass border border-crimson/50 p-4 print:border print:border-black/20 print:bg-transparent">
                <p className="text-sm text-light print:text-black">{stop.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="font-display text-lg font-semibold text-light print:text-black">Pillar breakdown</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-surface/60 print:border-black/30">
              <th className="py-2 text-dim print:text-black/70">Pillar</th>
              <th className="py-2 text-dim print:text-black/70">Score</th>
              <th className="py-2 text-dim print:text-black/70">Max</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-surface/40 print:border-black/10">
              <td className="py-2 font-medium text-light print:text-black">{FINANCIAL.name}</td>
              <td className="py-2 text-light print:text-black">{assessment.financial_score ?? "—"}</td>
              <td className="py-2 text-dim print:text-black/60">{PILLAR_MAX_POINTS.financial}</td>
            </tr>
            <tr className="border-b border-slate-surface/40 print:border-black/10">
              <td className="py-2 font-medium text-light print:text-black">{EMOTIONAL.name}</td>
              <td className="py-2 text-light print:text-black">{assessment.emotional_score ?? "—"}</td>
              <td className="py-2 text-dim print:text-black/60">{PILLAR_MAX_POINTS.emotional}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-light print:text-black">{TIMING.name}</td>
              <td className="py-2 text-light print:text-black">{assessment.timing_score ?? "—"}</td>
              <td className="py-2 text-dim print:text-black/60">{PILLAR_MAX_POINTS.timing}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-10 print:hidden">
        <h2 className="font-display text-lg font-semibold text-light">Relative strength</h2>
        <p className="mt-1 text-xs text-dim">How your three pillars compare to each other, not just to their own max.</p>
        <div className="mt-4">
          <TrinityBar
            financial={assessment.financial_score ?? 0}
            emotional={assessment.emotional_score ?? 0}
            timing={assessment.timing_score ?? 0}
          />
        </div>
      </div>

      {(subScores.financial || subScores.emotional || subScores.timing) && (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {subScores.financial && (
            <SubScoreList title="Financial Reality" scores={subScores.financial} />
          )}
          {subScores.emotional && (
            <SubScoreList title="Emotional Truth" scores={subScores.emotional} />
          )}
          {subScores.timing && (
            <SubScoreList title="Perfect Timing" scores={subScores.timing} />
          )}
        </div>
      )}

      {insights.keyInsight && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-light print:text-black">Key insight</h2>
          <p className="mt-3 text-base leading-relaxed text-light print:text-black">{insights.keyInsight}</p>
        </div>
      )}

      {insights.nextSteps && insights.nextSteps.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-light print:text-black">Next steps</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {insights.nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-base text-light print:text-black">
                <span className="font-semibold text-cyan print:text-black/70">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-12 border-t border-slate-surface/60 pt-6 print:border-black/20">
        <p className="text-xs leading-relaxed text-dim/80 print:text-black/60">{LEGAL_DISCLAIMER}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 print:hidden">
        <Link href="/results" className="btn btn-ghost">
          Back to results
        </Link>
        <Link href={`/report/${assessment.id}/credential`} className="btn btn-ghost">
          View credential
        </Link>
        <ShareScoreButton assessmentId={assessment.id} />
      </div>

      <div className="mt-6 print:hidden">
        <VerdictOverride
          hardStops={hardStops}
          assessmentId={assessment.id}
          initialOverridden={Boolean(assessment.user_override)}
        />
      </div>
    </div>
  );
}

function SubScoreList({ title, scores }: { title: string; scores: Record<string, number> }) {
  const entries = Object.entries(scores).filter(([key]) => key !== "total" && key !== "singleRedistribution");
  return (
    <div>
      <h3 className="text-sm font-semibold text-light print:text-black">{title}</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {entries.map(([key, value]) => (
          <li key={key} className="flex justify-between text-sm text-dim print:text-black/70">
            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="font-medium text-light print:text-black">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
