-- =============================================================================
-- 00030_partner_stats.sql — partner-scoped, anonymized portal stats.
-- Apply after 00029.
--
-- The partner portal previously queried assessments with the user-scoped
-- client: under owner-only RLS a partner saw counts of THEIR OWN assessments
-- labeled "platform-wide" — doubly wrong. These SECURITY DEFINER functions are
-- the only partner read path into other users' assessment data, and they:
--   • verify the caller owns the partner code they're asking about;
--   • return aggregates and identity-stripped rows only (no user_id, no email,
--     no inputs) — a partner can never read a client's row;
--   • scope strictly to assessments stamped with that partner's ref (00019).
-- =============================================================================

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
begin
  if not exists (
    select 1 from partner_codes pc
    where pc.code = p_code and pc.partner_user_id = auth.uid()
  ) then
    return query select 0::bigint, 0::bigint, null::numeric;
    return;
  end if;

  return query
    select
      count(*)::bigint,
      count(*) filter (where a.created_at >= now() - interval '30 days')::bigint,
      round(avg(a.overall_score))::numeric
    from assessments a
    where a.attribution ->> 'ref' = p_code;
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
begin
  if not exists (
    select 1 from partner_codes pc
    where pc.code = p_code and pc.partner_user_id = auth.uid()
  ) then
    return;
  end if;

  return query
    select a.created_at, a.verdict::text, a.overall_score, a.is_shadow
    from assessments a
    where a.attribution ->> 'ref' = p_code
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 10), 1), 50);
end;
$$;

revoke all on function partner_recent_assessments(text, integer) from public;
grant execute on function partner_recent_assessments(text, integer) to authenticated;

-- ROLLBACK:
-- drop function if exists partner_recent_assessments(text, integer);
-- drop function if exists partner_code_stats(text);
