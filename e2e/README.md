# HōMI E2E suite (Playwright)

PR15 KEEP/KILL is the live surface. **CORE is not a six-spec anonymous
assessment→verdict walk** and not the old five-path product story.

`scripts/ci-coverage-report.mjs` prints `TEST_COVERAGE_MODE=CORE|FULL`. Green
`e2e` with skipped live specs is **CORE**, not FULL. Do not describe DARK
full-product walks as CORE.

Executable allow-list: `lib/auth/keep-routes.ts`. KEEP pages: `/`, `/waitlist`,
`/auth/*`, `/legal/privacy|terms|cookies`, `/marketing/*`. KEEP APIs:
`/api/waitlist`, `/api/healthcheck`, `/api/csp-report`. Everything else is DARK
(document → `/`, APIs JSON 404) unless CCP V4 activates it (out of this suite).

## Specs and skip matrix

| Spec | CORE without secrets | Gated / skip |
| --- | --- | --- |
| `public-funnel.e2e.ts` | KEEP landing, waitlist, legal; KILL product URLs → `/` | — |
| `alignment-pin.e2e.ts` | pin-scene absent on `/` | — |
| `path-smoke.e2e.ts` | `/status`, `/path`, `/tools/preflight` → `/` | — |
| `assessment-verdict.e2e.ts` | `/assessment` and `/results` → `/` (no verdict paint) | signed-in KILL if `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` |
| `checkout.e2e.ts` | `/pricing` → `/` | `/api/checkout` JSON 404 if live Stripe TEST + Supabase |
| `share.e2e.ts` | unknown `/share/*` → `/` | `/api/shares` JSON 404 if live Supabase |
| `auth-signup.e2e.ts` | sign-up form render (KEEP) | live signup → `/` if live Supabase |
| `password-reset.e2e.ts` | expired-link + forgot-password UI (hermetic recover intercept) | live recovery if live Supabase |
| `shell-nav.e2e.ts` | anonymous product URLs → `/` (not sign-in) | signed-in shell skip without live Supabase |
| `decision-lab.e2e.ts` | `/tools`, `/scenarios` → `/` | — |
| `money-reality.e2e.ts` | tools / finance / money → `/` | — |
| `path-to-ready.e2e.ts` | `/path` → `/` | signed-in KILL if `E2E_TEST_*` |
| `impact-bus.e2e.ts` | `/path` `/dashboard` KILL; `@flag-off` tag kept for CI | CI also runs this file once with `NEXT_PUBLIC_FF_IMPACT_BUS=false` (do not collapse here) |
| `auth-journey.e2e.ts` | — | entire file skip without `E2E_TEST_*` |
| `auth-smoke.e2e.ts` | — | `SMOKE_*` / `E2E_TEST_*` via `npm run smoke:auth` |

**Design rule:** specs that need a live Supabase project or Stripe test keys
_skip themselves with a clear message_ when their env is absent. CI never goes
red on forks or missing secrets; a fully-configured environment runs gated tests.
Gated checkout/share paths assert KILL 404s, not a hosted-card or share-revoke
product walk.

## Quick start

```bash
npm install                 # once — adds @playwright/test (devDependency)
npx playwright install chromium   # once — browser binaries (~170MB)

npx playwright test               # whole suite (boots the dev server itself)
npx playwright test e2e/public-funnel.e2e.ts   # KEEP/KILL public
npx playwright test --ui          # interactive runner
npx playwright show-report        # open the last HTML report
```

`playwright.config.ts` boots `npm run dev` on `http://localhost:3000`
(`webServer`), pins `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for the
server it spawns, and **reuses an already-running dev server** locally. Env is
read from your shell plus `.env.local` (via Node's built-in
`process.loadEnvFile`, no dotenv dependency).

## Environment map

Specs read `E2E_*` vars; the **dev server under test** reads the app's normal
unprefixed vars (it inherits the shell env Playwright runs in, plus
`.env.local`). In GitHub Actions the workflow maps the same secrets to both
names.

| Variable                                            | Needed for                                                    | Who reads it         |
| --------------------------------------------------- | ------------------------------------------------------------- | -------------------- |
| `E2E_BASE_URL`                                      | optional override (default `http://localhost:3000`)           | Playwright           |
| `E2E_SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)  | all live specs                                                | specs (admin client) |
| `E2E_SUPABASE_SERVICE_ROLE_KEY`                     | all live specs (user factory, cleanup)                         | specs                |
| `SUPABASE_SERVICE_ROLE_KEY`                         | live specs that hit the app with service-role                 | dev server           |
| `E2E_STRIPE_SECRET_KEY` (**must be `sk_test_*`**)   | gated checkout KILL assertion                                 | specs                |
| `E2E_STRIPE_WEBHOOK_SECRET` (**must be `whsec_*`**) | gated checkout KILL assertion                                 | specs                |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`             | optional signed-in KILL (`auth-journey`, `auth-smoke`, …)    | specs                |

The suite **refuses live Stripe keys on purpose** (`sk_live_*` → skip).

## Seeding a test user — you don't have to

Live specs that opt in create a **unique user** through the Supabase admin API
(`auth.admin.createUser`, `email_confirm: true`), use it, and delete it in a
`finally`. No shared fixtures. Do **not** point this at production.

"Opening the email" is done without an inbox:
`auth.admin.generateLink({ type: "signup" | "recovery" })` mints the link
Supabase would email, and the spec navigates to it.

Prerequisites on the Supabase side (FULL only; deferred while #241 is open):

1. A **dedicated test project** (never production).
2. Site URL / redirect allowlist must include `http://localhost:3000/**`.
3. Service-role key in `E2E_SUPABASE_SERVICE_ROLE_KEY` (specs) and
   `SUPABASE_SERVICE_ROLE_KEY` (dev server when needed).
4. If email confirmation is disabled, the signup spec falls back to proving
   sign-in works — noted in the test output.

## CI behavior (`.github/workflows/e2e.yml`)

- Runs on every PR to `main` (+ `workflow_dispatch`), separate check from
  `ci.yml` and `lighthouse.yml`.
- Repo PRs **with** the secrets above run gated live tests. **#241:** those
  secrets are expected empty; CORE is enough.
- Fork PRs / missing secrets: live specs print their skip reason; KEEP/KILL
  always-on tests still gate the PR.
- Coverage truth step: `node scripts/ci-coverage-report.mjs --playwright playwright-results.json`.
- On failure, the HTML report + traces upload as `playwright-report` (7 days).

## Conventions

- **`*.e2e.ts` suffix, not `*.spec.ts`.** Vitest's default include glob is
  `**/*.{test,spec}.*`; `*.e2e.ts` doesn't match it, so the unit gate never
  picks these up and `playwright.config.ts` pins `testMatch: "**/*.e2e.ts"`.
- **No `stripe` SDK import in `e2e/`.** Main's `package.json` doesn't carry it.
- `@supabase/supabase-js` **is** used — it's already an app dependency.
- Selectors prefer roles/labels (`getByRole`) over CSS; the few CSS hooks
  (`#email`, `#password`) match the app's stable form markup.
- `test-results/` and `playwright-report/` are gitignored local artifacts.

## Troubleshooting

- **"Needs a live Supabase test project — unset: …"** — expected skip when
  secrets aren't configured; set the vars from the table above to opt in.
- **Signup/recovery link loops back to sign-in** — the test project's redirect
  allowlist is missing `http://localhost:3000/**`.
- **First local run is slow** — `next dev` compiles each route on first hit;
  retries and timeouts in `playwright.config.ts` already budget for it.
- **404s show status 200 locally** — under `next dev`, streaming has already
  sent headers when `notFound()` fires, so the not-found page arrives with a
  200 (a production build serves a true 404). KEEP/KILL specs assert pathname
  `/` or JSON `not_found`, which is stable across both.
