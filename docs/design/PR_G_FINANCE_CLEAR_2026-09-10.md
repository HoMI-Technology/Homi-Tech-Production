# PR G — Money v4 finance CLEAR — 2026-09-10

**Status:** CLEAR  
**PR:** stay-draft PR G

## GATE

Score / verdict / hard stops on Money come from **AssessmentResult** (last-read
row). Money sequences a live cash picture. It does not mint a second score and
does not write AssessmentResult.

## Locked

- Empty or live SSOT only. Do not invent balances, surplus, net worth, or ~pts.
- Live dollars come from stored Plaid rows (`plaid_items` + `plaid_accounts`)
  already written by the trusted sync path. Do not rewrite `lib/plaid/sync.ts`,
  crypto, or ledger math. Tokens stay where they are.
- Connected always paints **age** from `last_successful_sync` (or Age unknown).
  Stale / syncing / error stay honest. Never hide a missing refresh behind a
  pretty $0.
- Hard stop outranks. Connecting does not clear the hold. Empty-or-live only —
  never On track / READY theater on this page.
- Free === Pro on the last read. Identity product is not a verified-identity
  badge. Do not rewrite `lib/scoring/*`.

## OUT

Invent $ · second score · Identity-as-verified · WEIGHTS / Packet2 / FI v2 ·
guest official score · Plaid token exposure · `supabase db push`
