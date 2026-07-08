-- =============================================================================
-- 00008_share_rpc.sql — public score-share lookup via SECURITY DEFINER RPC.
-- Exposes only non-sensitive result fields, only for unexpired tokens.
-- =============================================================================

create or replace function get_shared_assessment(token text)
returns table (
  overall_score numeric,
  verdict verdict_type,
  financial_score numeric,
  emotional_score numeric,
  timing_score numeric,
  is_shadow boolean,
  completed_at timestamptz,
  shared_by text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.overall_score,
    a.verdict,
    a.financial_score,
    a.emotional_score,
    a.timing_score,
    a.is_shadow,
    a.completed_at,
    coalesce(p.full_name, 'A HōMI member') as shared_by
  from score_shares s
  join assessments a on a.id = s.assessment_id
  left join profiles p on p.id = s.created_by
  where s.share_token = token
    and (s.expires_at is null or s.expires_at > now());
$$;

grant execute on function get_shared_assessment(text) to anon, authenticated;