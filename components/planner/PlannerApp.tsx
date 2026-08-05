"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PageFrame } from "@/components/operate/PageFrame";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { usePlannerStore } from "@/lib/planner/store";
import { PlannerPage } from "@/components/planner/PlannerPage";
import { hydratePlannerFromLedger } from "@/lib/planner/ledger-bridge";

const OverviewCommand = dynamic(
  () =>
    import("@/components/planner/overview/OverviewCommand").then(
      (m) => m.default ?? m.OverviewCommand,
    ),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading overview" rows={3} />,
  },
);
const DecisionCalendar = dynamic(
  () => import("@/components/planner/calendar/DecisionCalendar"),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading calendar" rows={3} />,
  },
);
const BankingCommand = dynamic(
  () => import("@/components/planner/banking/BankingCommand"),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading banks" rows={3} />,
  },
);
const WealthCommand = dynamic(
  () => import("@/components/planner/wealth/WealthCommand"),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading wealth" rows={3} />,
  },
);
const PlanCommand = dynamic(
  () => import("@/components/planner/plan/PlanCommand"),
  {
    ssr: false,
    loading: () => <ProductLoadingSkeleton label="Loading plan" rows={3} />,
  },
);

export function PlannerApp() {
  const hasHydrated = usePlannerStore((s) => s._hasHydrated);
  const setHasHydrated = usePlannerStore((s) => s.setHasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = usePlannerStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
      setReady(true);
      hydratePlannerFromLedger();
    });
    if (usePlannerStore.persist.hasHydrated()) {
      setHasHydrated(true);
      setReady(true);
      hydratePlannerFromLedger();
    }
    const t = window.setTimeout(() => {
      setHasHydrated(true);
      setReady(true);
      hydratePlannerFromLedger();
    }, 800);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHasHydrated]);

  if (!ready && !hasHydrated) {
    return (
      <PageFrame width="content" density="spacious" role="personal">
        <ProductLoadingSkeleton label="Loading Budget Planner" rows={4} />
      </PageFrame>
    );
  }

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <PlannerPage
        overview={<OverviewCommand />}
        calendar={<DecisionCalendar />}
        banking={<BankingCommand />}
        wealth={<WealthCommand />}
        plan={<PlanCommand />}
      />
      <p className="mt-10 text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
    </PageFrame>
  );
}
