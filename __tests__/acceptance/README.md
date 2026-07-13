# Acceptance suite — the Phase-3 oracle

These specs define the **target behaviour** for the highest-risk fixes
(BUILD-BRIEF §9). They are **implementation-agnostic** and are RED against the
current codebase on purpose — that is the proof they test behaviour, not a
tautology. An implementing agent must make them pass **without editing them**.

Run: `npm run test:acceptance`  (config: `vitest.acceptance.config.ts`)

They are excluded from the default `npm test` / CI gate so Phase 0–2 work is not
blocked; the Phase-3 merge gate runs this suite in addition.

| Spec | Locks | Red today because |
|---|---|---|
| verdict-canon | 80/65/50 inclusive; landing score↔verdict | landing shows 82 = "ALMOST THERE" |
| entitlements | tier→capability matrix, server-side | `lib/entitlements.ts` doesn't exist |
| shares-ownership | only owner can share (IDOR) | route inserts any assessmentId |
| checkout-auth | no anonymous checkout | route allows unauthenticated |
| stripe-webhook | signature/failure-retry/idempotency/lifecycle | 200-on-failure, no dedupe, ignores subscription.updated |
| rls.integration | cross-tenant isolation (opt-in) | needs live test project (RUN_RLS_IT=1) |

Verified 2026-07-08: verdict-canon flips green when 82→76; all others red on
current code, positives green. Baseline `npm test` stays 84/84 green (this dir
is excluded from the default gate and from `tsc`).
