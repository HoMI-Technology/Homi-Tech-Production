/* ------------------------------------------------------------------ */
/* HōMI Budget Planner store — zustand + persist.                      */
/*                                                                     */
/* Ported from the reference planner store (audit §3 API contract is   */
/* preserved exactly) with two canon-wins adaptations:                 */
/*   1. Persistence uses this repo's hardened versioned-envelope       */
/*      pattern (store/budget.tsx) inside zustand's persist storage /  */
/*      merge / onRehydrateStorage options.                            */
/*   2. regeneratePath runs the canon lib/path.ts binding-constraint   */
/*      engine (the reference's finance scorer and 3-tier verdicts     */
/*      were flagged non-canonical and are never ported). Score and    */
/*      verdict come from the canon scorer via planner/score-bridge —  */
/*      the path engine only sequences protective steps.               */
/* ------------------------------------------------------------------ */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";
import {
  buildReadinessPath,
  type PathFinanceSnapshot as CanonPathFinance,
} from "@/lib/readiness/path";
import type { AssessmentResult } from "@/lib/scoring/public";
import {
  getLastAssessmentResult,
  scoreFromBudgetAsync,
} from "@/lib/planner/score-bridge";
import type {
  AddAccountInput,
  BankAccount,
  Bill,
  BrokerConnection,
  BrokerInstitution,
  BudgetState,
  DailyCheckin,
  DebtItem,
  Holding,
  HouseholdPartner,
  NetWorthItem,
  PathSnapshot,
  PathStepStatus,
  ReadinessProfile,
  SavingsGoal,
  ScoreImpactSnapshot,
  Transaction,
} from "@/lib/planner/types";
import {
  DEFAULT_GOAL,
  DEFAULT_HOUSEHOLD_PARTNER,
  DEFAULT_READINESS_PROFILE,
  buildDemoSeed,
  buildPathFinanceSnapshot,
  daysUntil,
  todayISO,
} from "@/lib/planner/derived";
import { dualWriteAddTransaction, dualWriteDeleteTransaction } from "@/lib/planner/ledger-bridge";

function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/* Broker display labels — static metadata only (the reference brokers.ts
 * colors are not ported; broker accents come from brand tokens). */
const BROKER_LABELS: Record<BrokerInstitution, string> = {
  fidelity: 'Fidelity',
  vanguard: 'Vanguard',
  schwab: 'Charles Schwab',
  etrade: 'E*TRADE',
  robinhood: 'Robinhood',
  other: 'Other broker',
}

/* ------------------------------------------------------------------ */
/* Persistence — versioned-envelope hardening (store/budget.tsx        */
/* pattern) adapted into zustand persist.                              */
/*                                                                     */
/* The stored blob is a versioned envelope { v, savedAt, data } where  */
/* data is zustand's own serialized { state, version } payload. Loads  */
/* walk a forward-only migration chain; legacy bare zustand blobs      */
/* (pre-envelope) load transparently; an unparseable blob is preserved */
/* under a corrupt-backup key before rehydration falls back to the     */
/* initial state — never destroyed.                                    */
/* ------------------------------------------------------------------ */

export const PLANNER_STORAGE_KEY = 'homi-planner-v1'
export const PLANNER_CORRUPT_BACKUP_KEY = 'homi-planner-v1-corrupt'
export const PLANNER_SCHEMA_VERSION = 1

type PlannerEnvelope = {
  v: number
  savedAt: string
  data: unknown
}

/**
 * Forward-only migration chain keyed by the version being upgraded FROM.
 * Version 1 is current, so the map is empty; a future v2 adds
 * `1: (data) => ...`.
 */
const PLANNER_MIGRATIONS: Record<number, (data: unknown) => unknown> = {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/* Numeric hardening at action boundaries (Sprint 0, F3): reject or strip
   non-finite amounts so NaN/±Infinity can never enter persisted state. */
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function stripNonFinite<T extends object>(patch: T, keys: readonly (keyof T)[]): T {
  const out = { ...patch }
  for (const k of keys) {
    if (k in out && !isFiniteNumber(out[k])) delete out[k]
  }
  return out
}

const envelopeStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(name)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      if (!isRecord(parsed)) throw new Error('not an object')

      let data: unknown
      if (typeof parsed.v === 'number' && 'data' in parsed) {
        // Versioned envelope — walk the forward-only chain.
        let version = parsed.v
        let migrated = parsed.data
        while (version < PLANNER_SCHEMA_VERSION) {
          const migrate = PLANNER_MIGRATIONS[version]
          if (!migrate) break // unknown ancient shape — merge guards decide
          migrated = migrate(migrated)
          version += 1
        }
        data = migrated
      } else {
        // Legacy bare zustand blob ({ state, version }) loads as-is.
        data = parsed
      }
      return JSON.stringify(data)
    } catch {
      try {
        if (raw !== null) {
          window.localStorage.setItem(PLANNER_CORRUPT_BACKUP_KEY, raw)
        }
      } catch {
        // Backup is best-effort; the default-state fallback still applies.
      }
      return null
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return
    const envelope: PlannerEnvelope = {
      v: PLANNER_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      data: JSON.parse(value),
    }
    window.localStorage.setItem(name, JSON.stringify(envelope))
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(name)
  },
}

/* ------------------------------------------------------------------ */
/* Path adapter — canon lib/path.ts binding-constraint engine → the    */
/* planner's PathSnapshot.                                             */
/*                                                                     */
/* Pure and DOM-free so it is testable without a browser. The scorer   */
/* owns truth: score + verdict come from scoreFromBudget (canon        */
/* @/lib/score via planner/score-bridge); lib/path.ts only sequences   */
/* protective steps from that result. The reference planner's own      */
/* finance scorer and 75/55 three-tier verdicts were flagged           */
/* non-canonical (lib audit #3) and are never invoked here.            */
/* ------------------------------------------------------------------ */

export interface BuildPlannerPathOptions {
  /** Injected for tests. */
  now?: Date
  /** Injected for tests (defaults to uid). */
  idFactory?: () => string
}

/**
 * Build a PathSnapshot from live budget state + a server AssessmentResult.
 * Scoring is never done here — pass the result from fetchServerScore /
 * getLastAssessmentResult after scoreFromBudgetAsync.
 */
export function buildPlannerPathSnapshot(
  state: BudgetState,
  assessment: AssessmentResult,
  opts: BuildPlannerPathOptions = {},
): PathSnapshot {
  // Canon finance contract — only passed when real finance data exists,
  // so an empty workspace keeps confidence 'assessment_only'.
  const finance = buildPathFinanceSnapshot(state);
  const hasFinanceData =
    state.transactions.length > 0 || state.accounts.length > 0;
  const canonFinance: CanonPathFinance | undefined = hasFinanceData
    ? {
        netCashFlow: finance.cashFlow,
        runwayMonths: Number.isFinite(finance.runwayMonths)
          ? finance.runwayMonths
          : null,
        monthlyExpenses: finance.expenses,
        liquidSavings: finance.liquidCash,
        monthlyDebtPayments: finance.debtPayments,
        monthlyIncome: finance.income,
      }
    : undefined;

  const path = buildReadinessPath(assessment, {
    finance: canonFinance ?? null,
    now: opts.now,
    idFactory: opts.idFactory ?? (() => uid("step")),
  });

  return {
    id: path.id,
    createdAt: path.createdAt,
    score: path.score,
    verdict: path.verdict,
    bindingConstraint: path.bindingConstraint,
    mode: path.mode,
    steps: path.steps.map((step) => {
      const { href, ...rest } = step;
      void href;
      return rest;
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface PlannerStore extends BudgetState {
  _hasHydrated: boolean
  setHasHydrated: (v: boolean) => void
  addTransaction: (input: Omit<Transaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id'>>) => void
  deleteTransaction: (id: string) => void
  setSavingsGoal: (goal: Partial<SavingsGoal>) => void
  addAccount: (input: AddAccountInput) => void
  connectBank: (input: AddAccountInput) => Promise<void>
  disconnectAccount: (accountId: string) => void
  syncBanks: () => Promise<void>
  addBill: (input: Omit<Bill, 'id' | 'status' | 'paidAt'>) => void
  updateBill: (id: string, patch: Partial<Omit<Bill, 'id'>>) => void
  deleteBill: (id: string) => void
  payBill: (billId: string, accountId?: string) => { ok: boolean; error?: string }
  scheduleBill: (billId: string) => void
  addHolding: (input: Omit<Holding, 'id'>) => void
  updateHolding: (id: string, patch: Partial<Omit<Holding, 'id'>>) => void
  deleteHolding: (id: string) => void
  markPrices: () => void
  addNetWorthItem: (input: Omit<NetWorthItem, 'id'>) => void
  updateNetWorthItem: (id: string, patch: Partial<Omit<NetWorthItem, 'id'>>) => void
  deleteNetWorthItem: (id: string) => void
  connectBroker: (institution: BrokerInstitution) => Promise<void>
  disconnectBroker: (brokerId: string) => void
  syncBrokers: () => Promise<void>
  regeneratePath: () => Promise<void>
  completePathStep: (stepId: string, status?: PathStepStatus) => void
  clearPath: () => void
  setReadinessProfile: (patch: Partial<ReadinessProfile>) => void
  setHouseholdPartner: (patch: Partial<HouseholdPartner>) => void
  setDebts: (debts: DebtItem[]) => void
  updateDebt: (id: string, patch: Partial<Omit<DebtItem, 'id'>>) => void
  setExtraDebtPayment: (n: number) => void
  dismissSignal: (id: string) => void
  clearDismissedSignals: () => void
  setLastImpact: (impact: ScoreImpactSnapshot | null) => void
  clearLastImpact: () => void
  addCheckin: (financialStress: number, note?: string) => void
  /** Restore the full demo workspace (the "Reset demo" button). */
  resetDemo: () => void
  clearWorkspace: () => void
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      savingsGoal: { ...DEFAULT_GOAL },
      accounts: [],
      bills: [],
      bankLinkStatus: 'disconnected' as const,
      lastBankSyncAt: null,
      holdings: [],
      netWorthItems: [],
      brokers: [],
      brokerLinkStatus: 'disconnected' as const,
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

      addTransaction: (input) => {
        if (!isFiniteNumber(input.amount)) return
        const id = uid("tx")
        const tx = { ...input, id }
        set((s) => ({
          transactions: [tx, ...s.transactions],
        }))
        dualWriteAddTransaction(tx)
      },

      updateTransaction: (id, patch) => {
        const clean = stripNonFinite(patch, ['amount'])
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...clean } : t,
          ),
        }))
      },

      deleteTransaction: (id) => {
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }))
        dualWriteDeleteTransaction(id)
      },

      setSavingsGoal: (goal) =>
        set((s) => ({
          savingsGoal: { ...s.savingsGoal, ...stripNonFinite(goal, ['target', 'current']) },
        })),

      connectBank: async (input) => {
        get().addAccount(input)
      },

      addAccount: (input) => {
        const now = new Date().toISOString()
        const balance = Math.max(0, Number(input.balance) || 0)
        const available =
          input.available != null
            ? Math.max(0, Number(input.available) || 0)
            : balance
        const maskDigits = String(input.mask ?? '')
          .replace(/\D/g, '')
          .slice(-4)
        const acct: BankAccount = {
          id: uid('acct'),
          institution: input.institution,
          name: input.name.trim() || 'Account',
          type: input.type,
          mask: maskDigits || '0000',
          balance,
          available,
          currency: 'USD',
          lastSyncedAt: now,
          status: 'linked',
        }
        set((s) => ({
          accounts: [...s.accounts, acct],
          bankLinkStatus: 'linked',
          lastBankSyncAt: now,
        }))
      },

      disconnectAccount: (accountId) =>
        set((s) => {
          const accounts = s.accounts.filter((a) => a.id !== accountId)
          return {
            accounts,
            bankLinkStatus: accounts.length ? 'linked' : 'disconnected',
          }
        }),

      syncBanks: async () => {
        if (!get().accounts.length) return
        set({ bankLinkStatus: 'connecting' })
        await new Promise((r) => setTimeout(r, 200))
        const now = new Date().toISOString()
        set((s) => ({
          accounts: s.accounts.map((a) => ({
            ...a,
            lastSyncedAt: now,
            status: 'linked' as const,
          })),
          bankLinkStatus: 'linked',
          lastBankSyncAt: now,
        }))
      },

      addBill: (input) => {
        if (!isFiniteNumber(input.amount)) return
        const due = daysUntil(input.dueDate)
        let status: Bill['status'] = 'upcoming'
        if (due < 0) status = 'overdue'
        else if (due === 0) status = 'due'
        else if (input.autopay) status = 'scheduled'
        set((s) => ({
          bills: [{ ...input, id: uid('bill'), status }, ...s.bills],
        }))
      },

      updateBill: (id, patch) =>
        set((s) => ({
          bills: s.bills.map((b) => {
            if (b.id !== id) return b
            const next = { ...b, ...stripNonFinite(patch, ['amount']) }
            if (patch.dueDate && next.status !== 'paid') {
              const due = daysUntil(next.dueDate)
              if (due < 0) next.status = 'overdue'
              else if (due === 0) next.status = 'due'
              else if (next.autopay) next.status = 'scheduled'
              else next.status = 'upcoming'
            }
            return next
          }),
        })),

      deleteBill: (id) =>
        set((s) => ({ bills: s.bills.filter((b) => b.id !== id) })),

      payBill: (billId, accountId) => {
        const s = get()
        const bill = s.bills.find((b) => b.id === billId)
        if (!bill) return { ok: false, error: 'Bill not found' }
        if (bill.status === 'paid') return { ok: false, error: 'Already paid' }
        const acctId = accountId ?? bill.accountId
        const acct = s.accounts.find((a) => a.id === acctId)
        if (!acct) return { ok: false, error: 'Select a pay-from account' }
        if (acct.type !== 'credit' && acct.balance < bill.amount) {
          return { ok: false, error: 'Insufficient balance' }
        }
        const now = new Date().toISOString()
        const tx: Transaction = {
          id: uid('tx'),
          type: 'expense',
          amount: bill.amount,
          category: bill.category,
          note: `Paid · ${bill.name}`,
          date: todayISO(),
          accountId: acct.id,
          billId: bill.id,
          source: 'bill-pay',
        }
        set({
          bills: s.bills.map((b) =>
            b.id === billId
              ? { ...b, status: 'paid' as const, paidAt: now }
              : b,
          ),
          accounts: s.accounts.map((a) => {
            if (a.id !== acct.id) return a
            if (a.type === 'credit') {
              return {
                ...a,
                balance: Number((a.balance - bill.amount).toFixed(2)),
              }
            }
            return {
              ...a,
              balance: Number((a.balance - bill.amount).toFixed(2)),
              available: Number(
                Math.max(0, (a.available ?? a.balance) - bill.amount).toFixed(2),
              ),
            }
          }),
          transactions: [tx, ...s.transactions],
        })
        dualWriteAddTransaction(tx)
        return { ok: true }
      },

      scheduleBill: (billId) =>
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId && b.status !== 'paid'
              ? { ...b, status: 'scheduled' as const, autopay: true }
              : b,
          ),
        })),

      addHolding: (input) =>
        set((s) => ({
          holdings: [{ ...input, id: uid('hold') }, ...s.holdings],
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
        const asOf = todayISO()
        set((s) => ({
          holdings: s.holdings.map((h) => ({ ...h, asOf })),
        }))
      },

      addNetWorthItem: (input) =>
        set((s) => ({
          netWorthItems: [
            { ...input, id: uid('nw') },
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
        set({ brokerLinkStatus: 'connecting' })
        await new Promise((r) => setTimeout(r, 200))
        const now = new Date().toISOString()
        const broker: BrokerConnection = {
          id: uid('broker'),
          institution,
          name: BROKER_LABELS[institution],
          mask: '0000',
          status: 'linked',
          lastSyncedAt: now,
          marketValue: 0,
        }
        set((s) => ({
          brokers: [...s.brokers, broker],
          brokerLinkStatus: 'linked' as const,
          lastBrokerSyncAt: now,
        }))
      },

      disconnectBroker: (brokerId) =>
        set((s) => {
          const broker = s.brokers.find((b) => b.id === brokerId)
          const brokers = s.brokers.filter((b) => b.id !== brokerId)
          const holdings = broker
            ? s.holdings.filter(
                (h) =>
                  !(h.source === 'broker' && h.brokerId === broker.institution),
              )
            : s.holdings
          return {
            brokers,
            holdings,
            brokerLinkStatus: brokers.length ? 'linked' : 'disconnected',
          }
        }),

      syncBrokers: async () => {
        if (!get().brokers.length) return
        set({ brokerLinkStatus: 'connecting' })
        await new Promise((r) => setTimeout(r, 200))
        const now = new Date().toISOString()
        const asOf = todayISO()

        set((s) => {
          const holdings = s.holdings.map((h) => ({ ...h, asOf }))
          const brokers = s.brokers.map((b) => {
            const tagged = holdings.filter(
              (h) => h.brokerId === b.institution,
            )
            const value = tagged.reduce(
              (sum, h) => sum + h.shares * h.price,
              0,
            )
            return {
              ...b,
              lastSyncedAt: now,
              status: 'linked' as const,
              marketValue: Number(value.toFixed(2)),
            }
          })

          return {
            holdings,
            brokers,
            brokerLinkStatus: 'linked',
            lastBrokerSyncAt: now,
          }
        })
      },

      regeneratePath: async () => {
        // Server score first, then binding-constraint path. Never regenerate
        // on path-step complete (closed-loop callers must not wipe completion).
        const s = get();
        try {
          await scoreFromBudgetAsync({
            transactions: s.transactions,
            accounts: s.accounts,
            bills: s.bills,
            holdings: s.holdings,
            netWorthItems: s.netWorthItems,
            savingsGoal: s.savingsGoal,
            readinessProfile: s.readinessProfile,
            debts: s.debts,
          });
        } catch {
          // Profile incomplete or network — leave path unchanged.
          return;
        }
        const assessment = getLastAssessmentResult();
        if (!assessment) return;
        set({ path: buildPlannerPathSnapshot(get(), assessment) });
      },

      completePathStep: (stepId, status = 'done') => {
        const s = get()
        if (!s.path) return
        const now = new Date().toISOString()
        // Same semantics as canon setPathStepStatus: pending clears the
        // completion stamp, done/skipped stamp it.
        set({
          path: {
            ...s.path,
            steps: s.path.steps.map((step) =>
              step.id === stepId
                ? {
                    ...step,
                    status,
                    completedAt: status === 'pending' ? null : now,
                  }
                : step,
            ),
          },
        })
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
        const stress = Math.min(10, Math.max(1, Math.round(financialStress)))
        const date = todayISO()
        const entry: DailyCheckin = {
          id: uid('check'),
          date,
          financialStress: stress,
          note: note?.trim() || undefined,
          createdAt: new Date().toISOString(),
        }
        set((s) => {
          // one check-in per day — replace same date
          const rest = s.checkins.filter((c) => c.date !== date)
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
          }
        })
      },

      resetDemo: () => set(buildDemoSeed(new Date())),

      clearWorkspace: () =>
        set({
          transactions: [],
          savingsGoal: { ...DEFAULT_GOAL },
          accounts: [],
          bills: [],
          bankLinkStatus: 'disconnected',
          lastBankSyncAt: null,
          holdings: [],
          netWorthItems: [],
          brokers: [],
          brokerLinkStatus: 'disconnected',
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
      name: PLANNER_STORAGE_KEY,
      version: PLANNER_SCHEMA_VERSION,
      storage: createJSONStorage(() => envelopeStorage),
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
      merge: (persisted: unknown, current: PlannerStore) => {
        const p = (persisted ?? {}) as Partial<BudgetState>
        const profile =
          p.readinessProfile && typeof p.readinessProfile === 'object'
            ? p.readinessProfile
            : {}
        const partner =
          p.householdPartner && typeof p.householdPartner === 'object'
            ? p.householdPartner
            : {}
        const overlay =
          p.toolsOverlay && typeof p.toolsOverlay === 'object'
            ? p.toolsOverlay
            : {}
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
                0,
            ),
          },
          checkins: Array.isArray(p.checkins) ? p.checkins : current.checkins,
          lastImpact: p.lastImpact ?? current.lastImpact,
        }
      },
      onRehydrateStorage: () => (state: PlannerStore | undefined) => {
        // Runs after both successful and failed rehydration — a corrupt blob
        // already fell back to initial state via envelopeStorage, so the UI
        // must never hang waiting for hydration either way.
        state?.setHasHydrated(true)
      },
    },
  ),
)
