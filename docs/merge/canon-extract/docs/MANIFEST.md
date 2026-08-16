# Canon Manifest — Homi-Tech-Production fetch snapshot

Source: `github.com/HoMI-Technology/Homi-Tech-Production` (default branch `main`), fetched read-only via GitHub API. Files saved raw, unmodified.

| Path | Size (bytes) | Purpose |
|------|-------------|---------|
| canon/trinity/fallback.ts | 11940 | Deterministic Trinity Engine fallback that composes Advocate/Skeptic/Arbiter perspectives from real pillar data when the LLM is unavailable. |
| canon/twin/fallback.ts | 8169 | Deterministic Temporal Twin letter builder producing future-self letters per verdict × horizon (12 combinations) when the LLM is unavailable. |
| canon/finance/calculations.ts | 10442 | Pure Budget & Runway period math: income/spend/refund aggregates, category plan-vs-actual, runway, and goal projection. |
| canon/finance/local-ledger.ts | 19057 | Local-first ledger persistence with defensive localStorage loading, schema versioning, and pure mutation helpers for manual budget UI. |
| canon/finance/ledger.ts | 7138 | Ledger domain types (transactions, categories, periods, allocations, goals, recurring rules) plus default seed categories. |
| canon/finance/validation.ts | 4303 | Zod schemas validating ledger mutation request bodies (transaction create/update, period upsert, goal upsert). |
| canon/finance/money.ts | 2914 | Money primitives: integer-cents type, dollars↔cents conversion, safe summation, and USD formatting. |
| canon/finance/readiness-snapshot.ts | 4229 | Readiness integration contract: completeness grading and snapshot assembly handed from the budget system to the readiness layer. |
| canon/docs/COMPANION-ECOSYSTEM.md | 14918 | Single-source blueprint for how the HōMI Companion ("the mote") integrates across all product surfaces, phased by shipped/planned work. |
| canon/docs/AGENTS.md | 10602 | Agent/operator SSOT: repo source-of-truth rules, cross-machine sync protocol, writer permissions, and the five binding product guardrails. |
| canon/docs/GO-LIVE-CHECKLIST.md | 11837 | Owner-only launch checklist (email/DNS, migrations, Stripe, Vercel, observability, secrets) ordered by what breaks first under traffic. |
| canon/docs/SECURITY.md | 5120 | Security policy: supported versions, vulnerability reporting, implemented controls (CSP, headers, auth, RLS, webhooks), and audit history. |
| canon/docs/Plans.md | 15572 | Site reorganization plan (Phases 0–4 plus carried/found threads) tracking typecheck fixes, dead-code removal, IA, and UI primitive unification. |
| canon/scripts/brand-check.mjs | 26502 | Extended brand-check CI script scanning code and copy for misspelled brand, forbidden words, banned hexes, unsupported claims, and suppression misuse. |
| canon/brand/index.ts | 4081 | Brand core constants: canonical palette, verdict metadata, pillars, legal disclaimer, and taglines (locked to CANON.md). |

## Notes

- All 15 requested files fetched and saved successfully; zero failures.
- `canon/brand/index.ts` re-fetched this wave; content matches current `main` (SHA 2ff9d78).
- Syntax spot-check: `node --check scripts/brand-check.mjs` passed.
