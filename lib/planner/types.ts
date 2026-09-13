/* ------------------------------------------------------------------ */
/* HōMI Budget Planner domain types — single source for store + UI.    */
/*                                                                     */
/* Ported from the dogfood planner. Production adaptations:            */
/*   1. VerdictKey from lib/brand (ADR-001 labels live there).         */
/*   2. Path step vocabulary from lib/readiness/path (canon engine).   */
/* ------------------------------------------------------------------ */

import type { VerdictKey } from "@/lib/brand";
import type { PathMode, PathReasonCode, PathStepKind, PathStepStatus } from "@/lib/readiness/path";
import { COLORS } from "@/lib/brand";

export type { PathMode, PathReasonCode, PathStepKind, PathStepStatus };
export type { VerdictKey };

export type TransactionType = "income" | "expense";

export type ExpenseCategory =
  | "housing"
  | "food"
  | "transport"
  | "utilities"
  | "health"
  | "entertainment"
  | "shopping"
  | "debt"
  | "other";

export type IncomeCategory = "salary" | "freelance" | "investments" | "other";

export type CategoryId = ExpenseCategory | IncomeCategory;

export type TransactionSource = "manual" | "bank" | "bill-pay" | "broker";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: CategoryId;
  note?: string;
  date: string; // YYYY-MM-DD
  accountId?: string;
  billId?: string;
  source?: TransactionSource;
}

export interface SavingsGoal {
  name: string;
  target: number;
  current: number;
}

export type BankInstitution = "chase" | "bofa" | "wells" | "capitalone" | "ally" | "other";

export type BankAccountType = "checking" | "savings" | "credit" | "other";

export type LinkStatus = "disconnected" | "connecting" | "linked" | "error";

export interface BankAccount {
  id: string;
  institution: BankInstitution;
  name: string;
  type: BankAccountType;
  mask: string;
  balance: number;
  available: number;
  currency: string;
  lastSyncedAt: string | null;
  status: LinkStatus;
}

export type BillStatus = "upcoming" | "due" | "overdue" | "scheduled" | "paid";

export type BillFrequency = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "once";

export interface Bill {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  dueDate: string;
  status: BillStatus;
  frequency: BillFrequency;
  accountId?: string;
  autopay: boolean;
  source?: "manual" | "bank";
  note?: string;
  paidAt?: string | null;
}

export type AssetClass = "stock" | "etf" | "mutual" | "bond" | "crypto" | "cash" | "other";

export type HoldingAccountKind =
  | "brokerage"
  | "roth"
  | "traditional_401k"
  | "hsa"
  | "crypto"
  | "other";

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  accountKind: HoldingAccountKind;
  shares: number;
  costBasis: number;
  price: number;
  asOf: string;
  source?: "manual" | "broker";
  brokerId?: string;
}

export type NetWorthKind = "asset" | "liability";

export interface NetWorthItem {
  id: string;
  kind: NetWorthKind;
  name: string;
  amount: number;
  note?: string;
}

export type BrokerInstitution =
  | "fidelity"
  | "vanguard"
  | "schwab"
  | "etrade"
  | "robinhood"
  | "other";

export interface BrokerConnection {
  id: string;
  institution: BrokerInstitution;
  name: string;
  mask: string;
  status: LinkStatus;
  lastSyncedAt: string | null;
  marketValue: number;
}

export interface DebtItem {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
}

/** Consolidation-loan terms the user models against their current debts. */
export interface ConsolidationLoanConfig {
  apr: number; // annual percentage on the new loan
  termMonths: number; // fixed repayment term (e.g. 36 / 48 / 60)
  feePct: number; // origination fee as % of balances financed
}

export const DEFAULT_CONSOLIDATION_LOAN: ConsolidationLoanConfig = {
  apr: 12,
  termMonths: 48,
  feePct: 2,
};

export interface DailyCheckin {
  id: string;
  date: string;
  financialStress: number;
  note?: string;
  createdAt: string;
}

export type Temperature = "emerald" | "yellow" | "amber" | "crimson";

export interface PathStepSnapshot {
  id: string;
  title: string;
  kind: PathStepKind;
  daysFromNow: number;
  reasonCode: PathReasonCode;
  notes: string;
  fundingTarget: number | null;
  fundingLabel: string | null;
  status: PathStepStatus;
  completedAt: string | null;
}

export interface PathSnapshot {
  id: string;
  createdAt: string;
  score: number;
  verdict: VerdictKey;
  bindingConstraint: PathReasonCode | null;
  mode: PathMode;
  steps: PathStepSnapshot[];
}

export interface ReadinessProfile {
  creditScore: number;
  lifeStability: number;
  confidenceLevel: number;
  /** Solo when null — engine redistributes partner points. */
  partnerAlignment: number | null;
  fomoLevel: number;
  timeHorizonMonths: number;
  targetHomePrice: number;
  downPaymentSaved: number;
  assumedRatePct: number;
  termYears: number;
  taxInsuranceRatePct: number;
  hoaMonthly: number;
  currentRent: number;
  /** User has explicitly set profile fields (not defaults). */
  profileComplete?: boolean;
}

export interface HouseholdPartner {
  enabled: boolean;
  label: string;
  creditScore: number;
  lifeStability: number;
  confidenceLevel: number;
  fomoLevel: number;
  timeHorizonMonths: number;
  incomeShare: number;
  partnerAlignment: number;
}

/** Last closed-loop score impact toast payload. */
export interface ScoreImpactSnapshot {
  id: string;
  reason: string;
  fromScore: number;
  toScore: number;
  fromVerdict: string;
  toVerdict: string;
  delta: number;
  hardStopsCleared: number;
  hardStopsAdded: number;
  at: string;
  detail: string;
  headline?: string;
  nextHint?: string;
  actionKind?: string;
  pillarDeltas?: {
    financial: number;
    emotional: number;
    timing: number;
  };
  pathProgress?: { before: number; after: number };
  stepTitle?: string;
  alreadyDone?: boolean;
}

export interface BudgetState {
  /** True while the workspace is the first-visit / Reset demo sample. Not SoT. */
  demoWorkspace: boolean;
  transactions: Transaction[];
  savingsGoal: SavingsGoal;
  accounts: BankAccount[];
  bills: Bill[];
  bankLinkStatus: LinkStatus;
  lastBankSyncAt: string | null;
  holdings: Holding[];
  netWorthItems: NetWorthItem[];
  brokers: BrokerConnection[];
  brokerLinkStatus: LinkStatus;
  lastBrokerSyncAt: string | null;
  path: PathSnapshot | null;
  readinessProfile: ReadinessProfile;
  householdPartner: HouseholdPartner;
  debts: DebtItem[];
  dismissedSignals: string[];
  toolsOverlay: {
    extraDebtPayment: number;
    /** Consolidation-loan terms modeled in the Plan → Consolidate lab. */
    consolidation: ConsolidationLoanConfig;
  };
  checkins: DailyCheckin[];
  lastImpact: ScoreImpactSnapshot | null;
}

export type AddAccountInput = {
  institution: BankInstitution;
  name: string;
  type: BankAccountType;
  balance: number;
  available?: number;
  mask?: string;
};

/** Category chart strokes — brand tokens only (no third-party hex). */
export const PLANNER_CATEGORY_HEX: Record<CategoryId, string> = {
  housing: COLORS.cyan,
  food: COLORS.emerald,
  transport: COLORS.yellow,
  utilities: COLORS.amber,
  health: COLORS.emerald,
  entertainment: COLORS.cyan,
  shopping: COLORS.yellow,
  debt: COLORS.crimson,
  other: COLORS.amber,
  salary: COLORS.emerald,
  freelance: COLORS.cyan,
  investments: COLORS.yellow,
};
