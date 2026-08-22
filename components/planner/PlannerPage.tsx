"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  Target,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { usePlannerStore } from "@/lib/planner/store";
import { ReadinessHero } from "@/components/planner/ReadinessHero";
import { SignalsStrip } from "@/components/planner/SignalsStrip";
import { NudgeRail } from "@/components/planner/NudgeRail";
import { ImpactToast } from "@/components/planner/ImpactToast";
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog";
import { TrackBottomStrip } from "@/components/planner/TrackBottomStrip";
import {
  financialReality,
  summarizePortfolio,
  totalNetWorth,
  upcomingBillsTotal,
} from "@/lib/planner/derived";
import { derivePlannerSignals } from "@/lib/planner/signals";
import { deriveBehaviorNudges } from "@/lib/planner/nudges";
import { analyzeStress } from "@/lib/planner/stress";
import { getLastScoreResult } from "@/lib/planner/score-bridge";

/** Section keys for the Track workspace. "plan" is not a tab — it routes to Money · Plan. */
export type PlannerTabKey =
  "overview" | "calendar" | "transactions" | "goals" | "banking" | "wealth" | "plan";

const SECTION_TABS: { key: Exclude<PlannerTabKey, "plan">; label: string; icon: ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
  { key: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
  { key: "transactions", label: "Transactions", icon: <ListOrdered className="h-4 w-4" /> },
  { key: "goals", label: "Goals", icon: <Target className="h-4 w-4" /> },
  { key: "banking", label: "Banks & bills", icon: <Landmark className="h-4 w-4" /> },
  { key: "wealth", label: "Wealth", icon: <LineChart className="h-4 w-4" /> },
];

/** Hashes that belong to Money · Plan (not Track section tabs). */
const PLAN_HASHES = new Set(["plan", "debt", "consolidate", "consolidation", "montecarlo"]);

/** Map legacy finance hashes → planner section tabs (bookmarks). */
const HASH_ALIASES: Record<string, Exclude<PlannerTabKey, "plan">> = {
  overview: "overview",
  budget: "overview",
  cashflow: "overview",
  calendar: "calendar",
  transactions: "transactions",
  goals: "goals",
  ledger: "transactions",
  networth: "wealth",
  banking: "banking",
  wealth: "wealth",
};

function hashRaw(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "").toLowerCase();
}

function tabFromHash(): Exclude<PlannerTabKey, "plan"> {
  const raw = hashRaw();
  if (PLAN_HASHES.has(raw)) return "overview";
  return HASH_ALIASES[raw] ?? "overview";
}

/* ------------------------------------------------------------------ */
/* First-visit demo seed (ported from the reference PlannerPage)       */
/* ------------------------------------------------------------------ */

/**
 * Marker key for "this device has opened the planner before". The
 * planner persist envelope is written during hydration itself, so it
 * cannot double as a first-visit signal — this marker can: it is set
 * exactly once, on the first mounted visit, and `Clear data` never
 * removes it (a cleared workspace stays honestly empty).
 */
const PLANNER_VISITED_KEY = "homi-planner-visited-v1";

/**
 * On the very first visit seed the demo workspace so the shell lands
 * with sample numbers. Later visits — including post-`Clear data` —
 * never reseed. The seeding path is the exact one the toolbar's
 * "Load sample numbers" confirm runs (`loadSampleNumbers`), called
 * as-is.
 */
function useFirstVisitDemoSeed(loadSample: () => void) {
  const hydrated = usePlannerStore((s) => s._hasHydrated);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(PLANNER_VISITED_KEY) !== null) return;
      window.localStorage.setItem(PLANNER_VISITED_KEY, new Date().toISOString());
    } catch {
      return;
    }
    const s = usePlannerStore.getState();
    if (
      s.transactions.length === 0 &&
      s.accounts.length === 0 &&
      s.bills.length === 0
    ) {
      loadSample();
    }
  }, [hydrated, loadSample]);
}

export function PlannerPage({
  overview,
  calendar,
  transactionsPanel,
  goalsPanel,
  banking,
  wealth,
  embedded = false,
}: {
  overview: ReactNode;
  calendar: ReactNode;
  transactionsPanel: ReactNode;
  goalsPanel: ReactNode;
  banking: ReactNode;
  wealth: ReactNode;
  /** When true (Money · Track), skip the Budget Planner h1 — MoneyShell owns chrome. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Exclude<PlannerTabKey, "plan">>("overview");
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmSampleOpen, setConfirmSampleOpen] = useState(false);
  const clearWorkspace = usePlannerStore((s) => s.clearWorkspace);
  const resetDemo = usePlannerStore((s) => s.resetDemo);
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);
  const path = usePlannerStore((s) => s.path);
  const checkins = usePlannerStore((s) => s.checkins);
  const dismissedSignals = usePlannerStore((s) => s.dismissedSignals);
  const dismissSignal = usePlannerStore((s) => s.dismissSignal);
  const lastImpact = usePlannerStore((s) => s.lastImpact);
  const readinessProfile = usePlannerStore((s) => s.readinessProfile);
  const clearLastImpact = usePlannerStore((s) => s.clearLastImpact);

  useEffect(() => {
    const raw = hashRaw();
    if (PLAN_HASHES.has(raw)) {
      router.replace("/money/plan");
      return;
    }
    setTab(tabFromHash());
  }, [router]);

  const onTabChange = useCallback(
    (next: string) => {
      // Signals/nudges still emit actionTab: "plan" — one home is Money · Plan.
      if (next === "plan" || PLAN_HASHES.has(next)) {
        router.push("/money/plan");
        return;
      }
      const section = next as Exclude<PlannerTabKey, "plan">;
      setTab(section);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `#${section}`);
      }
    },
    [router],
  );

  const reality = useMemo(
    () => financialReality(transactions, accounts, bills),
    [transactions, accounts, bills],
  );
  const portfolio = useMemo(() => summarizePortfolio(holdings), [holdings]);
  const nw = useMemo(
    () => totalNetWorth(accounts, holdings, netWorthItems),
    [accounts, holdings, netWorthItems],
  );
  const stress = useMemo(() => analyzeStress(checkins), [checkins]);
  const assessment = getLastScoreResult();

  const signals = useMemo(
    () =>
      derivePlannerSignals({
        income: reality.income,
        cashFlow: reality.cashFlow,
        savingsRate: reality.savingsRate,
        runwayMonths: Number.isFinite(reality.runwayMonths) ? reality.runwayMonths : 99,
        dti: reality.dti,
        bills,
        path,
        assessment,
        portfolioValue: portfolio.marketValue,
        netWorth: nw.netWorth,
        dismissedIds: dismissedSignals,
        checkins,
      }),
    [
      reality,
      bills,
      path,
      assessment,
      portfolio.marketValue,
      nw.netWorth,
      dismissedSignals,
      checkins,
    ],
  );

  const nudges = useMemo(
    () =>
      deriveBehaviorNudges({
        assessment,
        bills,
        path,
        stress,
        cashFlow: reality.cashFlow,
        runwayMonths: Number.isFinite(reality.runwayMonths) ? reality.runwayMonths : 99,
        savingsRate: reality.savingsRate,
        lastScoreDelta: lastImpact?.delta ?? null,
        partnerAlignment: readinessProfile.partnerAlignment,
      }).slice(0, 3),
    [assessment, bills, path, stress, reality, lastImpact, readinessProfile.partnerAlignment],
  );

  const hasData =
    transactions.length > 0 || accounts.length > 0 || bills.length > 0 || holdings.length > 0;

  const loadSampleNumbers = useCallback(() => {
    resetDemo();
    // Demo parity (pinned by __tests__/planner/store-parity.test.ts and
    // closed-loop.test.ts): buildDemoSeed already carries the
    // screenshot-canonical readiness profile — credit 750, sliders 7/7/7,
    // FOMO 4, 18-month horizon, $400k / $20k housing lens — which renders
    // HōMI-Score 73 · ALMOST_THERE · pillars 74/66/80 through the scoring
    // seam. Only unlock the live score here; never override score-moving
    // fields, or the demo drifts off canon.
    usePlannerStore.getState().setReadinessProfile({ profileComplete: true });
  }, [resetDemo]);

  // First mount on this device seeds the demo (marker-gated, see above).
  useFirstVisitDemoSeed(loadSampleNumbers);

  const toolbar = (
    <div className="relative flex shrink-0 flex-wrap gap-2">
      {hasData ? (
        <button
          type="button"
          onClick={() => setConfirmClearOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-navy/40 px-3.5 py-2.5 text-sm font-medium text-dim transition-colors hover:border-white/20 hover:text-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Clear data
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmSampleOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-cyan/15 px-4 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Load sample numbers
        </button>
      )}
    </div>
  );

  return (
    <div className="relative space-y-7">
      {!embedded && (
        <div
          className="pointer-events-none absolute -inset-x-4 -top-6 h-56 opacity-80 sm:-inset-x-8"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 12% 0%, rgba(34,211,238,0.10), transparent 55%), radial-gradient(ellipse 50% 60% at 92% 20%, rgba(52,211,153,0.06), transparent 50%)",
          }}
        />
      )}

      {embedded ? (
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim">
            Track workspace · on-device planner store
          </p>
          {toolbar}
        </div>
      ) : (
        <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-cyan">
              Decision Readiness Intelligence
            </p>
            <h1 className="mt-1.5 type-h2 font-medium tracking-tight">Budget Planner</h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-dim sm:text-base">
              Cash flow, banks, portfolio, Path to Ready, and decision models. HōMI numbers that
              protect choices - not a sales funnel.
            </p>
          </div>
          {toolbar}
        </header>
      )}

      <div className="relative space-y-5">
        <ReadinessHero
          reality={reality}
          portfolioValue={portfolio.marketValue}
          netWorth={nw.netWorth}
          billsOpen={upcomingBillsTotal(bills)}
        />

        <SignalsStrip
          signals={signals}
          onDismiss={dismissSignal}
          onAction={(s) => onTabChange(s.actionTab)}
        />

        {/* Overview owns Suggested move (OverviewCommand); hide rail there to avoid duplicate chrome. */}
        {tab !== "overview" ? (
          <NudgeRail nudges={nudges} onAction={(n) => onTabChange(n.actionTab)} />
        ) : null}
      </div>

      <Tabs
        tabs={SECTION_TABS.map(({ key, label, icon }) => ({ key, label, icon }))}
        value={tab}
        onChange={onTabChange}
        idPrefix="finance"
        ariaLabel="Track workspace sections"
        hashSync={false}
        variant="pill"
        className="relative"
      />

      <TabPanel idPrefix="finance" value={tab} className="relative mt-5 min-h-[12rem]">
        {tab === "overview" && overview}
        {tab === "calendar" && calendar}
        {tab === "transactions" && transactionsPanel}
        {tab === "goals" && goalsPanel}
        {tab === "banking" && banking}
        {tab === "wealth" && wealth}
      </TabPanel>

      <ImpactToast impact={lastImpact} onDismiss={clearLastImpact} />

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear your planner data?"
        body="This clears the on-device planner workspace. It does not delete your ledger or assessment history."
        confirmLabel="Clear data"
        onConfirm={clearWorkspace}
        onClose={() => setConfirmClearOpen(false)}
      />
      <ConfirmDialog
        open={confirmSampleOpen}
        title="Load sample numbers?"
        body="Education only — not your real money. Sample figures help you learn the workspace before you enter yours."
        confirmLabel="Load sample"
        tone="accent"
        onConfirm={loadSampleNumbers}
        onClose={() => setConfirmSampleOpen(false)}
      />

      {embedded ? (
        <TrackBottomStrip
          onSection={(section) => {
            onTabChange(section);
          }}
        />
      ) : null}
    </div>
  );
}
