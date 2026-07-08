-- =============================================================================
-- 00003_indexes.sql — HōMI indexes
-- =============================================================================

create index if not exists idx_assessments_user_created
  on assessments (user_id, created_at desc);

create index if not exists idx_decision_journal_user_created
  on decision_journal (user_id, created_at desc);

create index if not exists idx_daily_checkins_user_created
  on daily_checkins (user_id, created_at desc);

create index if not exists idx_advisor_messages_conversation_created
  on advisor_messages (conversation_id, created_at);

create index if not exists idx_waitlist_email
  on waitlist (email);

create index if not exists idx_profiles_stripe_customer_id
  on profiles (stripe_customer_id);

create index if not exists idx_score_shares_share_token
  on score_shares (share_token);
