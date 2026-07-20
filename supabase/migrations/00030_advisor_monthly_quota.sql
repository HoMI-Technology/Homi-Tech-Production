-- =============================================================================
-- 00030_advisor_monthly_quota.sql — monthly ceiling for Companion usage.
-- Apply after 00022.
--
-- Daily quotas alone leave the monthly LLM spend tail uncapped: a Plus user at
-- the daily ceiling every day costs a multiple of the tier price. v2 adds a
-- monthly ceiling checked in the same atomic consume step. The v1 function is
-- kept (not dropped) so already-deployed code keeps working until the quota
-- gate switches to v2; drop v1 in a later contraction migration.
--
-- Concurrency: the insert + FOR UPDATE row lock on today's counter serializes
-- concurrent consumes per user, so the monthly sum read under that lock cannot
-- race past the ceiling.
-- =============================================================================

create or replace function try_consume_advisor_message_v2(
  p_daily_limit integer,
  p_monthly_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  month_count integer;
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

  if current_count >= p_daily_limit then
    return false;
  end if;

  select coalesce(sum(count), 0) into month_count
    from advisor_usage
    where user_id = uid
      and day >= date_trunc('month', current_date)::date;

  if month_count >= p_monthly_limit then
    return false;
  end if;

  update advisor_usage
    set count = count + 1
    where user_id = uid and day = current_date;

  return true;
end;
$$;

revoke all on function try_consume_advisor_message_v2(integer, integer) from public;
grant execute on function try_consume_advisor_message_v2(integer, integer) to authenticated;

-- ROLLBACK:
-- drop function if exists try_consume_advisor_message_v2(integer, integer);
