"use client";

import dynamic from "next/dynamic";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

/**
 * Budget Planner surface — closed-loop finance cockpit (sole /finance UI).
 * Classic dual-path tabs and legacy finance chrome were removed in #160.
 * Transaction dual-write lands in lib/planner/ledger-bridge.ts.
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
