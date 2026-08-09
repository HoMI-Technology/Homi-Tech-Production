# HōMI E2E smoke suite (Playwright)

AUDIT T3.5 — the test pyramid's top floor. Five critical paths, driven against
a real dev server:

| #   | Path                                | Spec                        | Runs without secrets?                         |
| --- | ----------------------------------- | --------------------------- | --------------------------------------------- |
| 1   | signup → email-confirm              | `auth-signup.e2e.ts`        | render smoke only — live round trip is gated  |
| 2   | assessment → verdict                | `assessment-verdict.e2e.ts` | **yes, fully** (public anonymous flow)        |
| 3   | checkout (test mode) → tier granted | `checkout.e2e.ts`           | pricing render only — purchase is gated       |
| 4   | share create → open → revoke        | `share.e2e.ts`              | 404 smoke only — round trip is gated          |
| 5   | password reset                      | `password-reset.e2e.ts`     | UI-state tests yes — live round trip is gated |

**Design rule:** specs that need a live Supabase project or Stripe test keys
_skip themselves with a clear message_ when their env is absent. CI never goes
red on forks or missing secrets; a fully-configured environment runs
everything.

## Quick start

```bash
npm install                 # once — adds @playwright/test (devDependency)
npx playwright install chromium   # once — browser binaries (~170MB)

npx playwright test               # whole suite (boots the dev server itself)
npx playwright test e2e/assessment-verdict.e2e.ts   # one spec
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
| `E2E_SUPABASE_SERVICE_ROLE_KEY`                     | all live specs (user factory, cleanup, tier/share assertions) | specs                |
| `SUPABASE_SERVICE_ROLE_KEY`                         | live checkout (webhook → profile update)                      | dev server           |
| `E2E_STRIPE_SECRET_KEY` (**must be `sk_test_*`**)   | live checkout                                                 | specs                |
| `E2E_STRIPE_WEBHOOK_SECRET` (**must be `whsec_*`**) | live checkout (synthetic webhook signature)                   | specs                |
| `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PLUS`           | live checkout (real session creation)                         | dev server           |
| `STRIPE_WEBHOOK_SECRET`                             | live checkout (webhook verification)                          | dev server           |

The suite **refuses live Stripe keys on purpose** (`sk_live_*` → skip). This
is a test-mode-only path.

## Seeding a test user — you don't have to

Every live spec creates its **own unique user** through the Supabase admin API
(`auth.admin.createUser`, `email_confirm: true`), uses it, and deletes it in a
`finally` (`auth.admin.deleteUser`, after removing its `score_shares` /
`assessments` rows). No shared fixtures, no seed script, parallel-safe.

"Opening the email" is also done without an inbox:
`auth.admin.generateLink({ type: "signup" | "recovery" })` mints the exact
link Supabase would email, and the spec navigates to it.

Prerequisites on the Supabase side:

1. A **dedicated test project** (never run this against production — the suite
   creates and deletes real auth users).
2. Its **Site URL / redirect allowlist** must include
   `http://localhost:3000/**` (Auth → URL Configuration), or the generated
   action links won't redirect back to the dev server.
3. The service-role key goes in `E2E_SUPABASE_SERVICE_ROLE_KEY` (specs) and
   `SUPABASE_SERVICE_ROLE_KEY` (dev server, for the Stripe webhook path).
4. If the project has **email confirmation disabled**, the signup spec detects
   it (`generateLink` errors) and falls back to proving the account can sign
   in directly — noted in the test output.

## Stripe test-mode setup (live checkout spec)

1. Test-mode API key → `E2E_STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY`.
2. A test **price for the Plus tier with `lookup_key = homi_plus_monthly`**
   (the webhook resolves tiers from lookup keys only — no lookup key, no tier,
   and the spec correctly fails). Put its price id in `STRIPE_PRICE_PLUS`.
3. A webhook signing secret → `E2E_STRIPE_WEBHOOK_SECRET` /
   `STRIPE_WEBHOOK_SECRET`. Either create a test-mode webhook endpoint in the
   dashboard (any URL; only the secret matters) or use `stripe listen`'s
   printed `whsec_...`.
4. The spec drives the real hosted checkout with the `4242 4242 4242 4242`
   test card, lands back on `/dashboard?upgraded=1`, then POSTs a faithfully
   signed `checkout.session.completed` (built from the **real** session id) to
   `/api/webhooks/stripe` — standing in for Stripe's delivery, which can't
   reach localhost/CI — and finally polls `profiles.subscription_tier` until
   it reads `plus`.

Note: Stripe owns the hosted-checkout markup (`#cardNumber`, `#cardExpiry`,
…). If Stripe redesigns that page, this gated spec is exactly what should
report the drift.

## CI behavior (`.github/workflows/e2e.yml`)

- Runs on every PR to `main` (+ `workflow_dispatch`), separate check from
  `ci.yml` and `lighthouse.yml` — it neither edits nor depends on them.
- Repo PRs **with** the secrets above run the full suite.
- Fork PRs / missing secrets: live specs print their skip reason and the
  always-on specs (assessment→verdict, pricing render, sign-up render, share
  404, password-reset UI states) still gate the PR.
- On failure, the HTML report + traces upload as the `playwright-report`
  artifact (7 days).

## Conventions

- **`*.e2e.ts` suffix, not `*.spec.ts`.** Vitest's default include glob is
  `**/*.{test,spec}.*`; `*.e2e.ts` doesn't match it, so the unit gate never
  picks these up and `playwright.config.ts` pins `testMatch: "**/*.e2e.ts"`.
- **No `stripe` SDK import in `e2e/`.** Main's `package.json` doesn't carry it;
  webhook signing is 10 lines of `node:crypto` HMAC matching
  `app/api/webhooks/stripe/route.ts`, and Stripe API reads use plain `fetch`
  (same pattern as `app/api/checkout/route.ts`).
- `@supabase/supabase-js` **is** used — it's already an app dependency.
- Selectors prefer roles/labels (`getByRole`) over CSS; the few CSS hooks
  (`#email`, `#password`, `input[type=range]`) match the app's stable form
  markup.
- `test-results/` and `playwright-report/` are gitignored local artifacts.

## Troubleshooting

- **"Needs a live Supabase test project — unset: …"** — expected skip when
  secrets aren't configured; set the vars from the table above to opt in.
- **Checkout spec errors with "configured:false"** — the dev server (not the
  spec) is missing `STRIPE_SECRET_KEY` / `STRIPE_PRICE_PLUS`; restart it with
  them set.
- **Signup/recovery link loops back to sign-in** — the test project's redirect
  allowlist is missing `http://localhost:3000/**`.
- **First local run is slow** — `next dev` compiles each route on first hit;
  retries and timeouts in `playwright.config.ts` already budget for it.
- **404s show status 200 locally** — under `next dev`, streaming has already
  sent headers when `notFound()` fires, so the not-found page arrives with a
  200 (a production build serves a true 404). The specs assert the not-found
  page content, which is stable across both.
