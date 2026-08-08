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
  return (
    <MoneyShell>
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl text-light">Plan</h2>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Build path, housing, debt, and household plan modules — educational guidance only.
          </p>
        </div>
        <PlanCommand />
      </div>
    </MoneyShell>
  );
}
