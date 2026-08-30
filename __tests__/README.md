# HōMI test architecture

Five tiers. Put a new test in the first tier that can see the failure.

| Tier | Project | Env | Asserts on | Never |
| --- | --- | --- | --- | --- |
| T0 Contract | `unit` (in-place) or `__tests__/contract/` | node | Return values, errors, boundaries | render, `readFileSync`, owned-module mocks |
| T1 Behavior | `unit` (jsdom docblock) or `__tests__/behavior/` | jsdom | Roles, accessible names, `userEvent` | source reads, class names, CSS text |
| T2 Boundary | `unit` or `__tests__/boundary/` | node | Status, body, headers, external doubles | mocking owned modules |
| T3 Policy | `__tests__/policy/` | node | AST facts via ts-morph | regex over raw file text |
| T4 Journey | Playwright (`e2e/`) | browser | Rendered page, computed style | stubbing the app |

`vitest.acceptance.config.ts` is unchanged. Root-level guards
(`money-reality-hero.test.ts`, `outcomes-ping-v0.test.ts`,
`measure-act-wave1-locks.test.ts`, `brand-colors.test.ts`,
`scoring-server-only.test.ts`) stay in `unit` until they migrate onto T3.

Banned patterns: `.skip` / `.only` / `.todo`; markup snapshots;
`readFileSync` outside `__tests__/support/policy/`; `fireEvent` when
`userEvent` can drive the control; `vi.mock` of an owned module.

See `docs/ops/test-rebuild-ledger.md` for the six-dir rebuild state.
