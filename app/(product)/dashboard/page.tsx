import { type CSSProperties } from "react";
import type { Metadata } from "next";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { verdictImproved } from "@/lib/dashboard/insight";
import { EntranceConductor } from "@/components/dashboard/Entrance";
import { ENTRANCE_BOOT_SCRIPT } from "@/components/dashboard/entrance-shared";
import { SidebarVerdictSync } from "@/components/dashboard/SidebarVerdictSync";
import { DashboardFoldBeacon } from "@/components/dashboard/DashboardFoldBeacon";
import { HomeFold } from "@/components/dashboard/HomeFold";
import {
  hardStopRecords,
  homeFoldSentence,
  pathStepCounts,
  shouldSuppressBuildPercent,
  weakestMeasuredPillar,
} from "@/lib/dashboard/fold-truth";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { PageFrame } from "@/components/operate/PageFrame";
import type { AssessmentRow, OutcomeSurvey } from "@/types/database";

export const metadata: Metadata = {
  title: "Dashboard | HōMI",
  description: "Your Path to Ready next move, Decision Readiness Score reading, and Companion line.",
};

// Surface role SSOT — keep import so F8 cannot drift to copy-pasted comments.
void SURFACE_ROLES.home;

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lastMoneyInputsFromRow(inputs: Record<string, unknown> | null): LastReadMoneyInputs | null {
  if (!inputs) return null;
  return {
    debtToIncomeRatio: finiteNumber(inputs.debtToIncomeRatio),
    emergencyFundMonths: finiteNumber(inputs.emergencyFundMonths),
    savingsRate: finiteNumber(inputs.savingsRate),
  };
}

export default async function DashboardPage() {
  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const [assessmentsR, surveysR, pathR] = await Promise.all([
    user
      ? supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(2)
      : Promise.resolve({ data: [] as AssessmentRow[], error: null }),
    user
      ? supabase
          .from("outcome_surveys")
          .select("*")
          .eq("user_id", user.id)
          .is("completed_at", null)
          .lt("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] as OutcomeSurvey[], error: null }),
    user
      ? supabase
          .from("user_readiness_path")
          .select("path")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { path: unknown } | null, error: null }),
  ]);

  const assessmentsFailed = Boolean(user && assessmentsR.error);
  const assessmentRows: AssessmentRow[] = assessmentsR.data ?? [];
  const latest = assessmentRows[0] ?? null;
  const previousAssessment = assessmentRows[1] ?? null;
  const stopRecords = hardStopRecords(latest?.hard_stops);
  const stopMessages = stopRecords.map((row) => row.message);
  const stopCodes = stopRecords.map((row) => row.code).filter(Boolean);
  const hardStopCount = stopMessages.length;
  const suppressBuildPercent = shouldSuppressBuildPercent(hardStopCount);
  const pathPayload =
    pathR.error || !pathR.data
      ? null
      : (pathR.data as { path?: { steps?: unknown; createdAt?: unknown } }).path;
  const pathSteps = Array.isArray(pathPayload?.steps) ? pathPayload.steps : [];
  const { done: pathDone, total: pathTotal } = pathStepCounts(pathSteps);
  const pathCreatedAt =
    pathPayload && typeof pathPayload.createdAt === "string" ? pathPayload.createdAt : null;
  const dueSurvey: OutcomeSurvey | null = surveysR.data?.[0] ?? null;
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const improved = verdictImproved(latest?.verdict ?? null, previousAssessment?.verdict ?? null);
  const weakestPillar = latest
    ? weakestMeasuredPillar({
        financial: latest.financial_score,
        emotional: latest.emotional_score,
        timing: latest.timing_score,
      })
    : null;
  const lastReadAt = latest?.completed_at ?? latest?.created_at ?? null;
  const staleDays = daysSince(lastReadAt);
  const foldSentence = homeFoldSentence({
    hardStopCount,
    hardStopCode: stopCodes[0] ?? null,
    weakestPillar,
    hasPath: pathSteps.length > 0,
    hasAssessment: latest !== null,
  });
  const instrumentTint = verdict ? VERDICT_META[verdict].color : COLORS.cyan;
  const fieldStyle = {
    "--field-tint": `${instrumentTint}14`,
    "--instrument-tint": instrumentTint,
  } as CSSProperties;

  return (
    <PageFrame id="dash-root" role="personal" density="compact" style={fieldStyle}>
      <script dangerouslySetInnerHTML={{ __html: ENTRANCE_BOOT_SCRIPT }} />
      <DashboardFoldBeacon
        hasAssessment={latest ? 1 : 0}
        hardStopCount={hardStopCount}
        hasPath={pathSteps.length > 0 ? 1 : 0}
      />
      <EntranceConductor containerId="dash-root" />
      <SidebarVerdictSync
        verdict={verdict}
        score={latest?.overall_score ?? null}
        decisionType={latest?.decision_type ?? null}
      />

      <div className="dash-stage">
        <HomeFold
          assessmentsFailed={assessmentsFailed}
          latest={
            latest
              ? {
                  id: latest.id,
                  overallScore: latest.overall_score,
                }
              : null
          }
          verdict={verdict}
          stopMessages={stopMessages}
          stopCodes={stopCodes}
          suppressBuildPercent={suppressBuildPercent}
          improved={improved}
          foldSentence={foldSentence}
          instrumentTint={instrumentTint}
          dueSurvey={dueSurvey ? { id: dueSurvey.id, kind: dueSurvey.kind } : null}
          staleDays={staleDays}
          lastReadAt={lastReadAt}
          lastMoney={lastMoneyInputsFromRow(latest?.inputs ?? null)}
          hasPath={pathSteps.length > 0}
          pathDone={pathDone}
          pathTotal={pathTotal}
          pathHeldDays={daysSince(pathCreatedAt)}
        />
      </div>
    </PageFrame>
  );
}
