# HōMI Operator’s Manual

**Audience:** You (founder / operator) and any AI agent working on your machine.  
**Product SSOT:** [HoMI-Technology/Homi-Tech-Production](https://github.com/HoMI-Technology/Homi-Tech-Production)  
**Local SSOT path (founder):** `C:\dev\apps\homi-production` (`HOMI_SSOT`)  
**Last updated:** 2026-09-11 (nightly audit area U — KEEP CORE / #241 honesty)

## Spend hold (founder 2026-08-16)

**[#241](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/241) is open.** Do not spend on GitHub Pro, Vercel Pro, or a second Supabase project, and do not nag the founder to, until that issue is **closed by the founder**.

- Protection/secrets playbooks below (§A.2–A.7) are **for go-live**, not for this week.
- Empty Actions secrets and CORE E2E (skipped live specs) are **expected**.
- Children: [#243](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/243) protection, [#242](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/242) DEV secrets, [#191](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/191) Vercel/checkout.

## KEEP CORE (accepted while #241 is open)

Live public surface is **KEEP only** — `/`, `/waitlist`, `/auth/*`, `/legal/privacy|terms|cookies`, `/marketing/*`, `/api/waitlist`, `/api/healthcheck`, `/api/csp-report`. See `docs/CHANGE_CONTROL_V1.md` and `lib/auth/keep-routes.ts`. Everything else is DARK (pages → `/`, APIs → JSON `404`). Do **not** resurrect DARK chrome.

**CORE** E2E (empty Actions secrets; live specs skip) is enough. A green `verify` is not a release. Missing secrets are **not** a defect. Do not wire DEV Supabase, Stripe TEST, or LHCI dashboard secrets to “complete” the matrix. Authenticated-dashboard Lighthouse is not CORE (signed-in product is DARK / V4_PENDING).

This manual covers three operator systems that keep the product shippable:

| System                               | What it is                                                                     | How you run it                               |
| ------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------- |
| **A. CI secrets (E2E + Lighthouse)** | GitHub Actions secrets so live tests and authenticated Lighthouse actually run | Dashboard or `gh secret set` + `homi doctor` |
| **B. SSOT + Doctor**                 | Windows tools that keep GitHub in sync and verify your machine                 | `homi ssot …` · `homi doctor`                |
| **C. Branch hygiene**                | Written policy + inventory for open PRs / stale branches                       | `homi hygiene` + policy below                |

**Daily shortcut:** open the repo tools with:

```powershell
homi doctor      # full machine + CI readiness
homi             # command menu
```

Local vs live and `homi start`: this manual + `AGENTS.md` (no separate PDF).

---

# 0. Mental model (read once)

```text
Your laptop  ──git push──►  GitHub (SSOT)
                              │
                              ├─ Actions: CI verify / E2E / Lighthouse
                              └─ Vercel Git integration ──► Production

Secrets live in THREE places (do not mix them up):

  1. .env.local          → local Next.js + local Playwright
  2. Vercel env          → Preview + Production deployments
  3. GitHub Actions      → CI/E2E/LHCI only (never put service role in client)
```

**Rules that prevent most disasters**

1. Only **one writable clone**: this repo path (or the same remote on another machine via Git—not Desktop zips).
2. **Pull before work; push before walk-away.**
3. Local app currently uses **production Supabase** unless you deliberately point `.env.local` elsewhere—treat data as live ammo. **Do not** run destructive Playwright live specs (they create/delete auth users) against production.
4. **Never** `supabase db push` the full history against production. Apply one file via `docs/ops/MIGRATIONS-SSOT.md`. There is **no dedicated DEV/E2E Supabase project** until the owner creates one (free-plan, no production clone of PII).
5. **Never** put `sk_live_*` in E2E secrets; suite refuses live Stripe keys.
6. **GitHub branch protection is OFF** (private repo; GitHub Pro required). That is **accepted under #241**. Do not upgrade until go-live. When the hold lifts, exact clicks are §A.7.

---

# A. Wire E2E + Lighthouse secrets correctly

> **Hold:** Do not create a DEV project or set Actions secrets while [#241](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/241) is open. Section A is the go-live runbook, not a current sprint.

## A.1 What “correct” means

| Workflow          | File                               | Without secrets                                                 | With secrets                                       |
| ----------------- | ---------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| **CI** (`verify`) | `.github/workflows/ci.yml`         | Brand/typecheck/tests/build **and** merge-blocking LHCI (`npx lhci autorun` on public routes) using public anon values | Same + authenticated dashboard LHCI if `LHCI_TEST_*` set (does not need service role) |
| **E2E**           | `.github/workflows/e2e.yml`        | Anonymous smoke runs; **live** specs **self-skip**              | Live auth/checkout/share paths execute             |
| **Lighthouse**    | `.github/workflows/lighthouse.yml` | Manual/`workflow_dispatch` only (same budgets as verify)        | + authenticated dashboard run if `LHCI_TEST_*` set |

Design goal (from `e2e/README.md`): missing secrets must **not** fail forks; they **reduce coverage**. Green E2E without secrets is **CORE**, not **FULL**. CI prints this via `scripts/ci-coverage-report.mjs`.

**DEV vs production (E2E):** `E2E_SUPABASE_*` must point at a dedicated empty/test project. Never paste production `service_role` into GitHub Actions. Stripe secrets must be **test mode** (`sk_test_`, `whsec_`).

## A.2 Secrets checklist (GitHub Actions)

Set these on **Homi-Tech-Production → Settings → Secrets and variables → Actions**.

### Required for full E2E (live specs)

| Secret name                     | Value source                                | Rules                                               |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `E2E_SUPABASE_URL`              | Supabase project URL                        | Prefer a **dedicated test project**, not production |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role`     | Server only; never client                           |
| `E2E_STRIPE_SECRET_KEY`         | Stripe **Test** mode secret                 | Must start with `sk_test_`                          |
| `E2E_STRIPE_WEBHOOK_SECRET`     | Stripe test webhook signing secret          | Must start with `whsec_`                            |
| `E2E_STRIPE_PRICE_PLUS`         | Price id from `npm run stripe-setup` (test) | Plus tier lookup                                    |

The workflow maps these into both `E2E_*` and unprefixed names so Playwright **and** the dev server under test see them.

### Required for authenticated Lighthouse

| Secret name          | Value source                                | Rules                            |
| -------------------- | ------------------------------------------- | -------------------------------- |
| `LHCI_TEST_EMAIL`    | Supabase Auth user (low-value test account) | Dedicated; not a real customer   |
| `LHCI_TEST_PASSWORD` | That user’s password                        | Used by `scripts/lhci-login.cjs` |

### Optional repo **variable** (not secret)

| Variable                        | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Override CI fallback anon key (publishable) |

CI already embeds a fallback publishable anon key; setting the variable keeps rotation cleaner.

## A.3 Recommended: separate Supabase **test** project for E2E

| Use                     | Project                          |
| ----------------------- | -------------------------------- |
| Local app / prod        | `giyycykxkzfbowiapxpd` (current) |
| GitHub Actions live E2E | **New** project e.g. `homi-e2e`  |

On the E2E project:

1. Apply migrations (or restore a sanitized schema).
2. Auth → URL Configuration: Site URL `http://localhost:3000`, redirect `http://localhost:3000/**`.
3. Copy URL + service_role into GitHub secrets above.
4. Never put production service_role into Actions if you can avoid it.

**Why:** Live specs create and delete real auth users. Production is the wrong target.

`gh secret list --repo HoMI-Technology/Homi-Tech-Production` on 2026-08-16 returned **zero** Actions secrets. Live E2E and authenticated Lighthouse are **NOT CONFIGURED** until you set the names in A.2. Creating a second Supabase project is **BLOCKED — OWNER/BILLING DECISION** if it would change the paid plan; repository-side wiring is ready.

## A.4 How to set secrets (you run these)

### Option 1 — GitHub website (safest for first time)

1. Open:  
   `https://github.com/HoMI-Technology/Homi-Tech-Production/settings/secrets/actions`
2. **New repository secret** for each name in A.2.
3. Paste values from password manager / dashboards.
4. Run:

```powershell
homi doctor
# or
homi go; powershell -File .\scripts\check-github-secrets.ps1
```

### Option 2 — GitHub CLI (from repo root)

```powershell
homi go

# Example shape only — paste real values when prompted or via stdin
gh secret set E2E_SUPABASE_URL
gh secret set E2E_SUPABASE_SERVICE_ROLE_KEY
gh secret set E2E_STRIPE_SECRET_KEY
gh secret set E2E_STRIPE_WEBHOOK_SECRET
gh secret set E2E_STRIPE_PRICE_PLUS
gh secret set LHCI_TEST_EMAIL
gh secret set LHCI_TEST_PASSWORD

gh secret list
```

### Option 3 — Local E2E (your laptop, not Actions)

Put the same values in **`.env.local`** (gitignored) using the map in `e2e/README.md`, then:

```powershell
homi go
npx playwright install chromium   # once
npx playwright test
npx playwright show-report
```

## A.5 Verify secrets are wired

```powershell
homi doctor
```

Doctor reports **present / missing** for each secret name via `gh secret list` (never prints values).

Then force a workflow:

```powershell
homi go
gh workflow run E2E --ref main
gh workflow run Lighthouse --ref main
gh run list --limit 5
```

**Success criteria (go-live only — not this week)**

While #241 is open, **CORE** is success: anonymous/KEEP suites run; live specs **self-skip**. Do not treat skips as a failure to “fix.”

After the founder closes #241 and secrets exist:

- E2E run log shows live specs **not** skipped for missing env (or only skips for unrelated reasons).
- Lighthouse authenticated step runs when `LHCI_TEST_EMAIL` is non-empty — and only if that surface is KEEP or V4_LIVE (do not LHCI a DARK `/dashboard`).

## A.6 Failure modes (secrets)

| Symptom                                    | Cause                          | Fix                               |
| ------------------------------------------ | ------------------------------ | --------------------------------- |
| E2E green in 1–2 min, only anonymous tests | Secrets missing (CORE)        | **Accepted under #241.** Do not set A.2 until hold lifts |
| Live specs fail auth                       | Wrong project / allowlist      | Fix E2E Supabase Auth URLs        |
| Checkout e2e skips                         | Not `sk_test_` / missing price | Stripe test keys + `stripe-setup` |
| LHCI dashboard step skipped                | Empty `LHCI_TEST_EMAIL`        | Create test user + secrets        |
| `gh secret set` fails                      | Not logged in / wrong repo     | `gh auth status`; `homi go`       |

## A.7 GitHub Pro + required checks (owner — platform)

Private repos cannot use classic branch protection or rulesets on the current plan (`gh api .../branches/main/protection` → HTTP 403, "Upgrade to GitHub Pro").

After **GitHub → Settings → Billing → upgrade this account to Pro** (do not make the repo public):

1. Repo → **Settings → Rules → Rulesets → New ruleset** (or Branches → Add branch protection rule).
2. Target: `main`.
3. Enable: **Restrict deletions**, **Block force pushes**, **Require a pull request before merging**.
4. **Require status checks to pass:** exact names `verify` and `e2e` (from successful `main` runs). Do **not** require the manual `Lighthouse` workflow or authenticated LH.
5. Save. Confirm with `gh api repos/HoMI-Technology/Homi-Tech-Production/branches/main/protection`.

Preferred merge method: **Allow squash merging only** (one task → one PR → squash → delete branch). Rollback: Settings → General → re-enable merge commit / rebase.

---

# B. SSOT + Doctor (Windows operator tools)

## B.1 `homi-ssot.ps1` — keep GitHub and this machine 1:1

**Path:** `scripts/homi-ssot.ps1`  
**Launcher:** `homi ssot <cmd>`

| Command                    | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| `homi ssot status`         | Branch, ahead/behind, dirty files, `.env.local` present |
| `homi ssot pull`           | `git pull --ff-only` on current branch                  |
| `homi ssot push "message"` | Commit all + push (refuses `main`)                      |

**When to use**

- Sitting down: `homi ssot pull` (or `homi start` which also pulls).
- Walking away / switching machines: `homi ssot push "wip: …"`.
- Sanity: `homi ssot status`.

**Examples**

```powershell
homi ssot status
homi ssot pull
homi ssot push "wip: dashboard copy"
```

**Same rules as `scripts/homi-ssot.sh` (Mac)** — GitHub is the only bridge between machines. Never zip-copy the repo.

**Failure modes**

| Message               | Meaning            | What you do                                      |
| --------------------- | ------------------ | ------------------------------------------------ |
| ff-only pull failed   | Histories diverged | Rebase/merge carefully; do not force-push `main` |
| refusing to push main | Safety             | `homi branch my-fix` then push                   |
| not a git repository  | Wrong folder       | `homi go`                                        |

## B.2 `homi doctor` — full operator health check

**Path:** `scripts/homi-doctor.ps1`  
**Launcher:** `homi doctor`

Doctor checks, in order:

1. **Repo / branch / dirty state**
2. **Tooling versions** — node, npm, git, gh, vercel, supabase
3. **Auth** — `gh auth status`, `vercel whoami`, supabase link
4. **Local env** — `.env.local` keys present (names only)
5. **Supabase connectivity** — `npm run verify-supabase` if deps installed
6. **Quality matrix (optional quick)** — can run brand-check / typecheck flags
7. **GitHub secrets presence** — E2E + LHCI names
8. **Open PR / branch noise summary** (counts)

```powershell
homi doctor              # standard
homi doctor -Full        # also runs brand-check + typecheck + unit tests (slow)
homi doctor -SecretsOnly # only GitHub secrets checklist
```

**How to read the report**

- **OK** (green) — good enough to work.
- **WARN** (yellow) — you can code, but coverage/deploy signal is incomplete.
- **FAIL** (red) — fix before shipping (e.g. no git, no node, missing SSOT path).

## B.3 Command map (all `homi` entry points)

| Command                        | What it does                |
| ------------------------------ | --------------------------- |
| `homi`                         | Help menu                   |
| `homi go`                      | cd into SSOT                |
| `homi start`                   | pull + `npm run dev`        |
| `homi dev`                     | `npm run dev`               |
| `homi pull`                    | git pull on current branch  |
| `homi grok`                    | Grok with cwd = SSOT        |
| `homi check`                   | Quick git + verify-supabase |
| `homi doctor`                  | Full operator health        |
| `homi ssot status\|pull\|push` | Multi-machine Git sync      |
| `homi secrets`                 | Secrets checklist only      |
| `homi hygiene`                 | Branch / PR hygiene report  |
| `homi open`                    | Browser localhost:3000      |
| `homi branch name`             | Create `feat/name`          |
| `homi status`                  | git status                  |
| `homi manual`                  | Open this manual            |

---

# C. Branch hygiene policy + how to use it

## C.1 Policy (binding for you + agents)

### Goals

1. `main` is always deployable.
2. Open PRs are either **active**, **waiting on you**, or **closed**.
3. Dependabot majors never merge by accident.
4. Agent branches do not accumulate forever.

### Branch naming

| Prefix           | Use                                |
| ---------------- | ---------------------------------- |
| `feat/`          | New product behavior               |
| `fix/`           | Bugfix                             |
| `chore/`         | Tooling, deps (non-major), cleanup |
| `docs/`          | Docs only                          |
| `dependabot/...` | Automated only                     |

### Lifetime

| Type                        | Max open without update | Action                                            |
| --------------------------- | ----------------------- | ------------------------------------------------- |
| Your feature PR             | 14 days stale           | Merge, convert to draft, or close with reason     |
| Agent `cursor/*` `claude/*` | 7 days stale            | Close unless you claim it this week               |
| Dependabot **patch/minor**  | When CI green           | Merge if verify green                             |
| Dependabot **major**        | N/A                     | Manual review project — default **close or hold** |
| `main`                      | —                       | Never commit directly from laptop if avoidable    |

### Merge rules

1. Prefer **squash merge** for feature branches.
2. Require (by habit, even if GitHub free private cannot enforce protection):
   - CI job **`verify`** green
   - No secrets in diff
   - You can demo the change
3. Do not merge red TypeScript-major Dependabot PRs “to clean the list.”

### Dependabot policy

| Update type                                 | Policy                                                |
| ------------------------------------------- | ----------------------------------------------------- |
| Patch / minor grouping                      | Merge when `verify` green                             |
| Major (typescript, vitest, zod major, etc.) | Separate upgrade effort; leave open only if scheduled |
| Failed CI on Dependabot                     | Close or fix in a human-owned branch                  |

## C.2 Running hygiene

```powershell
homi hygiene           # report only
homi hygiene -Json     # machine-readable
```

The report groups:

- Open PRs by author (dependabot vs human)
- CI status when available
- Suggested action: **merge / review / close / hold**
- Stale branch candidates (remote, no recent push)—**does not delete**

### Manual cleanup examples

```powershell
homi go

# Close a stale Dependabot major you will not take
gh pr close 96 --comment "Holding TS 7 upgrade; will schedule separately."

# Merge a green minor dependabot (only if checks green)
gh pr checks 93
gh pr merge 93 --squash --auto

# Delete a remote branch after merge
git fetch --prune
git push origin --delete feat/old-thing
```

### Recommended cadence

| Cadence | Action                                          |
| ------- | ----------------------------------------------- |
| Daily   | `homi ssot pull` / work on ≤1 active feature PR |
| Weekly  | `homi hygiene` + close/merge list               |
| Monthly | Dependabot majors review hour                   |

## C.3 Current hygiene snapshot (how to re-check)

```powershell
homi hygiene
gh pr list --state open --limit 30
```

As of the audit that produced this manual, open noise included multiple **Dependabot majors** (e.g. TypeScript 7, Vitest 4) with CI failures—treat those as **hold/close**, not merge.

---

# D. Full day-in-the-life (operator)

## Morning

```powershell
homi doctor          # once if anything felt broken yesterday
homi ssot pull
homi start           # terminal 1
homi grok            # terminal 2 optional
```

## During work

```powershell
homi go
npm run brand-check
npm run typecheck
npm test
```

## Before PR

```powershell
npm run architecture:check
npm run build
git push -u origin HEAD
gh pr create --fill
gh pr checks
```

## End of day / switch machine

```powershell
homi ssot push "wip: describe work"
```

## Weekly

```powershell
homi hygiene
homi doctor
gh run list --limit 10
```

---

# E. Quality matrix (what CI runs vs what doctor runs)

| Check              | Local command                | CI `verify` | `homi doctor` | `homi doctor -Full`       |
| ------------------ | ---------------------------- | ----------- | ------------- | ------------------------- |
| brand-check        | `npm run brand-check`        | Yes         | No            | Yes                       |
| architecture:check | `npm run architecture:check` | Yes         | No            | Yes                       |
| typecheck          | `npm run typecheck`          | Yes         | No            | Yes                       |
| unit tests         | `npm test`                   | Yes         | No            | Yes                       |
| production build   | `npm run build`              | Yes         | No            | Optional note only (slow) |
| verify-supabase    | `npm run verify-supabase`    | No          | Yes           | Yes                       |
| secrets present    | `gh secret list`             | N/A         | Yes           | Yes                       |
| coverage mode      | `node scripts/ci-coverage-report.mjs` | Yes (summary) | No      | Yes                       |
| tooling auth       | gh/vercel/supabase           | N/A         | Yes           | Yes                       |

**Ship rule:** before non-trivial merge, either `homi doctor -Full` **or** green `verify` on the PR.

---

# F. Danger list (do not casual)

| Command / act                       | Why                                                 |
| ----------------------------------- | --------------------------------------------------- |
| `supabase db push`                  | Phantom migration history; use repair runbook first |
| E2E against production service role | Creates/deletes real users                          |
| `sk_live_*` in E2E secrets          | Suite refuses; also reckless                        |
| Commit `.env.local`                 | Secret leak                                         |
| Force-push `main`                   | Breaks multi-machine + Vercel history               |
| Merge Dependabot major on red CI    | Breaks main                                         |
| `vercel --prod` from dirty tree     | Bypasses Git SSOT                                   |

---

# G. File index (operator tools)

| Path                               | Role                       |
| ---------------------------------- | -------------------------- |
| `docs/OPERATORS-MANUAL.md`         | **This manual**            |
| `scripts/homi-ssot.ps1`            | Windows SSOT sync          |
| `scripts/homi-ssot.sh`             | Mac SSOT sync              |
| `scripts/homi-doctor.ps1`          | Health + secrets + summary |
| `scripts/check-github-secrets.ps1` | Secrets presence only      |
| `scripts/branch-hygiene.ps1`       | PR/branch report           |
| `e2e/README.md`                    | Playwright env map         |
| `docs/MIGRATION-REPAIR.md`         | Supabase history repair    |
| `DEPLOY.md`                        | Deploy + env handoff       |
| `AGENTS.md`                        | Agent/product rules        |

Launcher (machine-local): `%USERPROFILE%\.grok\launchers\homi.ps1`

---

# H. First-time setup checklist (new machine or “reset”)

- [ ] `gh auth login`
- [ ] `vercel login`
- [ ] `supabase login`
- [ ] Clone Homi-Tech-Production; confirm remotes
- [ ] Create `.env.local` from password manager / Vercel
- [ ] `npm ci`
- [ ] `npm run verify-supabase`
- [ ] Install Playwright browsers if needed: `npx playwright install chromium`
- [ ] GitHub secrets (section A) — **deferred while #241 is open**
- [ ] `homi doctor` all green/warn only (missing E2E secrets = WARN / CORE, not FAIL)
- [ ] Read branch policy (section C) once

---

# I. How AI agents must use this manual

When the user says “work on Homi,” agents must:

1. Operate only in Homi-Tech-Production SSOT.
2. Prefer `homi doctor` / `homi ssot` / package scripts over inventing new process.
3. Not invent parallel plan files; use this manual + `AGENTS.md` + `Plans.md` if present.
4. Not merge Dependabot majors or run `db push` without explicit user approval.
5. Point the user at **section + command** when teaching (example: "see Operators Manual, Section A, How to set secrets").

---

_HOMI TECHNOLOGIES LLC — Internal operator documentation. Product brand name is **HōMI**._
