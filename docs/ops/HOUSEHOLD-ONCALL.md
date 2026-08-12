# Household journey — on-call questions

Journey: signed-in Family-tier user creates a household, invites a partner,
partner accepts the token.

## Questions this path can answer

1. **Did this invite fail because of entitlements or the database?**
   Filter logs for `event=household_invite_failed` (or `household_accept_failed`)
   and read `code` + `status`. `household_locked` / `family_seats_full` (402)
   are expected plan gates. Missing `code` with `status=500` is a DB/insert
   failure — check Supabase for `household_invites` / `household_members`.

2. **Which request was it?**
   Every household create / invite / accept / GET response sets `x-request-id`.
   Search structured logs for that `requestId`. Tokens and emails are never
   written to the log line.

## What is not in the logs

Invite tokens, partner emails, `Authorization` headers, cookies.
