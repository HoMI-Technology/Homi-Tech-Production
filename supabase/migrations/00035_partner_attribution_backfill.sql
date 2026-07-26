-- =============================================================================
-- 00035_partner_attribution_backfill.sql
-- Dual-path partner attribution hygiene:
--   1) Denorm assessments.referral_source = partner_user_id when JSON attribution
--      ref matches a partner_codes.code but referral_source is still null/code.
--   2) Keep partner_code_stats / partner_recent_assessments aligned with both
--      attribution->>'ref' AND denorm referral_source = partner_user_id.
-- Privacy: still no emails; partner RPCs stay identity-stripped.
-- =============================================================================

-- Backfill denorm key from invite code → partner profile id.
update assessments a
set referral_source = pc.partner_user_id::text
from partner_codes pc
where a.referral_source is null
  and a.attribution is not null
  and lower(a.attribution ->> 'ref') = lower(pc.code)
  and pc.partner_user_id is not null;

-- Also fix rows that stamped the raw ptr_ code instead of partner uuid.
update assessments a
set referral_source = pc.partner_user_id::text
from partner_codes pc
where a.referral_source is not null
  and lower(a.referral_source) = lower(pc.code)
  and pc.partner_user_id is not null;

-- Partner portal stats: match denorm OR json ref (covers pre/post write paths).
create or replace function partner_code_stats(p_code text)
returns table (
  assessment_count bigint,
  recent_count bigint,
  avg_score numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid;
begin
  select pc.partner_user_id into v_partner
  from partner_codes pc
  where pc.code = p_code and pc.partner_user_id = auth.uid();

  if v_partner is null then
    return query select 0::bigint, 0::bigint, null::numeric;
    return;
  end if;

  return query
    select
      count(*)::bigint,
      count(*) filter (where a.created_at >= now() - interval '30 days')::bigint,
      round(avg(a.overall_score))::numeric
    from assessments a
    where a.status = 'completed'
      and (
        a.attribution ->> 'ref' = p_code
        or a.referral_source = v_partner::text
      );
end;
$$;

revoke all on function partner_code_stats(text) from public;
grant execute on function partner_code_stats(text) to authenticated;

create or replace function partner_recent_assessments(p_code text, p_limit integer default 10)
returns table (
  created_at timestamptz,
  verdict text,
  overall_score integer,
  is_shadow boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid;
begin
  select pc.partner_user_id into v_partner
  from partner_codes pc
  where pc.code = p_code and pc.partner_user_id = auth.uid();

  if v_partner is null then
    return;
  end if;

  return query
    select a.created_at, a.verdict::text, a.overall_score, a.is_shadow
    from assessments a
    where a.status = 'completed'
      and (
        a.attribution ->> 'ref' = p_code
        or a.referral_source = v_partner::text
      )
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

revoke all on function partner_recent_assessments(text, integer) from public;
grant execute on function partner_recent_assessments(text, integer) to authenticated;

-- ROLLBACK:
-- (restore 00031 definitions; reverse updates are not auto-reversed)
