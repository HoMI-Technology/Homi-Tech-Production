"use client";

import dynamic from "next/dynamic";
import { MoneyModeNav } from "@/components/money/MoneyModeNav";
import { PageFrame } from "@/components/operate/PageFrame";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Money · Track - Budget Planner (sole closed-loop money surface).
 * Outer frame: Money mode chrome. Inner PlannerApp: instrument body.
 */
const PlannerApp = dynamic(
  () => import("@/components/planner/PlannerApp").then((m) => m.PlannerApp),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ProductLoadingSkeleton label="Loading Budget Planner" rows={4} />
      </div>
    ),
  },
);

export default function MoneyBudgetPage() {
  return (
    <>
      <PageFrame width="content" density="compact" role="personal">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-dim">
          Operate · reality · track
        </p>
        <h1 className="mt-1 font-display text-2xl tracking-tight text-light md:text-3xl">
          Money
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-dim">
          Stand for the picture. Track for the closed loop. Decide when the
          number is ready.
        </p>
        <MoneyModeNav />
      </PageFrame>
      <PlannerApp />
    </>
  );
}
