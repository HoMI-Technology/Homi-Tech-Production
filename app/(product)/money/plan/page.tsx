"use client";

import dynamic from "next/dynamic";
import { MoneyShell } from "@/components/money/MoneyShell";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

const PlanCommand = dynamic(
  () => import("@/components/planner/plan/PlanCommand").then((m) => m.PlanCommand),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading plan" rows={3} />,
  },
);

/**
 * Money · Plan — planner plan command surface.
 */
export default function MoneyPlanPage() {
  // PlanCommand owns its PLAN LAB header — do not stack a second h2 here.
  return (
    <MoneyShell>
      <PlanCommand />
    </MoneyShell>
  );
}
