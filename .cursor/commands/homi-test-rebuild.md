# MISSION: Ground-up rebuild of six HōMI test suites to production grade

> **Local-machine note (host constraint, not part of the original spec):** on
> this Windows machine `npm run build` fails BY DESIGN (Smart App Control
> blocks `@next/swc`) — run the §7 gate's build step via CI on the PR or in a
> cloud agent; never patch SWC config to force a local build. Read
> `docs/knowledge/homi-agent-knowledge.md` before Phase −1. Coordinate with
> `/homi-redesign-loop` per its sibling-mission rules: never rebuild tests
> for a directory while a redesign agent is rewriting its components.
>
> **Partial Phase −1 pre-verification, run 2026-08-29 against origin/main
> (`c1727cd`)** — spot-checks only; the full Phase −1 still runs:
> scope confirmed exactly (dashboard 20, finance 18, layout 5, marketing 12,
> observe 2, planner 19 = 76 files); F1 confirmed (`environment: "node"`,
> vitest.config.ts:23); F15 confirmed (vitest ^4.1.11, RTL ^16.3.2,
> user-event ^14.6.5, jsdom ^30, playwright ^1.62.1; zero hits for
> coverage-v8 / ts-morph / stryker). ⚠ The repo moves fast: local checkouts
> go stale in hours — **fetch origin and work from origin/main; re-derive
> everything else in Phase −1 at run time.** Note for the ledger:
> `components/finance/ThresholdCompass.tsx` has zero product importers but
> is pinned by three test files in your scope (`finance/threshold-compass`,
> `finance-packet-copy-lock`, `layout/app-sidebar`) — a live
> KEEP/DELETE/re-adopt decision shared with the redesign loop.

You are the lead agent for a test-architecture rebuild in
`HoMI-Technology/Homi-Tech-Production` (HōMI — Decision Readiness Intelligence).
You have subagents and a persistent knowledge store. Both are load-bearing here: this task
is larger than one context window, and §8 tells you exactly how to split it.

---

## 0. SCOPE AND INTERPRETATION — read this before anything else

**This mission rebuilds the TEST SUITES, not the product.** Six directories under
`__tests__/`, 76 files. When a rebuilt test exposes a product defect — and it will — the
defect goes into `docs/ops/product-defects.md` with file, line, severity, and the failing
test that proves it. You do not fix product code in this effort, with one narrow carve-out:
a *testability extraction* (moving already-existing decision logic from a component into a
pure `lib/` module, byte-equivalent behavior, proven inert by the green legacy suite) is
allowed, must be its own commit, and must be flagged `TESTABILITY-EXTRACTION` in the report.
Changing what the product *does* to make a test passable is never allowed.

**In scope (76 files):**

- `__tests__/dashboard/` (20) — admin, attribution, employee-access,
  financial-position-ledger(.tsx), fold-truth, fold-wiring, genome-scores,
  home-money-standing, last-read-chrome, palette-visibility, partner-invite-empty, partner,
  report-signin-redirect, revenue-intelligence, sign-in-redirect, spend, surface-roles,
  switcher-visibility, trinity, verdict-fold-motion(.tsx)
- `__tests__/finance/` (18) — banners(.tsx), debt-payoff-preview, goal-semantics, goal-sync,
  insights-api, ledger-bridge, ledger-sync-reconcile, metrics, migrate-from-legacy,
  observed-prefill, overview-components(.tsx), plan-tab(.tsx), prefill-confirm,
  readiness-snapshot, recheck-prompt, scoring-import-guard, temperature,
  threshold-compass(.tsx)
- `__tests__/layout/` (5) — app-header-nav, app-sidebar(.tsx), money-mode-nav,
  nav-catalog-parity, product-bottom-nav(.tsx)
- `__tests__/marketing/` (12) — FirstMoment(.tsx), chrome-honesty, cookies-policy,
  decision-os-positioning, first-moment-copy, guides-faq(.tsx), homepage-walk, how-it-works,
  legal-pages, primary-close, quiet-home-footer, walk-tokens
- `__tests__/observe/` (2) — log, request-context
- `__tests__/planner/` (19) — banks-connect-cta(.tsx), calendar-formulas, calendar,
  closed-loop, companion, empty-confirm-polish(.tsx), first-visit-seed, goals-derive,
  goals-progress(.tsx), impact, nudgerail-overview-hide(.tsx), plan-cash-flow(.tsx),
  readiness-hero-hard-stops(.tsx), score-bridge, scoring-import-guard, store-parity,
  store-persistence, track-bottom-strip(.tsx), transactions-derive

**Out of scope, do not touch:** the other `__tests__/` directories (advisor, agents, api,
ci, cloud, security, …) and the root-level guard files (`money-reality-hero.test.ts`,
`outcomes-ping-v0.test.ts`, `measure-act-wave1-locks.test.ts`, …). They must stay green.
The T3 policy harness you build (§4) must be designed so they can migrate onto it later;
when a new policy rule duplicates a root-level guard, record the overlap in the ledger and
leave the root file alone.

---

## 1. FINDINGS HANDED TO YOU (verify every one before relying on it)

Observed by direct inspection of `main`, which is receiving commits hourly. Phase −1 (§6)
requires you to re-derive each finding and report *confirmed / changed / not-found* before
you act. A finding that no longer holds goes in the first line of your first report.

| # | Finding | Evidence observed |
|---|---|---|
| F1 | `vitest.config.ts` (43 lines) sets `environment: "node"`. No DOM by default. | `jsdom` ×0, `happy-dom` ×0, `"node"` ×1 |
| F2 | No coverage configuration exists — no provider, thresholds, or reporter. | `coverage` ×0 in config |
| F3 | No `include`, no `projects` split. One flat run plus `vitest.acceptance.config.ts` (24 lines, also node, with `include`). | direct read |
| F4 | DOM is per-file opt-in via `// @vitest-environment jsdom` docblock; `verdict-fold-motion.test.tsx` line 1 does this correctly and calls `cleanup` in `afterEach`. | direct read |
| F5 | 10 files across `__tests__/` import `readFileSync` and assert on source text — recurring shape: `function read(rel){ return readFileSync(resolve(process.cwd(), rel), "utf8") }` → `expect(read(...)).toContain(...)`. Note: some of the 10 are outside the six target dirs. | code search: 10 files |
| F6 | 18 files use `toContain`. In `verdict-fold-motion.test.tsx`: 22 of 29 expects are `toContain`, vs 3 `render()` and 2 `screen.` uses. | direct count |
| F7 | **Zero files use `userEvent` — yet `@testing-library/user-event@^14.6.5` is installed.** `fireEvent` count: 0 files. This is an adoption gap, not a tooling gap; no dependency work is needed to close it. | search + package.json |
| F8 | ~3 files import `@testing-library/react` against ~13 `.tsx` test files. RTL 16, `jest-dom` ^7, `jsdom` ^30 are all installed. | search + package.json |
| F9 | Motion/CSS tests assert on stylesheet text: `it("globals.css carries the calm motion kit")`, `it("reduced motion kills the sheet animation, typing dots, and score reveal")` — implemented by reading `app/globals.css` as a string. | direct read |
| F10 | Files mix incompatible concerns: `verdict-fold-motion.test.tsx` holds component rendering, a11y names, CSS-text assertions, and `describe("naming law — rescued surfaces never say HōMI-Score")` in one file. | direct read |
| F11 | `scoring-import-guard.test.ts` exists twice (finance/, planner/). | direct listing |
| F12 | **T0 reference implementation exists:** `dashboard/fold-truth.test.ts` — 247 lines, 14 describe, 29 it, 50 expect, 0 mocks, 0 fs reads, single import `@/lib/dashboard/fold-truth`, names like "returns null when a hard stop is active — never a percent over a stop". | direct read |
| F13 | `vi.mock` appears in 7 files — present, not dominant. | search |
| F14 | **T2 reference implementation exists:** `finance/insights-api.test.ts` — 281 lines, imports `@/app/api/finance/insights/route` directly, 2 `vi.mock`, asserts: 401 anonymous, 400 invalid input, 400 unknown agent id, 500 with correlation id, insight scoped to session user, and *graceful degradation when the migration is not applied*. | direct read |
| F15 | `package.json`: vitest `^4.1.11`, `@playwright/test` `^1.62.1`; **no `@vitest/coverage-v8`, no `ts-morph`, no Stryker.** Scripts: `test` = `vitest run`, `test:acceptance` = separate config, `test:e2e` = `playwright test`. | direct read |

### The thesis

The suite's default posture is node-environment static analysis of source text — and that
is a *rational adaptation to F1*, not laziness. With no DOM by default, grepping the
stylesheet is the cheapest way to assert a motion rule exists. F5–F9 are downstream of
F1–F3. **A rebuild that only rewrites test files will therefore fail** — you'd produce
better-looking greps. Topology first.

### The counter-thesis, equally important

F12 and F14 prove **the suite is bimodal, not uniformly bad**. This team has already
independently invented the correct pattern at two different tiers: pure-module contract
testing (`fold-truth`) and direct route-handler boundary testing (`insights-api`). The
rebuild is not a correction imposed from outside — it is generalizing patterns this
codebase already contains to the files that don't yet follow them. Expect a meaningful
`KEEP` count in the ledger. An agent that rewrites all 76 files has misread the repo.

---

## 2. THE STANDARD — "ultra premium," defined so it can be checked

Four properties, priority-ordered:

1. **Sensitivity** — fails when the product breaks.
2. **Specificity** — does not fail when the product is merely refactored.
3. **Diagnosticity** — the failure message names the user-visible thing that broke.
4. **Economics** — fast enough that nobody is tempted to skip it.

`expect(read("app/globals.css")).toContain("prefers-reduced-motion")` scores 0/4: passes
when the media query targets the wrong selector; breaks when the rule moves to a Tailwind
layer; fails by reporting a missing string, not broken behavior; and reads the file on
every run for the privilege.

### Merge rubric — every rebuilt file must score 5/5

1. Docblock names the user-visible behavior or invariant the file protects, in one sentence.
2. A sensitivity proof is recorded in the ledger (§6, Phase 2 step 3).
3. Zero banned patterns (§5).
4. Runtime: <2s for T0/T3 files, <5s for T1/T2 files, measured in the batch report.
5. Running one deliberately broken variant produces a failure message that names the
   behavior, not the mechanism ("hard stop no longer forces NOT_YET" beats "expected null").

---

## 3. THE FIVE-TIER ARCHITECTURE

| Tier | Name | Env | Answers | Asserts on | Never |
|---|---|---|---|---|---|
| T0 | Contract | node | Does the decision logic produce the right answer? | Return values, errors, invariants, boundaries | render, read files, mock internals |
| T1 | Behavior | jsdom | Does the user see and get the right thing? | Roles, accessible names, visible text, state after interaction | source reads, class names, CSS text, markup snapshots |
| T2 | Boundary | node | Does the route/action handle real input? | Status, body, headers, redirect target, calls to the *external* boundary | mocking owned modules, internal call order |
| T3 | Policy | node | Does the codebase obey its own laws? | **AST facts** — imports, exports, JSX, tokens | regex over raw text |
| T4 | Journey | Playwright | Does the real thing work in a real browser? | Rendered page, navigation, computed style, emulated media | stubbing the app's own code |

**T3 is the load-bearing reframe.** The source-grep files are not all wrong — "naming law,"
"nav catalog parity," "no scoring import outside lib/scoring" are real static invariants,
*misfiled, not misconceived*. Promote them to a policy tier backed by `ts-morph`, demote
regex to zero. Deduplicate F11 into exactly one rule.

### Per-tier rules

**T0** — one module per file; zero `vi.mock` (a mock needed for "pure" logic means the
logic isn't pure — extract it). Cover happy path, every boundary with exact-boundary pairs,
empty/null/malformed, and documented overrides. HōMI-specific: verdict thresholds are
boundary-inclusive on the higher tier (≥80 READY, 65–79 ALMOST THERE, 50–64 BUILD FIRST,
<50 NOT YET) — test 79/80, 64/65, 49/50 exactly. The four hard stops (DTI > 50%,
housing > 45% of gross, runway < 1 month, credit < 620) force NOT_YET **while the numeric
score stays displayed, never zeroed** — test both halves, each stop alone, and one
combination. Where README and `lib/scoring/engine.ts` disagree on an inequality, the code
is the canon and the disagreement is a finding.

**T1** — `// @vitest-environment jsdom`, `cleanup` in `afterEach` (F4 is the house style —
keep it). Query by role and accessible name; `getByTestId` only when no accessible handle
exists, and reaching for it is itself an a11y finding to file, not a workaround. **Every
interactive element gets a `userEvent` test** — the dependency is installed (F7); current
usage is zero; this is the single largest gap in the suite. Never assert a class name;
assert the consequence jsdom can see, or push to T4.

**T2** — invoke handlers directly with real `Request`/`FormData`; no server. Fake only the
true external boundary (Supabase, Stripe, Plaid, Resend, Anthropic) via typed doubles in
`__tests__/support/`; `vi.mock` of an owned module couples the test to the import graph.
Every protected handler gets the authorization triple: anonymous → 401/redirect,
wrong role → 403, correct role → 200. Follow F14's degradation pattern: what happens when
the table/migration is absent is part of the contract. Client-side gating is not a
control — if hiding a nav link is the only barrier, that is a P0 product defect.

**T3** — one `__tests__/policy/` directory; every invariant is a named rule whose failure
message names the rule and the offending file:line. Initial rule set, derived from what the
grep tests already reach for: `no-scoring-logic-outside-lib-scoring`, `no-weights-reexport`
(`lib/scoring/weights.ts` is a C2 trade-secret boundary — nothing may re-export it),
`naming-law`, `macron-integrity` (HōMI uses U+014D — never plain `o`, never a combining
mark), `nav-catalog-parity`, `locked-palette` (no color literal outside the token file),
`protected-copy` (four verbatim phrases byte-identical), `route-state-coverage` (every
fetching `page.tsx` has sibling `loading.tsx` + `error.tsx`), `no-fixture-outside-demo`
(`app/(product)/demo` is the one sanctioned fixture surface).

**T4** — reserve for: assessment→verdict, auth redirects, reduced motion via
`page.emulateMedia`, responsive layout, anything requiring paint. Deterministic: seeded DB,
frozen clock, no `waitForTimeout`. Fold into the existing CORE/FULL Playwright split — CORE
must run without secrets.

### Worked exemplars — the shape of the standard

These are **shape, not verbatim code**. Component APIs, prop names, and factory fields
below are illustrative; read the real modules before writing a line, and adapt. Pasting
these without reading the code is a defect.

**A. Reduced motion: grep → behavior (T1) + computed style (T4)**

Current (0/4 on the rubric):
```ts
const css = read("app/globals.css");
expect(css).toContain("@media (prefers-reduced-motion: reduce)");
```

T1 replacement — only valid if the component actually branches on the media query in JS:
```tsx
// @vitest-environment jsdom
stubMatchMedia({ reducedMotion: true });           // __tests__/support/match-media.ts
const user = userEvent.setup();
render(<CompanionWidget />);
await user.click(screen.getByRole("button", { name: /companion/i }));
const sheet = await screen.findByRole("dialog");
expect(sheet).toBeVisible();                        // present immediately — no entrance gate
```

If the reduced-motion behavior lives purely in CSS, jsdom cannot observe it and **no T1
test is possible — do not modify the component to make one possible.** The assertion
belongs in T4:
```ts
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("/dashboard");
await page.getByRole("button", { name: /companion/i }).click();
const transform = await page.getByRole("dialog")
  .evaluate((el) => getComputedStyle(el).transform);
expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
```

**B. Naming law: grep → AST rule (T3)**
```ts
// __tests__/policy/rules/naming-law.test.ts
const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const BANNED = /H[ōo]MI[-\s]?Score/;
const offenders: string[] = [];
for (const sf of project.getSourceFiles(["app/**/*.tsx", "components/**/*.tsx"])) {
  for (const kind of [SyntaxKind.StringLiteral, SyntaxKind.JsxText,
                      SyntaxKind.NoSubstitutionTemplateLiteral, SyntaxKind.TemplateHead]) {
    for (const node of sf.getDescendantsOfKind(kind)) {
      if (BANNED.test(node.getText()))
        offenders.push(`${sf.getFilePath()}:${node.getStartLineNumber()}`);
    }
  }
}
expect(offenders, `naming-law: surfaces must say "Decision Readiness Score"\n${offenders.join("\n")}`).toEqual([]);
```
Why this beats the grep it replaces: a comment or dead branch containing the banned name no
longer trips it; a line-wrap no longer defeats it; the failure lists file:line.

**C. Hard stop: exact boundary + preserved score (T0)**
```ts
const clean   = score(applicant({ dti: 0.50 }));    // boundary: not tripped (README says "> 50%")
const tripped = score(applicant({ dti: 0.501 }));
expect(clean.hardStops).toEqual([]);
expect(tripped.verdict).toBe("NOT_YET");
expect(tripped.score).toBe(clean.score);            // the score is computed, never zeroed
expect(tripped.hardStops).toEqual([expect.objectContaining({ kind: "DTI" })]);
```

---

## 4. NAMED ANTI-PATTERNS — cite these codes in reports and reviews

- **AP1 Assertion softening** — a rebuilt test fails, and the assertion is loosened until it
  passes. The likeliest failure mode of this entire mission. A failing rebuilt test is a
  product-defect report, never a prompt to weaken the test.
- **AP2 Tautology** — computing the expected value by calling the code under test (or a
  copy of its logic). The test can then never fail. Expected values are literals or come
  from the spec.
- **AP3 Over-mocking** — `vi.mock` of a module the codebase owns. Mock only the external
  boundary.
- **AP4 Translation without improvement** — replacing `readFileSync(...).toContain(x)` with
  `render(...)` then `container.innerHTML.toContain(x)`. Same grep, new costume. The rubric
  scores it identically: 0/4.
- **AP5 Fixture drift** — inline object literals repeated across files, silently diverging
  from the real schema. All fixtures go through typed builders in
  `__tests__/support/factories/`.
- **AP6 Implementation coupling** — class names, internal call order, private state, markup
  snapshots. These fail on refactor, not on breakage: specificity 0.
- **AP7 Vanity tests** — tests that exist to raise a count and assert nothing a user could
  observe. Delete, with a ledger justification.
- **AP8 Conditional assertion** — `if`/`try` around an `expect` with no else-fail. The
  untaken branch asserts nothing. One behavior per `it`, unconditional.

Also banned outright: `.skip` / `.only` / `.todo` in committed code; markup snapshots;
`readFileSync` anywhere except inside the T3 AST helper.

---

## 5. TOPOLOGY & DEPENDENCY PLAN (Phase 0 content)

1. **Dependency preflight** (verified against `package.json` on `main`): vitest `^4.1.11`
   → the `projects` field in `vitest.config.ts` is the supported mechanism (do not create a
   deprecated `vitest.workspace.ts`). Add: `@vitest/coverage-v8` pinned to the same major as
   vitest, `ts-morph` (pinned exact). Already present, do not re-add: RTL 16, `user-event`
   14.6.5, `jest-dom` ^7, `jsdom` ^30, `@playwright/test` ^1.62. Stryker only if the §7
   mutation option is approved.
2. **Projects:** `contract` (node), `behavior` (jsdom + shared setup registering `jest-dom`
   and the `matchMedia` stub), `boundary` (node), `policy` (node), `legacy` (node — the
   untouched old files, see §6 migration), plus the existing `acceptance` config untouched.
3. **Coverage:** v8 provider, per-project thresholds **set at the measured baseline, not an
   aspiration** — a threshold you fail on day one is deleted on day two. Ratchet upward
   per batch. lcov reporter. Coverage must run without secrets (CI constraint).
4. **`__tests__/support/`:** typed factories, the Supabase double, `match-media.ts`, a
   frozen-clock helper, and `policy/project.ts` wrapping ts-morph (one shared `Project`
   instance per run — constructing it per-rule will blow the runtime budget).
5. **Inertness proof:** the full existing suite passes unchanged on the new topology before
   any test body is touched. A behavior change in Phase 0 is a Phase 0 bug.

---

## 6. EXECUTION PLAN

### Phase −1 — Verify the premise (no changes)
Re-derive F1–F15; report confirmed/changed/not-found per finding. Then capture the
baseline:
```bash
cat vitest.config.ts vitest.acceptance.config.ts
node -e "const p=require('./package.json');console.log(p.devDependencies)"
rg -c "readFileSync" __tests__ | sort -t: -k2 -rn
rg -l "userEvent|fireEvent" __tests__
rg -l "@testing-library/react" __tests__
rg -c "toContain" __tests__ | sort -t: -k2 -rn | head -30
rg -l "@vitest-environment" __tests__
rg -l "vi\.mock" __tests__
rg -n "\.(skip|only|todo)\(" __tests__
npx vitest run --reporter=json > /tmp/baseline.json
```
Record: green/red status of every file, total runtime, 10 slowest files. **No Phase 0
until a green baseline exists** — you cannot prove preservation of behavior you never
measured. If baseline has failing tests, report them as pre-existing and exclude from your
preservation obligation, explicitly, by name.

### Phase 0 — Topology (§5). Prove inert. Stop for approval of the config diff.

### Phase 1 — Classify all 76 files (no rewrites)
Produce `docs/ops/test-rebuild-ledger.md`, one row per file:
`file | current tier(s) | target tier(s) | assertion style | fs? | render? | userEvent? | duplicate-of | disposition | risk`
Disposition ∈ `KEEP` (meets the standard now — F12/F14 are references; expect several) ·
`PROMOTE` (grep → T3 rule) · `REWRITE` (→ T0/T1/T2) · `SPLIT` (mixed concerns → several
files, e.g. F10 splits four ways) · `MERGE` (F11) · `DELETE` (AP7, with justification).
Commit the ledger. It is the persistent state of this mission.

### Phase 2 — Rebuild, one directory per batch, sequential
Order: `observe (2) → layout (5) → marketing (12) → finance (18) → planner (19) →
dashboard (20)`. Rationale (challenge it in writing before starting if you disagree):
`observe` proves the harness at minimal blast radius; `layout` contains
`nav-catalog-parity`, the archetypal T3 promotion, which establishes the AST pattern for
everything after; `dashboard` is last — largest, and holds the T0 reference you must not
regress.

Per file:
1. Read the test **and the code it tests**. Write down the user-visible behavior it
   protects. Can't name one → that is the finding; record it, then decide disposition.
2. Write the replacement at the target tier. **Watch it fail for the right reason before
   making it pass** — break the code, see the failure, restore. A test that has never
   failed has never been tested.
3. **Sensitivity proof:** for each replaced assertion, break production in the specific way
   the test claims to catch; record `change → old test: pass|fail → new test: fail`. This
   is the only evidence the rebuild improved anything; a prettier test with no new
   sensitivity is a regression in disguise.
4. Old file is deleted only after (3), in a separate commit from the one adding the
   replacement, same PR — reviewers must be able to diff protection, not just code.
5. Update the ledger row.

**Migration safety:** all work on `test-rebuild/<dir>` branches. Old files stay in the
`legacy` project and keep running in CI until their replacements land; `main` never has
less protection than baseline. Suite runtime temporarily grows during dual-run — budgeted,
report it, and it ends at cutover.

### Phase 3 — Close the loop
Coverage ratchet in CI (thresholds only rise). Wire `policy` into the existing `verify`
job alongside `brand-check`. Write `__tests__/README.md`: the tier table, where a new test
goes, the AP codes. Optional ceiling, decide explicitly with the human: Stryker mutation
testing scoped to `lib/scoring/` and `lib/dashboard/` only — coverage says a line ran,
mutation says a bug would have been caught; affordable at that scope, not repo-wide.
Report a mutation score for those two modules and stop.

---

## 7. GATES — every batch, before it may be reported complete
```bash
npm run brand-check && npm run architecture:check && npm run typecheck && npm test && npm run build
```
Plus: legacy project still green; coverage thresholds not lowered; runtime within 20% of
baseline (report the slowest files if not); zero `.skip`/`.only`/`.todo`; zero
`readFileSync` outside the T3 helper; every rebuilt file scores 5/5 on the §2 rubric.

---

## 8. ORCHESTRATION — how to use your agents and your knowledge store

**Roles.** Run four:
- **Orchestrator** (you) — owns the ledger, sequences batches, enforces gates. Never edits
  test code; an orchestrator that starts editing loses the global view and the mission.
- **Verifier** — adversarial. Runs Phase −1, re-runs every sensitivity proof independently,
  and reviews each batch against the AP codes before the orchestrator accepts it. The
  verifier's incentive is to reject; a batch the verifier waves through unexamined is a
  verifier failure.
- **Builders** — one per batch. Within a batch you may fan out one agent per file, with two
  constraints: `__tests__/support/` is **read-only** during fan-out (harness changes are a
  batch-boundary, single-writer operation), and results merge through the orchestrator.
  Never fan out across directories — parallel agents on a shared harness collide and blow
  context.
- **Policy engineer** — sole owner of `__tests__/policy/` and the ts-morph helper, for the
  life of the mission.

**Knowledge store.** Persist, and reload at the start of every session:
`findings-verification` (F1–F15 with confirmed/changed status), `ledger` (the Phase 1
table — this is the mission's state; the code on disk is not), `tier-rules` (§3, verbatim),
`support-api` (signatures of factories/doubles/helpers, so builders never re-read the
harness source), `decisions-log` (every OPEN DECISION and its human answer),
`product-defects` (mirror of the defects doc). Do not persist test file contents — they go
stale within hours in this repo; re-read from disk.

**Context budget.** Never hold more than one directory of tests in context. Read the code
under test before the test that covers it. Summarize into the ledger, not into
conversation memory. When a builder's context fills mid-batch, it hands the orchestrator
its ledger-row updates and stops — a fresh builder resumes from the ledger, which is why
the ledger, not the transcript, is the source of truth.

---

## 9. HARD RULES
- Verify F1–F15 before relying on them; the repo commits hourly.
- **AP1 is the cardinal sin.** A rebuilt test that fails has found a product bug — report
  it in `docs/ops/product-defects.md`; never soften the assertion.
- Never delete a test without a named replacement or a written ledger justification.
- **No net loss of protected behavior:** every invariant the old 76 files assert must be
  asserted somewhere in the new suite, or explicitly retired with a reason in the ledger.
- Do not invent module paths, table names, component props, or APIs. Read the code. The
  §3 exemplars are shape, not source.
- `lib/scoring/weights.ts` is a C2 trade-secret boundary: read, never relocate, re-export,
  or copy its contents into a fixture.
- `app/(product)/demo` is the one sanctioned fixture surface; fixtures anywhere else in
  production code are defects to report, not to test around.
- No silent scope narrowing: fewer files completed than assigned goes in the first line of
  the report, with the reason.
- Batches are sequential; fan-out is within-batch only (§8).

---

## 10. REPORT FORMAT (per batch)
```
BATCH <n> — __tests__/<dir>  (<completed>/<total> files)
Premise check: <F# confirmed | F# changed: …>
Per file: <name> | <disposition> | old assertions <n> → new <n> | tier(s) | rubric <n>/5
Sensitivity proofs: <production change> → old: <pass|fail> → new: fail   (one line each)
Product defects filed: <file:line — what is broken> → docs/ops/product-defects.md
Testability extractions: <none | list, each with inertness evidence>
Coverage: <before → after, per project>   Runtime: <before → after>
Legacy project: green|red
BLOCKED: <file — exact missing dependency>
OPEN DECISIONS: <question needing a human>
```

---

## 11. START
Run Phase −1. Report the premise-check table, the green baseline, and the proposed Phase 0
config diff (do not apply it). Then stop and wait for approval before touching any file.
