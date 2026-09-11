import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompareWorkspaceV4 } from "@/components/v4/compare/CompareWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import {
  hardStopCodes,
  leadingFoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { AssessmentRow } from "@/types/database";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import {
  buildCompareV4View,
  compareV4CardsFromToolScenarios,
  parseV4CompareVisualState,
  compareV4VisualView,
  type CompareV4SourceCard,
} from "@/lib/v4/compare-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";
import type { VerdictKey } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Educational what-ifs from approved templates. Never a second official score.",
  robots: { index: false, follow: false },
};

const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

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

type ToolScenarioRow = {
  id?: string;
  name?: string | null;
  lens_id?: string | null;
  created_at?: string | null;
};

/**
 * Compare v4 — V4_PENDING `/scenarios` in Shell v4 `main#main`.
 * Educational templates + live saved rows only. UI adapts; never writes a score.
 */
export default async function ScenariosPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4CompareVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <CompareWorkspaceV4 view={compareV4VisualView(visual)} />;
  }

  const user = await getCachedUser();
  const supabase = await getCachedClient();

  const [assessmentsR, savedR] = await Promise.all([
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
          .from("tool_scenarios")
          .select("id, name, lens_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] as ToolScenarioRow[], error: null }),
  ]);

  const latest = (assessmentsR.data ?? [])[0] ?? null;
  const savedError = savedR.error;
  const savedMissing =
    savedError?.code != null && INFRA_MISSING_CODES.has(savedError.code);
  const loadError = Boolean(savedError && !savedMissing);
  const savedRows = (savedMissing ? [] : ((savedR.data ?? []) as ToolScenarioRow[]));
  const saved: CompareV4SourceCard[] = compareV4CardsFromToolScenarios(
    savedRows.map((row, index) => ({
      id: typeof row.id === "string" && row.id ? row.id : `saved-${index}`,
      name: typeof row.name === "string" ? row.name : "",
      lensId: typeof row.lens_id === "string" ? row.lens_id : "scenario-studio",
      savedAt: typeof row.created_at === "string" && row.created_at ? row.created_at : "",
    })),
  );

  const stopCodes = hardStopCodes(latest?.hard_stops);

  const view = buildCompareV4View({
    decisionType: latest?.decision_type ?? undefined,
    verdict: (latest?.verdict as VerdictKey | null) ?? null,
    stopCode: latest ? leadingFoldHardStopCode(stopCodes) : null,
    lastMoneyMonths: lastMoneyMonths(latest?.inputs ?? null),
    saved,
    loadError,
  });

  return <CompareWorkspaceV4 view={view} />;
}
