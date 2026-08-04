"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_FINANCE_STATE,
  loadFinanceState,
  pullFinanceState,
  saveFinanceState,
  type FinanceState,
  type Temperature,
} from "@/lib/finance/store";
import { PageFrame } from "@/components/operate/PageFrame";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import dynamic from "next/dynamic";
import { financeV2 } from "@/lib/flags";

// Statically imported flag-gated components are not reliably tree-shaken
// (bundlers cannot always prove the module side-effect-free), so the Budget
// tab loads through next/dynamic: with the flag inlined to false at build
// time the import expression is dead code and the chunk is never referenced.
const BudgetTab = financeV2
  ? dynamic(() => import("@/components/finance/BudgetTab").then((m) => m.BudgetTab), {
      ssr: false,
      loading: () => null,
    })
  : null;

const BudgetCalendar = financeV2
  ? dynamic(() => import("@/components/finance/BudgetCalendar").then((m) => m.BudgetCalendar), {
      ssr: false,
      loading: () => null,
    })
  : null;

import { OverviewTab } from "@/components/finance/legacy/OverviewTab";
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

type TabKey = "overview" | "budget" | "cashflow" | "calendar" | "debt" | "montecarlo" | "networth";

const LEGACY_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "debt", label: "Debt" },
  { key: "montecarlo", label: "Monte Carlo" },
  { key: "networth", label: "Net Worth" },
];

const V2_TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "budget", label: "Budget" },
  { key: "calendar", label: "Calendar" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "debt", label: "Debt" },
  { key: "montecarlo", label: "Monte Carlo" },
  { key: "networth", label: "Net Worth" },
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
        tabs={financeV2 ? V2_TABS : LEGACY_TABS}
        value={tab}
        onChange={setTab}
        idPrefix="finance"
        ariaLabel="Finance sections"
        hashSync
        className="mt-8"
      />

      <TabPanel idPrefix="finance" value={tab} className="mt-8">
        {financeV2 ? (
          <FinanceV2Shell tab={tab} state={state} patch={patch} />
        ) : (
          <LegacyShell tab={tab} state={state} patch={patch} />
        )}
      </TabPanel>
    </PageFrame>
  );
}

function LegacyShell({
  tab,
  state,
  patch,
}: {
  tab: TabKey;
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  return (
    <>
      {tab === "overview" && <OverviewTab state={state} patch={patch} />}
      {tab === "budget" && BudgetTab !== null && <BudgetTab />}
      {tab === "cashflow" && <CashFlowTab state={state} patch={patch} />}
      {tab === "debt" && <DebtTab />}
      {tab === "montecarlo" && <MonteCarloTab state={state} patch={patch} />}
      {tab === "networth" && <NetWorthTab state={state} patch={patch} />}
    </>
  );
}

function FinanceV2Shell({
  tab,
  state,
  patch,
}: {
  tab: TabKey;
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const dashboard = useFinanceDashboard();

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
      {tab === "budget" && BudgetTab !== null && <BudgetTab />}
      {tab === "cashflow" && <CashFlowTab state={state} patch={patch} />}
      {tab === "debt" && <DebtTab />}
      {tab === "montecarlo" && <MonteCarloTab state={state} patch={patch} />}
      {tab === "networth" && <NetWorthTab state={state} patch={patch} />}
      {tab === "calendar" && BudgetCalendar !== null && <BudgetCalendar />}
    </div>
  );
}

