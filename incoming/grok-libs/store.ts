import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AssetClass,
  BankAccount,
  BankInstitution,
  Bill,
  BrokerConnection,
  BrokerInstitution,
  BudgetState,
  CategoryId,
  DailyCheckin,
  DebtItem,
  ExpenseCategory,
  Holding,
  HoldingAccountKind,
  HouseholdPartner,
  NetWorthItem,
  PathSnapshot,
  ReadinessProfile,
  SavingsGoal,
  ScoreImpactSnapshot,
  Temperature,
  Transaction,
  TransactionType,
} from "./types";
import { addDaysISO, daysUntil, todayISO } from "./format";
import {
  buildReadinessPath,
  setPathStepStatus,
  type PathFinanceSnapshot,
  type PathStepStatus,
  type ReadinessPath,
} from "./path";
import { brokerMeta } from "./brokers";
import type { BankAccountType } from "./types";

function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}


export const DEFAULT_GOAL: SavingsGoal = {
  name: "Emergency fund",
  target: 0,
  current: 0,
};

/** Neutral profile — user fills Plan / housing / emotional fields. */
export const DEFAULT_READINESS_PROFILE: ReadinessProfile = {
  creditScore: 0,
  lifeStability: 5,
  confidenceLevel: 5,
  partnerAlignment: 5,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  targetHomePrice: 0,
  downPaymentSaved: 0,
  assumedRatePct: 6.5,
  termYears: 30,
  taxInsuranceRatePct: 1.2,
  hoaMonthly: 0,
  currentRent: 0,
};

export const DEFAULT_HOUSEHOLD_PARTNER: HouseholdPartner = {
  enabled: false,
  label: "Partner",
  creditScore: 0,
  lifeStability: 5,
  confidenceLevel: 5,
  fomoLevel: 5,
  timeHorizonMonths: 12,
  incomeShare: 0.5,
  partnerAlignment: 5,
};

export type AddAccountInput = {
  institution: BankInstitution;
  name: string;
  type: BankAccountType;
  balance: number;
  available?: number;
  mask?: string;
};

function pathToSnapshot(path: ReadinessPath): PathSnapshot {
  return {
    id: path.id,
    createdAt: path.createdAt,
    score: path.score,
    verdict: path.verdict,
    bindingConstraint: path.bindingConstraint,
    mode: path.mode,
    steps: path.steps.map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind,
      daysFromNow: s.daysFromNow,
      reasonCode: s.reasonCode,
      notes: s.notes,
      fundingTarget: s.fundingTarget,
      fundingLabel: s.fundingLabel,
      status: s.status,
      completedAt: s.completedAt,
    })),
  };
}

function snapshotToPath(snap: PathSnapshot): ReadinessPath {
  return {
    id: snap.id,
    version: 1,
    createdAt: snap.createdAt,
    score: snap.score,
    verdict: snap.verdict,
    bindingConstraint: snap.bindingConstraint as ReadinessPath["bindingConstraint"],
    confidence: "finance_live",
    disclaimer:
      "Educational readiness only — not a commitment to lend, credit approval, or personalized financial, legal, or tax advice.",
    steps: snap.steps.map((s) => ({
      id: s.id,
      title: s.title,
      kind: s.kind,
      daysFromNow: s.daysFromNow,
      reasonCode: s.reasonCode as ReadinessPath["steps"][0]["reasonCode"],
      notes: s.notes,
      fundingTarget: s.fundingTarget,
      fundingLabel: s.fundingLabel,
      status: s.status,
      completedAt: s.completedAt,
    })),
    mode: snap.mode,
  };
}

interface BudgetStore extends BudgetState {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  addTransaction: (input: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  setSavingsGoal: (goal: Partial<SavingsGoal>) => void;
  addAccount: (input: AddAccountInput) => void;
  connectBank: (input: AddAccountInput) => Promise<void>;
  disconnectAccount: (accountId: string) => void;
  syncBanks: () => Promise<void>;
  addBill: (input: Omit<Bill, "id" | "status" | "paidAt">) => void;
  updateBill: (id: string, patch: Partial<Omit<Bill, "id">>) => void;
  deleteBill: (id: string) => void;
  payBill: (billId: string, accountId?: string) => { ok: boolean; error?: string };
  scheduleBill: (billId: string) => void;
  addHolding: (input: Omit<Holding, "id">) => void;
  updateHolding: (id: string, patch: Partial<Omit<Holding, "id">>) => void;
  deleteHolding: (id: string) => void;
  markPrices: () => void;
  addNetWorthItem: (input: Omit<NetWorthItem, "id">) => void;
  updateNetWorthItem: (id: string, patch: Partial<Omit<NetWorthItem, "id">>) => void;
  deleteNetWorthItem: (id: string) => void;
  connectBroker: (institution: BrokerInstitution) => Promise<void>;
  disconnectBroker: (brokerId: string) => void;
  syncBrokers: () => Promise<void>;
  regeneratePath: () => void;
  completePathStep: (stepId: string, status?: PathStepStatus) => void;
  clearPath: () => void;
  setReadinessProfile: (patch: Partial<ReadinessProfile>) => void;
  setHouseholdPartner: (patch: Partial<HouseholdPartner>) => void;
  setDebts: (debts: DebtItem[]) => void;
  updateDebt: (id: string, patch: Partial<Omit<DebtItem, "id">>) => void;
  setExtraDebtPayment: (n: number) => void;
  dismissSignal: (id: string) => void;
  clearDismissedSignals: () => void;
  setLastImpact: (impact: ScoreImpactSnapshot | null) => void;
  clearLastImpact: () => void;
  addCheckin: (financialStress: number, note?: string) => void;
  clearWorkspace: () => void;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      savingsGoal: { ...DEFAULT_GOAL },
      accounts: [],
      bills: [],
      bankLinkStatus: "disconnected" as const,
      lastBankSyncAt: null,
      holdings: [],
      netWorthItems: [],
      brokers: [],
      brokerLinkStatus: "disconnected" as const,
      lastBrokerSyncAt: null,
      path: null,
      readinessProfile: { ...DEFAULT_READINESS_PROFILE },
      householdPartner: { ...DEFAULT_HOUSEHOLD_PARTNER },
      debts: [],
      dismissedSignals: [],
      toolsOverlay: { extraDebtPayment: 0 },
      checkins: [],
      lastImpact: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      addTransaction: (input) =>
        set((s) => ({
          transactions: [{ ...input, id: uid("tx") }, ...s.transactions],
        })),

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t,
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      setSavingsGoal: (goal) =>
        set((s) => ({ savingsGoal: { ...s.savingsGoal, ...goal } })),

      connectBank: async (input) => {
        get().addAccount(input);
      },

      addAccount: (input) => {
        const now = new Date().toISOString();
        const balance = Math.max(0, Number(input.balance) || 0);
        const available =
          input.available != null
            ? Math.max(0, Number(input.available) || 0)
            : balance;
        const maskDigits = String(input.mask ?? "")
          .replace(/\D/g, "")
          .slice(-4);
        const acct: BankAccount = {
          id: uid("acct"),
          institution: input.institution,
          name: input.name.trim() || "Account",
          type: input.type,
          mask: maskDigits || "0000",
          balance,
          available,
          currency: "USD",
          lastSyncedAt: now,
          status: "linked",
        };
        set((s) => ({
          accounts: [...s.accounts, acct],
          bankLinkStatus: "linked",
          lastBankSyncAt: now,
        }));
      },

      disconnectAccount: (accountId) =>
        set((s) => {
          const accounts = s.accounts.filter((a) => a.id !== accountId);
          return {
            accounts,
            bankLinkStatus: accounts.length ? "linked" : "disconnected",
          };
        }),

      syncBanks: async () => {
        if (!get().accounts.length) return;
        set({ bankLinkStatus: "connecting" });
        await new Promise((r) => setTimeout(r, 200));
        const now = new Date().toISOString();
        set((s) => ({
          accounts: s.accounts.map((a) => ({
            ...a,
            lastSyncedAt: now,
            status: "linked" as const,
          })),
          bankLinkStatus: "linked",
          lastBankSyncAt: now,
        }));
      },

      addBill: (input) => {
        const due = daysUntil(input.dueDate);
        let status: Bill["status"] = "upcoming";
        if (due < 0) status = "overdue";
        else if (due === 0) status = "due";
        else if (input.autopay) status = "scheduled";
        set((s) => ({
          bills: [{ ...input, id: uid("bill"), status }, ...s.bills],
        }));
      },

      updateBill: (id, patch) =>
        set((s) => ({
          bills: s.bills.map((b) => {
            if (b.id !== id) return b;
            const next = { ...b, ...patch };
            if (patch.dueDate && next.status !== "paid") {
              const due = daysUntil(next.dueDate);
              if (due < 0) next.status = "overdue";
              else if (due === 0) next.status = "due";
              else if (next.autopay) next.status = "scheduled";
              else next.status = "upcoming";
            }
            return next;
          }),
        })),

      deleteBill: (id) =>
        set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),

      payBill: (billId, accountId) => {
        const s = get();
        const bill = s.bills.find((b) => b.id === billId);
        if (!bill) return { ok: false, error: "Bill not found" };
        if (bill.status === "paid") return { ok: false, error: "Already paid" };
        const acctId = accountId ?? bill.accountId;
        const acct = s.accounts.find((a) => a.id === acctId);
        if (!acct) return { ok: false, error: "Select a pay-from account" };
        if (acct.type !== "credit" && acct.balance < bill.amount) {
          return { ok: false, error: "Insufficient balance" };
        }
        const now = new Date().toISOString();
        const tx: Transaction = {
          id: uid("tx"),
          type: "expense",
          amount: bill.amount,
          category: bill.category,
          note: `Paid · ${bill.name}`,
          date: todayISO(),
          accountId: acct.id,
          billId: bill.id,
          source: "bill-pay",
        };
        set({
          bills: s.bills.map((b) =>
            b.id === billId
              ? { ...b, status: "paid" as const, paidAt: now }
              : b,
          ),
          accounts: s.accounts.map((a) => {
            if (a.id !== acct.id) return a;
            if (a.type === "credit") {
              return {
                ...a,
                balance: Number((a.balance - bill.amount).toFixed(2)),
              };
            }
            return {
              ...a,
              balance: Number((a.balance - bill.amount).toFixed(2)),
              available: Number(
                Math.max(0, (a.available ?? a.balance) - bill.amount).toFixed(2),
              ),
            };
          }),
          transactions: [tx, ...s.transactions],
        });
        return { ok: true };
      },

      scheduleBill: (billId) =>
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId && b.status !== "paid"
              ? { ...b, status: "scheduled" as const, autopay: true }
              : b,
          ),
        })),

      addHolding: (input) =>
        set((s) => ({
          holdings: [{ ...input, id: uid("hold") }, ...s.holdings],
        })),

      updateHolding: (id, patch) =>
        set((s) => ({
          holdings: s.holdings.map((h) =>
            h.id === id ? { ...h, ...patch } : h,
          ),
        })),

      deleteHolding: (id) =>
        set((s) => ({
          holdings: s.holdings.filter((h) => h.id !== id),
        })),

      markPrices: () => {
        const asOf = todayISO();
        set((s) => ({
          holdings: s.holdings.map((h) => ({ ...h, asOf })),
        }));
      },

      addNetWorthItem: (input) =>
        set((s) => ({
          netWorthItems: [
            { ...input, id: uid("nw") },
            ...s.netWorthItems,
          ],
        })),

      updateNetWorthItem: (id, patch) =>
        set((s) => ({
          netWorthItems: s.netWorthItems.map((i) =>
            i.id === id ? { ...i, ...patch } : i,
          ),
        })),

      deleteNetWorthItem: (id) =>
        set((s) => ({
          netWorthItems: s.netWorthItems.filter((i) => i.id !== id),
        })),

      connectBroker: async (institution) => {
        set({ brokerLinkStatus: "connecting" });
        await new Promise((r) => setTimeout(r, 200));
        const now = new Date().toISOString();
        const meta = brokerMeta(institution);
        const broker: BrokerConnection = {
          id: uid("broker"),
          institution,
          name: meta.label,
          mask: "0000",
          status: "linked",
          lastSyncedAt: now,
          marketValue: 0,
        };
        set((s) => ({
          brokers: [...s.brokers, broker],
          brokerLinkStatus: "linked" as const,
          lastBrokerSyncAt: now,
        }));
      },

      disconnectBroker: (brokerId) =>
        set((s) => {
          const broker = s.brokers.find((b) => b.id === brokerId);
          const brokers = s.brokers.filter((b) => b.id !== brokerId);
          const holdings = broker
            ? s.holdings.filter(
                (h) =>
                  !(h.source === "broker" && h.brokerId === broker.institution),
              )
            : s.holdings;
          return {
            brokers,
            holdings,
            brokerLinkStatus: brokers.length ? "linked" : "disconnected",
          };
        }),

      syncBrokers: async () => {
        if (!get().brokers.length) return;
        set({ brokerLinkStatus: "connecting" });
        await new Promise((r) => setTimeout(r, 200));
        const now = new Date().toISOString();
        const asOf = todayISO();

        set((s) => {
          const holdings = s.holdings.map((h) => ({ ...h, asOf }));
          const brokers = s.brokers.map((b) => {
            const tagged = holdings.filter(
              (h) => h.brokerId === b.institution,
            );
            const value = tagged.reduce(
              (sum, h) => sum + h.shares * h.price,
              0,
            );
            return {
              ...b,
              lastSyncedAt: now,
              status: "linked" as const,
              marketValue: Number(value.toFixed(2)),
            };
          });

          return {
            holdings,
            brokers,
            brokerLinkStatus: "linked",
            lastBrokerSyncAt: now,
          };
        });
      },

      regeneratePath: () => {
        const s = get();
        const snap = buildPathFinanceSnapshot(s);
        const path = buildReadinessPath(snap);
        set({ path: pathToSnapshot(path) });
      },

      completePathStep: (stepId, status = "done") => {
        const s = get();
        if (!s.path) return;
        const next = setPathStepStatus(
          snapshotToPath(s.path),
          stepId,
          status,
        );
        set({ path: pathToSnapshot(next) });
      },

      clearPath: () => set({ path: null }),

      setReadinessProfile: (patch) =>
        set((s) => ({
          readinessProfile: { ...s.readinessProfile, ...patch },
        })),

      setHouseholdPartner: (patch) =>
        set((s) => ({
          householdPartner: { ...s.householdPartner, ...patch },
        })),

      setDebts: (debts) => set({ debts }),

      updateDebt: (id, patch) =>
        set((s) => ({
          debts: s.debts.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),

      setExtraDebtPayment: (n) =>
        set((s) => ({
          toolsOverlay: {
            ...s.toolsOverlay,
            extraDebtPayment: Math.max(0, n),
          },
        })),

      dismissSignal: (id) =>
        set((s) => ({
          dismissedSignals: s.dismissedSignals.includes(id)
            ? s.dismissedSignals
            : [...s.dismissedSignals, id],
        })),

      clearDismissedSignals: () => set({ dismissedSignals: [] }),

      setLastImpact: (impact) => set({ lastImpact: impact }),
      clearLastImpact: () => set({ lastImpact: null }),

      addCheckin: (financialStress, note) => {
        const stress = Math.min(10, Math.max(1, Math.round(financialStress)));
        const date = todayISO();
        const entry: DailyCheckin = {
          id: uid("check"),
          date,
          financialStress: stress,
          note: note?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        set((s) => {
          // one check-in per day — replace same date
          const rest = s.checkins.filter((c) => c.date !== date);
          return {
            checkins: [entry, ...rest].slice(0, 60),
            // mild FOMO/pressure nudge from rising stress
            readinessProfile: {
              ...s.readinessProfile,
              fomoLevel: Math.min(
                10,
                Math.max(
                  1,
                  Math.round(
                    s.readinessProfile.fomoLevel * 0.6 + stress * 0.4,
                  ),
                ),
              ),
            },
          };
        });
      },

      clearWorkspace: () =>
        set({
          transactions: [],
          savingsGoal: { ...DEFAULT_GOAL },
          accounts: [],
          bills: [],
          bankLinkStatus: "disconnected",
          lastBankSyncAt: null,
          holdings: [],
          netWorthItems: [],
          brokers: [],
          brokerLinkStatus: "disconnected",
          lastBrokerSyncAt: null,
          path: null,
          readinessProfile: { ...DEFAULT_READINESS_PROFILE },
          householdPartner: { ...DEFAULT_HOUSEHOLD_PARTNER },
          debts: [],
          dismissedSignals: [],
          toolsOverlay: { extraDebtPayment: 0 },
          checkins: [],
          lastImpact: null,
        }),
    }),
    {
      name: "homi-budget-planner-prod-v1",
      partialize: (s) => ({
        transactions: s.transactions,
        savingsGoal: s.savingsGoal,
        accounts: s.accounts,
        bills: s.bills,
        bankLinkStatus: s.bankLinkStatus,
        lastBankSyncAt: s.lastBankSyncAt,
        holdings: s.holdings,
        netWorthItems: s.netWorthItems,
        brokers: s.brokers,
        brokerLinkStatus: s.brokerLinkStatus,
        lastBrokerSyncAt: s.lastBrokerSyncAt,
        path: s.path,
        readinessProfile: s.readinessProfile,
        householdPartner: s.householdPartner,
        debts: s.debts,
        dismissedSignals: s.dismissedSignals,
        toolsOverlay: s.toolsOverlay,
        checkins: s.checkins,
        lastImpact: s.lastImpact,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BudgetState>;
        const profile =
          p.readinessProfile && typeof p.readinessProfile === "object"
            ? p.readinessProfile
            : {};
        const partner =
          p.householdPartner && typeof p.householdPartner === "object"
            ? p.householdPartner
            : {};
        const overlay =
          p.toolsOverlay && typeof p.toolsOverlay === "object"
            ? p.toolsOverlay
            : {};
        return {
          ...current,
          ...p,
          transactions: Array.isArray(p.transactions)
            ? p.transactions
            : current.transactions,
          accounts: Array.isArray(p.accounts) ? p.accounts : current.accounts,
          bills: Array.isArray(p.bills) ? p.bills : current.bills,
          holdings: Array.isArray(p.holdings) ? p.holdings : current.holdings,
          netWorthItems: Array.isArray(p.netWorthItems)
            ? p.netWorthItems
            : current.netWorthItems,
          brokers: Array.isArray(p.brokers) ? p.brokers : current.brokers,
          path: p.path ?? current.path,
          readinessProfile: {
            ...DEFAULT_READINESS_PROFILE,
            ...current.readinessProfile,
            ...profile,
          },
          householdPartner: {
            ...DEFAULT_HOUSEHOLD_PARTNER,
            ...current.householdPartner,
            ...partner,
          },
          debts: Array.isArray(p.debts) ? p.debts : current.debts,
          dismissedSignals: Array.isArray(p.dismissedSignals)
            ? p.dismissedSignals
            : current.dismissedSignals,
          toolsOverlay: {
            extraDebtPayment: Number(
              (overlay as { extraDebtPayment?: number }).extraDebtPayment ??
                current.toolsOverlay?.extraDebtPayment ??
                200,
            ),
          },
          checkins: Array.isArray(p.checkins) ? p.checkins : current.checkins,
          lastImpact: p.lastImpact ?? current.lastImpact,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function buildPathFinanceSnapshot(s: {
  transactions: Transaction[];
  accounts: BankAccount[];
  bills: Bill[];
  holdings: Holding[];
  netWorthItems: NetWorthItem[];
  savingsGoal: SavingsGoal;
}): PathFinanceSnapshot {
  const reality = financialReality(s.transactions, s.accounts, s.bills);
  const portfolio = summarizePortfolio(s.holdings);
  const nw = totalNetWorth(s.accounts, s.holdings, s.netWorthItems);
  return {
    income: reality.income,
    expenses: reality.expenses,
    cashFlow: reality.cashFlow,
    savingsRate: reality.savingsRate,
    runwayMonths: reality.runwayMonths,
    dti: reality.dti,
    liquidCash: reality.liquidCash,
    debtPayments: reality.debtPayments,
    portfolioValue: portfolio.marketValue,
    netWorth: nw.netWorth,
    savingsGoalTarget: s.savingsGoal.target,
    savingsGoalCurrent: s.savingsGoal.current,
  };
}

export function summarize(transactions: Transaction[]) {
  let income = 0;
  let expenses = 0;
  const byCategory = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type === "income") {
      income += tx.amount;
    } else {
      expenses += tx.amount;
      byCategory.set(tx.category, (byCategory.get(tx.category) ?? 0) + tx.amount);
    }
  }

  const remaining = income - expenses;
  const savingsRate = income > 0 ? (remaining / income) * 100 : 0;

  const categoryBreakdown = [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { income, expenses, remaining, savingsRate, categoryBreakdown };
}

export function summarizeAccounts(accounts: BankAccount[]) {
  const cash = accounts
    .filter((a) => a.type !== "credit")
    .reduce((s, a) => s + a.balance, 0);
  const credit = accounts
    .filter((a) => a.type === "credit")
    .reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0);
  return { cash, credit, count: accounts.length };
}

export function upcomingBillsTotal(bills: Bill[]) {
  return bills
    .filter((b) => b.status !== "paid")
    .reduce((s, b) => s + b.amount, 0);
}

export function holdingMarketValue(h: Holding): number {
  return h.shares * h.price;
}

export function holdingCost(h: Holding): number {
  return h.shares * h.costBasis;
}

export function holdingGain(h: Holding): number {
  return holdingMarketValue(h) - holdingCost(h);
}

export function holdingGainPct(h: Holding): number {
  const cost = holdingCost(h);
  if (cost <= 0) return 0;
  return (holdingGain(h) / cost) * 100;
}

export function summarizePortfolio(holdings: Holding[]) {
  let marketValue = 0;
  let costBasis = 0;
  const byClass = new Map<AssetClass, number>();
  const byAccount = new Map<HoldingAccountKind, number>();

  for (const h of holdings) {
    const mv = holdingMarketValue(h);
    marketValue += mv;
    costBasis += holdingCost(h);
    byClass.set(h.assetClass, (byClass.get(h.assetClass) ?? 0) + mv);
    byAccount.set(h.accountKind, (byAccount.get(h.accountKind) ?? 0) + mv);
  }

  const gain = marketValue - costBasis;
  const gainPct = costBasis > 0 ? (gain / costBasis) * 100 : 0;

  const allocation = [...byClass.entries()]
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      weight: marketValue > 0 ? (value / marketValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const byAccountKind = [...byAccount.entries()]
    .map(([accountKind, value]) => ({
      accountKind,
      value,
      weight: marketValue > 0 ? (value / marketValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    marketValue,
    costBasis,
    gain,
    gainPct,
    count: holdings.length,
    allocation,
    byAccountKind,
  };
}

export function totalNetWorth(
  accounts: BankAccount[],
  holdings: Holding[],
  items: NetWorthItem[],
) {
  const { cash, credit } = summarizeAccounts(accounts);
  const portfolio = summarizePortfolio(holdings).marketValue;
  const otherAssets = items
    .filter((i) => i.kind === "asset")
    .reduce((s, i) => s + i.amount, 0);
  const liabilities = items
    .filter((i) => i.kind === "liability")
    .reduce((s, i) => s + i.amount, 0);

  const assets = cash + portfolio + otherAssets;
  const totalLiabilities = liabilities + credit;
  const netWorth = assets - totalLiabilities;

  return {
    cash,
    portfolio,
    otherAssets,
    assets,
    liabilities: totalLiabilities,
    credit,
    manualLiabilities: liabilities,
    netWorth,
  };
}

export function dtiTemperature(dti: number): Temperature {
  if (dti <= 28) return "emerald";
  if (dti <= 36) return "yellow";
  if (dti <= 43) return "amber";
  return "crimson";
}

export function savingsRateTemperature(rate: number): Temperature {
  if (rate >= 20) return "emerald";
  if (rate >= 10) return "yellow";
  if (rate >= 0) return "amber";
  return "crimson";
}

export function runwayTemperature(months: number): Temperature {
  if (!Number.isFinite(months) || months >= 6) return "emerald";
  if (months >= 3) return "yellow";
  if (months >= 1) return "amber";
  return "crimson";
}

export function cashFlowTemperature(flow: number, income: number): Temperature {
  if (income <= 0) return "amber";
  const ratio = flow / income;
  if (ratio >= 0.15) return "emerald";
  if (ratio >= 0.05) return "yellow";
  if (ratio >= 0) return "amber";
  return "crimson";
}

export function financialReality(
  transactions: Transaction[],
  accounts: BankAccount[],
  bills: Bill[],
) {
  const { income, expenses, remaining, savingsRate } = summarize(transactions);
  const { cash } = summarizeAccounts(accounts);

  const monthlyDebtPayments = bills
    .filter((b) => b.category === "debt" && b.status !== "paid")
    .reduce((s, b) => s + b.amount, 0);
  const debtFromTx = transactions
    .filter((t) => t.type === "expense" && t.category === "debt")
    .reduce((s, t) => s + t.amount, 0);
  const debtPayments = Math.max(monthlyDebtPayments, debtFromTx);

  const outflow = expenses > 0 ? expenses : upcomingBillsTotal(bills);
  const runwayMonths = outflow > 0 ? cash / outflow : Infinity;
  const dti = income > 0 ? (debtPayments / income) * 100 : 0;

  return {
    income,
    expenses,
    cashFlow: remaining,
    savingsRate,
    runwayMonths,
    dti,
    debtPayments,
    liquidCash: cash,
    temps: {
      cashFlow: cashFlowTemperature(remaining, income),
      savingsRate: savingsRateTemperature(savingsRate),
      runway: runwayTemperature(runwayMonths),
      dti: dtiTemperature(dti),
    },
  };
}

export const ASSET_CLASS_META: Record<
  AssetClass,
  { label: string; color: string }
> = {
  stock: { label: "Stocks", color: "#22d3ee" },
  etf: { label: "ETFs", color: "#34d399" },
  mutual: { label: "Mutual funds", color: "#60a5fa" },
  bond: { label: "Bonds", color: "#facc15" },
  crypto: { label: "Crypto", color: "#a78bfa" },
  cash: { label: "Cash", color: "#94a3b8" },
  other: { label: "Other", color: "#fb7185" },
};

export const ACCOUNT_KIND_META: Record<HoldingAccountKind, { label: string }> = {
  brokerage: { label: "Taxable brokerage" },
  roth: { label: "Roth IRA" },
  traditional_401k: { label: "401(k)" },
  hsa: { label: "HSA" },
  crypto: { label: "Crypto wallet" },
  other: { label: "Other" },
};

export type TxDraft = {
  type: TransactionType;
  amount: string;
  category: CategoryId;
  note: string;
  date: string;
};

export type { ExpenseCategory };
