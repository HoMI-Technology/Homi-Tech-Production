"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_FINANCE_STATE,
  hasSavedFinanceState,
  loadFinanceState,
  pullFinanceState,
  saveFinanceState,
  type FinanceState,
  type Temperature,
} from "@/lib/finance/store";
import { PageFrame } from "@/components/operate/PageFrame";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import dynamic from "next/dynamic";

function TabLoading({ label }: { label: string }) {
  return <ProductLoadingSkeleton label={label} rows={2} />;
}

const BudgetTab = dynamic(
  () => import("@/components/finance/BudgetTab").then((m) => m.BudgetTab),
  { ssr: false, loading: () => <TabLoading label="Loading budget" /> },
);

const BudgetCalendar = dynamic(
  () => import("@/components/finance/BudgetCalendar").then((m) => m.BudgetCalendar),
  { ssr: false, loading: () => <TabLoading label="Loading calendar" /> },
);

const PlanTab = dynamic(
  () => import("@/components/finance/PlanTab").then((m) => m.PlanTab),
  { ssr: false, loading: () => <TabLoading label="Loading plan" /> },
);

import { CashFlowTab } from "@/components/finance/legacy/CashFlowTab";
import { DebtTab } from "@/components/finance/legacy/DebtTab";
import { MonteCarloTab } from "@/components/finance/legacy/MonteCarloTab";
import { NetWorthTab } from "@/components/finance/legacy/NetWorthTab";
import { FinanceHero } from "@/components/finance/FinanceHero";
import { SignalsStrip } from "@/components/finance/SignalsStrip";
import { NudgeRail } from "@/components/finance/NudgeRail";
import { SpendDigestPanel } from "@/components/finance/SpendDigestPanel";
import { AgentInsightsPanel } from "@/components/finance/AgentInsightsPanel";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";

type TabKey = "overview" | "plan" | "budget" | "cashflow" | "calendar" | "debt" | "montecarlo" | "networth";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "plan", label: "Plan" },
  { key: "budget", label: "Budget" },
  { key: "calendar", label: "Calendar" },
  // Legacy localStorage cockpit — labels stay honest so dual-path is clear.
  { key: "cashflow", label: "Cash Flow (classic)" },
  { key: "debt", label: "Debt (classic)" },
  { key: "montecarlo", label: "Monte Carlo (classic)" },
  { key: "networth", label: "Net Worth (classic)" },
];

const TEMP_TEXT: Record<Temperature, string> = {
  emerald: "text-emerald",
  yellow: "text-yellow",
  amber: "text-amber",
  crimson: "text-crimson",
};

const TEMP_BG: Record<Temperature, string> = {
  emerald: "bg-verdict-ready",
  yellow: "bg-verdict-almost",
  amber: "bg-verdict-build",
  crimson: "bg-verdict-notyet",
};

export default function FinancePage() {
  const [state, setState] = useState<FinanceState>(DEFAULT_FINANCE_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  // True once the user edits anything — a late-arriving server copy must
  // never overwrite an edit already on screen.
  const dirtyRef = useRef(false);

  // Load persisted state once, after mount. The initial tab comes from the
  // URL hash via <Tabs hashSync> below. Local renders immediately; the
  // server copy reconciles in the background (last-write-wins —
  // lib/persistence.ts). Persist-on-change stays disabled until the pull
  // settles: hydrating defaults first and pulling second would stamp-and-push
  // defaults over a user's real cross-device numbers.
  useEffect(() => {
    setState(loadFinanceState());
    let cancelled = false;
    void pullFinanceState()
      .then((remote) => {
        if (!cancelled && remote && !dirtyRef.current) setState(remote);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, after hydration.
  useEffect(() => {
    if (!hydrated) return;
    saveFinanceState(state);
  }, [state, hydrated]);

  const patch = useCallback((partial: Partial<FinanceState>) => {
    dirtyRef.current = true;
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <p className="eyebrow">Operate · money</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Finance</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Your personal-finance cockpit. Enter numbers once — every tab reads the same honest picture.
      </p>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        idPrefix="finance"
        ariaLabel="Finance sections"
        hashSync
        className="mt-8"
      />

      <TabPanel idPrefix="finance" value={tab} className="mt-8">
        <FinanceShell tab={tab} state={state} patch={patch} />
      </TabPanel>
    </PageFrame>
  );
}

function FinanceShell({
  tab,
  state,
  patch,
}: {
  tab: TabKey;
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const dashboard = useFinanceDashboard();
  // Classic tabs seed sample numbers until the user saves — surface that once.
  const [sampleHint, setSampleHint] = useState(false);
  useEffect(() => {
    setSampleHint(!hasSavedFinanceState());
  }, []);

  const classicWithDefaults =
    tab === "cashflow" || tab === "montecarlo" || tab === "networth";

  return (
    <div className="space-y-8">
      {tab === "overview" && (
        <div className="space-y-6">
          <FinanceHero />
          <SignalsStrip
            signals={dashboard.signals}
            onAction={() => {}}
            onDismiss={() => {}}
          />
          <NudgeRail nudges={dashboard.nudges} onAction={() => {}} />
          <AgentInsightsPanel />
          <SpendDigestPanel />
        </div>
      )}
      {tab === "plan" && PlanTab !== null && <PlanTab />}
      {tab === "budget" && BudgetTab !== null && <BudgetTab />}
      {classicWithDefaults && sampleHint && (
        <p className="rounded-lg border border-line bg-slate-surface/40 px-4 py-3 text-sm text-dim">
          Sample starting numbers — edit any field and they save on this device.
        </p>
      )}
      {tab === "cashflow" && <CashFlowTab state={state} patch={patch} />}
      {tab === "debt" && <DebtTab />}
      {tab === "montecarlo" && <MonteCarloTab state={state} patch={patch} />}
      {tab === "networth" && <NetWorthTab state={state} patch={patch} />}
      {tab === "calendar" && BudgetCalendar !== null && <BudgetCalendar />}
    </div>
  );
}

