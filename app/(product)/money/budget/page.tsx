"use client";

import dynamic from "next/dynamic";
import { MoneyShell } from "@/components/money/MoneyShell";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

const BudgetTab = dynamic(
  () => import("@/components/finance/BudgetTab").then((m) => m.BudgetTab),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading budget" rows={3} />,
  },
);

const BudgetCalendar = dynamic(
  () => import("@/components/finance/BudgetCalendar").then((m) => m.BudgetCalendar),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading calendar" rows={2} />,
  },
);

/**
 * Money · Track — ledger budget + calendar (same components as the former
 * finance Budget tab; chrome is now Money Reality).
 */
export default function MoneyBudgetPage() {
  return (
    <MoneyShell>
      <div className="space-y-10">
        <div>
          <h2 className="font-display text-xl text-light">Track</h2>
          <p className="mt-1 max-w-2xl text-sm text-dim">
            Your ledger is the source of truth. Edit here — Decide lenses read the same
            picture.
          </p>
        </div>
        <BudgetTab />
        <section aria-labelledby="money-calendar-heading" className="space-y-3">
          <h2 id="money-calendar-heading" className="font-display text-xl text-light">
            Calendar
          </h2>
          <BudgetCalendar />
        </section>
      </div>
    </MoneyShell>
  );
}
