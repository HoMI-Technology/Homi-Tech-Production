-- =============================================================================
-- 00002_tables.sql — HōMI core schema
-- Matches types/database.ts exactly. Idempotent via IF NOT EXISTS.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role not null default 'user',
  subscription_tier subscription_tier not null default 'free',
  subscription_status text not null default 'active',
  stripe_customer_id text,
  partner_id uuid references profiles (id),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- assessments
-- ---------------------------------------------------------------------------
create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  decision_type text not null default 'home_buying',
  status assessment_status not null default 'completed',
  financial_score numeric,
  emotional_score numeric,
  timing_score numeric,
  overall_score numeric check (overall_score between 0 and 100),
  verdict verdict_type,
  inputs jsonb,
  sub_scores jsonb,
  insights jsonb,
  hard_stops jsonb not null default '[]',
  is_shadow boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- question_bank
-- ---------------------------------------------------------------------------
create table if not exists question_bank (
  id text primary key,
  dimension dimension_type not null,
  category text,
  question_text text not null,
  question_type text not null,
  options jsonb,
  weight numeric,
  order_index int,
  decision_types text[],
  scoring_function jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- decision_journal
-- ---------------------------------------------------------------------------
create table if not exists decision_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  decision_type text,
  title text not null,
  context text,
  expected_impact text,
  actual_impact text,
  mood int check (mood between 1 and 10),
  decision_date date,
  outcome_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- daily_checkins
-- ---------------------------------------------------------------------------
create table if not exists daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  mood int not null check (mood between 1 and 10),
  financial_stress int not null check (financial_stress between 1 and 10),
  decision_pressure int not null check (decision_pressure between 1 and 10),
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- advisor_conversations
-- ---------------------------------------------------------------------------
create table if not exists advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete cascade,
  assessment_id uuid references assessments (id) on delete set null,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- advisor_messages
-- ---------------------------------------------------------------------------
create table if not exists advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references advisor_conversations (id) on delete cascade,
  role message_role not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  kind org_kind not null default 'employer',
  plan text default 'starter',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations (id) on delete cascade,
  profile_id uuid references profiles (id) on delete cascade,
  role text default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- score_shares
-- ---------------------------------------------------------------------------
create table if not exists score_shares (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments (id) on delete cascade,
  created_by uuid references profiles (id) on delete cascade,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  access_type text default 'view',
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- waitlist
-- ---------------------------------------------------------------------------
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  interested_in text[],
  status text default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action_type text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
