import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillsWorkspaceV4 } from "@/components/v4/bills/BillsWorkspaceV4";
import { isV4HomeEnabled } from "@/lib/auth/keep-routes";
import { assertAssessmentResultOnly } from "@/lib/v4/home-state";
import { loadSystemV4LastRead } from "@/lib/v4/system-read";
import {
  billsV4VisualView,
  buildBillsV4View,
  parseV4BillsVisualState,
} from "@/lib/v4/bills-workspace";
import { isV4VisualFixtureEnabled } from "@/lib/v4/visual-fixture";

export const metadata: Metadata = {
  title: "Bills",
  description: "Quiet bills workspace. Empty or live ledger only — never invent due amounts.",
  alternates: { canonical: "/money/bills" },
  robots: { index: false, follow: false },
};

/**
 * Bills v4 — V4_PENDING `/money/bills` (covered by `/money` prefix).
 * Empty honesty. Deep-link Money. Never writes a score.
 */
export default async function MoneyBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ visual?: string }>;
}) {
  if (!isV4HomeEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const visual = isV4VisualFixtureEnabled() ? parseV4BillsVisualState(params.visual) : null;

  assertAssessmentResultOnly("assessment_result");

  if (visual) {
    return <BillsWorkspaceV4 view={billsV4VisualView(visual)} />;
  }

  const reading = await loadSystemV4LastRead();
  return <BillsWorkspaceV4 view={buildBillsV4View(reading)} />;
}
