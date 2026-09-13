# PR F — Path v4 finance CLEAR — 2026-09-10

**Status:** CLEAR  
**PR:** stay-draft PR F

## GATE

Score / verdict / hard stops on Path come from **AssessmentResult** (last-read
row + stored readiness path). Path sequences protective next steps. It does
not mint a second score and does not quote finance defaults.

## Locked

- No invented $ in the Path body. Do not render `fundingTarget` / ledger
  amounts / Plaid balances on `/path`.
- Deep-link **Money** (`/money`) and **Assess** (`/assessment`) only. Path is
  not a ledger, Connect-accounts surface, or Plaid UI.
- Free === Pro on the last read. Hard stops outrank.
- Do not rewrite `lib/scoring/*`. Call the existing readiness-path engine.

## OUT

Invent $ · Path-as-ledger · Plaid chrome on `/path` · WEIGHTS / Packet2 /
FI v2 · guest official score
