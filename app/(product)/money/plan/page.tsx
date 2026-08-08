"use client";

import dynamic from "next/dynamic";
import { MoneyShell } from "@/components/money/MoneyShell";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

const PlanTab = dynamic(
  () => import("@/components/finance/PlanTab").then((m) => m.PlanTab),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading plan" rows={3} />,
  },
);

/**
 * Money · Plan — Threshold Compass / build path money framing.
 */
export default function MoneyPlanPage() {
  return (
    <MoneyShell>
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-xl text-light">Plan</h2>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Build path from your money temperatures — not another budget guilt loop.
          </p>
        </div>
        <PlanTab />
      </div>
    </MoneyShell>
  );
}
