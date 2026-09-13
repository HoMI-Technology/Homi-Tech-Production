import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { COLORS, type VerdictKey } from "@/lib/brand";
import { HomeV4 } from "@/components/v4/HomeV4";
import {
  foldPathPrimary,
  hardStopCodes,
  hardStopMessages,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import { assertAssessmentResultOnly, buildHomeV4View } from "@/lib/v4/home-state";
import {
  homeV4VisualReading,
  isV4VisualFixtureEnabled,
  parseV4VisualState,
} from "@/lib/v4/visual-fixture";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Home",
  description: "Your last Decision Readiness Score.",
  robots: { index: false, follow: false },
};

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

export default async function HomeV4Page({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4VisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    const view = buildHomeV4View(homeV4VisualReading(visual));
    return (
      <div style={{ ["--instrument-tint" as string]: COLORS.cyan } as CSSProperties}>
        <HomeV4 view={view} />
      </div>
    );
  }

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
          .limit(1)
      : Promise.resolve({ data: [] as AssessmentRow[], error: null }),
    user
      ? supabase
          .from("user_readiness_path")
          .select("path")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null as { path: unknown } | null, error: null }),
  ]);

  const latest = (assessmentsR.data ?? [])[0] ?? null;
  const pathPayload =
    pathR.error || !pathR.data ? null : (pathR.data as { path?: { steps?: unknown } }).path;
  const pathSteps = Array.isArray(pathPayload?.steps) ? pathPayload.steps : [];
  const stopMessages = hardStopMessages(latest?.hard_stops);
  const stopCodes = hardStopCodes(latest?.hard_stops);

  const view = buildHomeV4View(
    latest
      ? {
          overallScore: latest.overall_score,
          scoredAt: latest.completed_at ?? latest.created_at,
          financialScore: latest.financial_score,
          emotionalScore: latest.emotional_score,
          timingScore: latest.timing_score,
          verdict: (latest.verdict as VerdictKey | null) ?? null,
          stopMessages,
          stopCode: leadingFoldHardStopCode(stopCodes),
          stopCodes,
          decisionType: latest.decision_type ?? "home_buying",
          lastMoney: lastMoneyInputsFromRow(latest.inputs ?? null),
          pathPrimary: foldPathPrimary(pathSteps),
          pathSteps,
          moneyConnected: false,
        }
      : null,
  );

  return (
    <div style={{ ["--instrument-tint" as string]: COLORS.cyan } as CSSProperties}>
      <HomeV4 view={view} />
    </div>
  );
}
