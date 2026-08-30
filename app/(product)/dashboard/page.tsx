import { type CSSProperties } from "react";
import type { Metadata } from "next";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import { COLORS, type VerdictKey } from "@/lib/brand";
import { EntranceConductor } from "@/components/dashboard/Entrance";
import { ENTRANCE_BOOT_SCRIPT } from "@/components/dashboard/entrance-shared";
import { SidebarVerdictSync } from "@/components/dashboard/SidebarVerdictSync";
import { DashboardFoldBeacon } from "@/components/dashboard/DashboardFoldBeacon";
import { ThresholdFold } from "@/components/dashboard/ThresholdFold";
import { foldPathPrimary, hardStopMessages } from "@/lib/dashboard/fold-truth";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { PageFrame } from "@/components/operate/PageFrame";
import type { AssessmentRow } from "@/types/database";

export const metadata: Metadata = {
  title: "HōMI",
  description: "Your last Decision Readiness Score on the Threshold Compass.",
};

// Surface role SSOT — keep import so F8 cannot drift to copy-pasted comments.
void SURFACE_ROLES.home;

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lastMoneyInputsFromRow(inputs: Record<string, unknown> | null): LastReadMoneyInputs | null {
  if (!inputs) return null;
  return {
    debtToIncomeRatio: finiteNumber(inputs.debtToIncomeRatio),
    emergencyFundMonths: finiteNumber(inputs.emergencyFundMonths),
    savingsRate: finiteNumber(inputs.savingsRate),
    liquidDollars: finiteNumber(inputs.liquidDollars) ?? finiteNumber(inputs.liquidSavings),
  };
}

export default async function DashboardPage() {
  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const [assessmentsR, pathR] = await Promise.all([
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
          .from("user_readiness_path")
          .select("path")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { path: unknown } | null, error: null }),
  ]);

  const assessmentsFailed = Boolean(user && assessmentsR.error);
  const assessmentRows: AssessmentRow[] = assessmentsR.data ?? [];
  const latest = assessmentRows[0] ?? null;
  const stopMessages = hardStopMessages(latest?.hard_stops);
  const hardStopCount = stopMessages.length;
  const pathPayload =
    pathR.error || !pathR.data ? null : (pathR.data as { path?: { steps?: unknown } }).path;
  const pathSteps = Array.isArray(pathPayload?.steps) ? pathPayload.steps : [];
  const pathPrimary = foldPathPrimary(pathSteps);
  const verdict = (latest?.verdict as VerdictKey | null) ?? null;
  const instrumentTint = COLORS.cyan;
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
        <ThresholdFold
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
          lastMoney={lastMoneyInputsFromRow(latest?.inputs ?? null)}
          pathPrimary={pathPrimary}
        />
      </div>
    </PageFrame>
  );
}
