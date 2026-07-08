-- 00013_advisor_usage.sql
-- Server-authoritative daily message quota for the AI Companion endpoints
-- (advisor/twin/trinity), backing entitlements.advisorMessagesPerDay.
-- A daily quota is low-frequency and belongs in Postgres, NOT Redis: this is
-- durable, authoritative across serverless instances, and needs no extra infra.
-- (Upstash Redis is still the right tool for burst rate-limiting — AUDIT T1.4 —
-- which is a separate concern.)
-- Assumes 00011/00012 land first; renumber during the T0.6 migration-history repair.

create table if not exists advisor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table advisor_usage enable row level security;
alter table advisor_usage force row level security;

-- Owner may read their own usage (write happens through the SECURITY DEFINER
-- function below, so no INSERT/UPDATE policy is granted to the user directly).
drop policy if exists "advisor_usage_owner_select" on advisor_usage;
create policy "advisor_usage_owner_select"
  on advisor_usage for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Atomic "consume one message if under the limit". Row-locks today's counter so
-- concurrent lambda invocations can't race past the quota. Returns true when a
-- message was consumed, false when the caller is already at/over the limit.
create or replace function try_consume_advisor_message(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  insert into advisor_usage (user_id, day, count)
    values (uid, current_date, 0)
    on conflict (user_id, day) do nothing;

  select count into current_count
    from advisor_usage
    where user_id = uid and day = current_date
    for update;

  if current_count >= p_limit then
    return false;
  end if;

  update advisor_usage
    set count = count + 1
    where user_id = uid and day = current_date;

  return true;
end;
$$;

revoke all on function try_consume_advisor_message(integer) from public;
grant execute on function try_consume_advisor_message(integer) to authenticated;
