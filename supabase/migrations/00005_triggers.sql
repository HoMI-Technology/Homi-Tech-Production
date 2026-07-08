-- =============================================================================
-- 00005_triggers.sql — auth.users → profiles provisioning, updated_at touch
-- =============================================================================

-- ---------------------------------------------------------------------------
-- handle_new_user() — provisions a profile row whenever a new auth user
-- is created. Idempotent via ON CONFLICT DO NOTHING.
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- touch_updated_at() — generic updated_at maintenance function.
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on profiles;
create trigger set_updated_at
  before update on profiles
  for each row execute function touch_updated_at();

drop trigger if exists set_updated_at on decision_journal;
create trigger set_updated_at
  before update on decision_journal
  for each row execute function touch_updated_at();

drop trigger if exists set_updated_at on advisor_conversations;
create trigger set_updated_at
  before update on advisor_conversations
  for each row execute function touch_updated_at();
