/**
 * Database row types — mirrors supabase/migrations.
 */

export type SubscriptionTier = "free" | "plus" | "pro" | "family";
export type UserRole = "user" | "admin" | "partner" | "employee";
export type VerdictType = "READY" | "ALMOST_THERE" | "BUILD_FIRST" | "NOT_YET";
export type AssessmentStatus = "in_progress" | "completed" | "expired";
export type DimensionType = "financial" | "emotional" | "timing";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  subscription_tier: SubscriptionTier;
  subscription_status: string;
  stripe_customer_id: string | null;
  partner_id: string | null;
  /** First-touch acquisition snapshot — migration 00026. */
  attribution?: Record<string, unknown> | null;
  onboarding_completed: boolean;
  email_reminders_enabled: boolean;
  welcome_email_sent_at: string | null;
  last_reassessment_email_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: string;
  user_id: string;
  decision_type: string;
  status: AssessmentStatus;
  financial_score: number | null;
  emotional_score: number | null;
  timing_score: number | null;
  overall_score: number | null;
  verdict: VerdictType | null;
  inputs: Record<string, unknown> | null;
  sub_scores: Record<string, unknown> | null;
  insights: Record<string, unknown> | null;
  hard_stops: Record<string, unknown>[] | null;
  is_shadow: boolean;
  completed_at: string | null;
  created_at: string;
  /** Set once the user confirms "I'm deciding anyway" despite the verdict. Never changes score/verdict. */
  user_override: { at: string; acknowledged_hard_stops: boolean } | null;
  /** First-touch acquisition snapshot — migration 00026. */
  attribution?: Record<string, unknown> | null;
}

export type OutcomeSurveyKind = "day30" | "day90" | "day365";

export interface OutcomeSurvey {
  id: string;
  user_id: string;
  assessment_id: string | null;
  due_at: string;
  kind: OutcomeSurveyKind;
  completed_at: string | null;
  satisfaction: number | null;
  outcome: string | null;
  notes: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  decision_type: string;
  title: string;
  context: string | null;
  expected_impact: string | null;
  actual_impact: string | null;
  mood: number | null;
  decision_date: string | null;
  outcome_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  mood: number;
  financial_stress: number;
  decision_pressure: number;
  note: string | null;
  created_at: string;
}

export interface AdvisorConversation {
  id: string;
  user_id: string;
  assessment_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AdvisorMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  kind: "employer" | "partner";
  plan: string;
  stripe_customer_id: string | null;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  source: string | null;
  interested_in: string[] | null;
  status: string;
  created_at: string;
}

export type CalendarEventKind = "milestone" | "deadline" | "review" | "payment";

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  kind: CalendarEventKind;
  event_date: string; // ISO date, YYYY-MM-DD
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface FinancialSnapshot {
  id: string;
  user_id: string;
  state: Record<string, unknown>;
  net_worth: number;
  net_cash_flow: number;
  savings_rate: number;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreditSnapshot {
  id: string;
  user_id: string;
  score: number;
  utilization: number;
  on_time_streak_months: number;
  band: string | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface BehavioralGenome {
  id: string;
  user_id: string;
  answers: Record<string, unknown>;
  scores: Record<string, unknown>;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export type GoalKind = "down_payment";

export interface Goal {
  id: string;
  user_id: string;
  kind: GoalKind;
  label: string | null;
  target_amount: number;
  target_date: string | null; // ISO date, YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

/** Manual Finance dashboard state (00023, audit T2.6) — one row per user. */
export interface UserFinanceStateRow {
  user_id: string;
  /** The whole FinanceState (lib/finance/store.ts) as jsonb. */
  state: Record<string, unknown>;
  /** ms-epoch LWW stamp; bigint arrives as a string via PostgREST. */
  client_updated_at: number | string;
  created_at: string;
  updated_at: string;
}

export type PlaidItemStatus =
  | "healthy"
  | "login_required"
  | "pending_disconnect"
  | "pending_expiration"
  | "revoked";

export interface PlaidItem {
  id: string;
  user_id: string;
  item_id: string;
  /** AES-256-GCM ciphertext of the Plaid access token (lib/plaid/crypto.ts). Service-role only. */
  access_token_ct: string;
  key_version: number;
  institution_id: string | null;
  institution_name: string | null;
  status: PlaidItemStatus;
  transactions_cursor: string | null;
  cursor_updated_at: string | null;
  last_successful_sync: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaidAccount {
  id: string;
  item_id: string;
  account_id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency: string | null;
  updated_at: string;
}
