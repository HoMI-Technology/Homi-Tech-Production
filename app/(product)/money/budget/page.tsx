"use client";

import dynamic from "next/dynamic";
import { MoneyModeNav } from "@/components/money/MoneyModeNav";
import { PageFrame } from "@/components/operate/PageFrame";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Money · Track — Budget Planner (PlannerApp after #160 absorb).
 * PlannerApp owns PageFrame; we only inject Money mode nav above it.
 */
const PlannerApp = dynamic(
  () => import("@/components/planner/PlannerApp").then((m) => m.PlannerApp),
  {
    ssr: false,
    loading: () => (
      <PageFrame width="content" density="spacious" role="personal">
        <ProductLoadingSkeleton label="Loading Budget Planner" rows={4} />
      </PageFrame>
    ),
  },
);

export default function MoneyBudgetPage() {
  return (
    <>
      <PageFrame width="content" density="compact" role="personal">
        <p className="eyebrow">Operate · reality · track</p>
        <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">Money</h1>
        <MoneyModeNav />
      </PageFrame>
      <PlannerApp />
    </>
  );
}
