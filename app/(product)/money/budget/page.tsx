"use client";

import dynamic from "next/dynamic";
import { MoneyShell } from "@/components/money/MoneyShell";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Money · Track — Budget Planner under shared MoneyShell.
 * PlannerApp embeds without a second PageFrame. Quiet depth under Path.
 */
const PlannerApp = dynamic(
  () => import("@/components/planner/PlannerApp").then((m) => m.PlannerApp),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading Budget Planner" rows={4} />,
  },
);

export default function MoneyBudgetPage() {
  return (
    <MoneyShell>
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">Budget · depth</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Budget</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm leading-relaxed text-dim">
        Ledger depth under Path — not a money home and not a score write.
      </p>
      <PlannerApp embedded />
    </MoneyShell>
  );
}
