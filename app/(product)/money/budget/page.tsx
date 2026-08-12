"use client";

import dynamic from "next/dynamic";
import { MoneyShell } from "@/components/money/MoneyShell";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Money · Track — Budget Planner under shared MoneyShell (one header + mode nav).
 * PlannerApp embeds without a second PageFrame.
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
      <PlannerApp embedded />
    </MoneyShell>
  );
}
