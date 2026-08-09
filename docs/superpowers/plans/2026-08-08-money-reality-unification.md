# Money Reality Unification Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Unify finance + tools into one Money Reality surface with ledger-backed CFM and an ultra-premium OPERATE cockpit.

**Architecture:** Budget ledger is SoT → CFM view + decision overlay → lenses at `/tools/*`. Chrome home is `/money` (Stand / Track / Plan / Decide).

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing `components/operate/*`, `lib/finance/*`, `lib/tools/*`.

## Global Constraints

- HōMI ō spelling; educational guidance only; never-say list
- AI never calculates; code owns CFM/deltas
- No scoring engine changes
- Brand tokens only (`lib/brand`, brand-check)
- Route protection classification must stay exhaustive

---

### Task 1: Ledger → CFM spine

**Files:**

- Modify: `lib/tools/cfm.ts`
- Test: `__tests__/tools-cfm.test.ts`

- [x] Prefer ledger when `hasSavedBudgetLedger()` and ledger has real data
- [x] Fall back to legacy `FinanceState`
- [x] Keep overlay for decision fields

### Task 2: Money mode chrome + Stand

**Files:**

- Create: `components/money/*`
- Create: `app/(product)/money/page.tsx`, `loading.tsx`, layout mode nav

### Task 3: Track + Plan routes

**Files:**

- Create: `app/(product)/money/budget/page.tsx`, `plan/page.tsx`, `decide/page.tsx`

### Task 4: Nav, redirects, protection

**Files:**

- Modify: `lib/layout/nav-catalog.ts`, `lib/auth/protected-routes.ts`, `next.config.ts`
- Sweep: finance hrefs → `/money`

### Task 5: Verify

- [ ] `npx vitest run` targeted suites
- [ ] `npx tsc --noEmit` if feasible
