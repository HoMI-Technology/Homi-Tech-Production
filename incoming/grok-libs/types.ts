/**
 * HōMI Budget Planner domain types — single source for store + UI.
 */

import type {
  PathMode,
  PathReasonCode,
  PathStepKind,
  PathStepStatus,
} from "./path";

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

export type IncomeCategory =
  | "salary"
  | "freelance"
  | "investments"
  | "other";

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

export type BankInstitution =
  | "chase"
  | "bofa"
  | "wells"
  | "capitalone"
  | "ally"
  | "other";

export type BankAccountType = "checking" | "savings" | "credit" | "other";

export type LinkStatus =
  | "disconnected"
  | "connecting"
  | "linked"
  | "error";

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

export type BillStatus =
  | "upcoming"
  | "due"
  | "overdue"
  | "scheduled"
  | "paid";

export type BillFrequency =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "once";

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

export type AssetClass =
  | "stock"
  | "etf"
  | "mutual"
  | "bond"
  | "crypto"
  | "cash"
  | "other";

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
  verdict: "READY" | "ALMOST" | "NOT_YET";
  bindingConstraint: PathReasonCode | null;
  mode: PathMode;
  steps: PathStepSnapshot[];
}

export interface ReadinessProfile {
  creditScore: number;
  lifeStability: number;
  confidenceLevel: number;
  partnerAlignment: number;
  fomoLevel: number;
  timeHorizonMonths: number;
  targetHomePrice: number;
  downPaymentSaved: number;
  assumedRatePct: number;
  termYears: number;
  taxInsuranceRatePct: number;
  hoaMonthly: number;
  currentRent: number;
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

export interface DebtItem {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
}

export interface DailyCheckin {
  id: string;
  date: string; // YYYY-MM-DD
  financialStress: number; // 1-10
  note?: string;
  createdAt: string;
}

export type Temperature = "emerald" | "yellow" | "amber" | "crimson";

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
  };
  checkins: DailyCheckin[];
  lastImpact: ScoreImpactSnapshot | null;
}
