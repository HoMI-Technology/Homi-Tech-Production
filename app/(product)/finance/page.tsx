"use client";

import dynamic from "next/dynamic";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Budget Planner surface — closed-loop finance cockpit.
 * Classic dual-path tabs (Cash Flow / Debt / Monte Carlo / Net Worth)
 * were removed; ledger BudgetTab remains in the tree for PR4 bridge but
 * is no longer mounted here.
 */
const PlannerApp = dynamic(
  () =>
    import("@/components/planner/PlannerApp").then((m) => m.PlannerApp),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <ProductLoadingSkeleton label="Loading Budget Planner" rows={4} />
      </div>
    ),
  },
);

export default function FinancePage() {
  return <PlannerApp />;
}
