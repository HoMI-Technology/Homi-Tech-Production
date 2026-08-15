-- Phase 0 Safety Canon — person-scoped freeze store.
-- Signed-in freeze is server-authoritative. Lift is 24h expiry only.
-- No household/partner column. Authenticated users may SELECT their own row
-- and call the ingest RPC; they cannot UPDATE/DELETE the row to unfreeze.

create table if not exists phase0_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  frozen_until timestamptz,
  tripped_at timestamptz,
  financial_stress boolean not null default false,
  self_harm boolean not null default false,
  signal_ids text[] not null default '{}',
  ledger jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table phase0_state enable row level security;
alter table phase0_state force row level security;

drop policy if exists "phase0_state_owner_select" on phase0_state;
create policy "phase0_state_owner_select"
  on phase0_state for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated. Writes go through
-- phase0_ingest, which can trip a freeze but cannot clear an active one.

create or replace function phase0_get_state()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row phase0_state%rowtype;
  is_frozen boolean;
begin
  if uid is null then
    return null;
  end if;

  select * into row from phase0_state where user_id = uid;
  if not found then
    return jsonb_build_object(
      'frozen', false,
      'frozen_until', null,
      'tripped_at', null,
      'financial_stress', false,
      'self_harm', false,
      'signal_ids', '[]'::jsonb,
      'ledger', '[]'::jsonb
    );
  end if;

  is_frozen := row.frozen_until is not null and row.frozen_until > now();

  return jsonb_build_object(
    'frozen', is_frozen,
    'frozen_until', row.frozen_until,
    'tripped_at', row.tripped_at,
    'financial_stress', row.financial_stress,
    'self_harm', row.self_harm,
    'signal_ids', to_jsonb(row.signal_ids),
    'ledger', row.ledger
  );
end;
$$;

create or replace function phase0_ingest(
  p_ledger jsonb,
  p_trip boolean,
  p_financial_stress boolean,
  p_self_harm boolean,
  p_signal_ids text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing phase0_state%rowtype;
  active boolean;
begin
  if uid is null then
    raise exception 'phase0_ingest requires an authenticated user';
  end if;

  insert into phase0_state (user_id, ledger)
    values (uid, coalesce(p_ledger, '[]'::jsonb))
    on conflict (user_id) do nothing;

  select * into existing from phase0_state where user_id = uid for update;
  active := existing.frozen_until is not null and existing.frozen_until > now();

  if active then
    -- Lift is expiry only. Never shorten, null, or overwrite until.
    update phase0_state
      set ledger = coalesce(p_ledger, existing.ledger),
          updated_at = now()
      where user_id = uid;
  elsif p_trip then
    update phase0_state
      set ledger = coalesce(p_ledger, '[]'::jsonb),
          frozen_until = now() + interval '24 hours',
          tripped_at = now(),
          financial_stress = coalesce(p_financial_stress, false),
          self_harm = coalesce(p_self_harm, false),
          signal_ids = coalesce(p_signal_ids, '{}'),
          updated_at = now()
      where user_id = uid;
  else
    update phase0_state
      set ledger = coalesce(p_ledger, existing.ledger),
          updated_at = now()
      where user_id = uid;
  end if;

  return phase0_get_state();
end;
$$;

revoke all on function phase0_get_state() from public;
revoke all on function phase0_ingest(jsonb, boolean, boolean, boolean, text[]) from public;

grant execute on function phase0_get_state() to authenticated;
grant execute on function phase0_ingest(jsonb, boolean, boolean, boolean, text[]) to authenticated;

-- ROLLBACK:
-- drop function if exists phase0_ingest(jsonb, boolean, boolean, boolean, text[]);
-- drop function if exists phase0_get_state();
-- drop table if exists phase0_state;
