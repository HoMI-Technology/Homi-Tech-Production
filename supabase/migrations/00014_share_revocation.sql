-- =============================================================================
-- 00014_share_revocation.sql — revocable score-share links (T1.7).
-- assumes 00011/00012/00013 land first; renumber during T0.6 repair.
--   • score_shares.revoked_at distinguishes an owner-revoked link from one
--     that merely expired.
--   • get_shared_assessment (from 00008, hardened in 00009) now also
--     returns nothing for a revoked link. Signature, SECURITY DEFINER, and
--     pinned search_path are preserved exactly from 00008.
-- =============================================================================

alter table score_shares add column if not exists revoked_at timestamptz;

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
    and (s.expires_at is null or s.expires_at > now())
    and s.revoked_at is null;
$$;

grant execute on function get_shared_assessment(text) to anon, authenticated;
