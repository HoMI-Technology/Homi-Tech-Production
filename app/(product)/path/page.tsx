import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PathWorkspaceV4 } from "@/components/v4/path/PathWorkspaceV4";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";
import {
  hardStopCodes,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import {
  buildPathV4View,
  parseV4PathVisualState,
  pathV4VisualView,
  type PathV4SourceStep,
} from "@/lib/v4/path-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { VerdictKey } from "@/lib/brand";

void SURFACE_ROLES.path;

export const metadata: Metadata = {
  title: "Path",
  description: "The next moves from your last Decision Readiness Score.",
  robots: { index: false, follow: false },
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function lastMoneyMonths(inputs: Record<string, unknown> | null): number | null {
  if (!inputs) return null;
  const money: LastReadMoneyInputs = {
    debtToIncomeRatio: finiteNumber(inputs.debtToIncomeRatio),
    emergencyFundMonths: finiteNumber(inputs.emergencyFundMonths),
    savingsRate: finiteNumber(inputs.savingsRate),
    liquidDollars: finiteNumber(inputs.liquidDollars) ?? finiteNumber(inputs.liquidSavings),
  };
  return money.emergencyFundMonths;
}

function pathStepsFromPayload(path: unknown): PathV4SourceStep[] {
  if (!path || typeof path !== "object") return [];
  const steps = (path as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) return [];
  return steps as PathV4SourceStep[];
}

/**
 * Path v4 — V4_PENDING `/path` in Shell v4 `main#main`.
 * Engine stays lib/readiness/path.ts. UI adapts; no parallel score.
 */
export default async function PathPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4PathVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <PathWorkspaceV4 view={pathV4VisualView(visual)} />;
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
  const storedSteps = pathR.error || !pathR.data ? [] : pathStepsFromPayload(pathR.data.path);
  const stopCodes = hardStopCodes(latest?.hard_stops);

  const view = buildPathV4View(
    latest
      ? {
          decisionType: latest.decision_type ?? "home_buying",
          verdict: (latest.verdict as VerdictKey | null) ?? null,
          stopCode: leadingFoldHardStopCode(stopCodes),
          lastMoneyMonths: lastMoneyMonths(latest.inputs ?? null),
          steps: storedSteps,
        }
      : null,
  );

  return <PathWorkspaceV4 view={view} />;
}
