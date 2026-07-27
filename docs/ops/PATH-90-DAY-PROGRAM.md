# Path to Ready — 90-day program (implemented)

Shipped in branch `feat/path-90-day-complete` (code map).

## Days 1–30 — Harden & measure

| Item | Implementation |
|------|----------------|
| Migration SSOT | `docs/ops/MIGRATIONS-SSOT.md` |
| CI always on PR + feat branches | `.github/workflows/ci.yml` push globs `feat/**` `fix/**` `chore/**` |
| Path funnel analytics | `lib/readiness/analytics.ts` + PathToReadyCard / export / nudge |
| Auto-path non-READY | `ensurePathForVerdict` on results hydrate |
| First-step nudge | `FirstStepNudge` on dashboard PathNextMove |
| Prod smoke | `e2e/path-smoke.e2e.ts` |

## Days 31–60 — Deepen the moat

| Item | Implementation |
|------|----------------|
| Evidence-based completion | `lib/readiness/evidence.ts` + store reconcile |
| Household email invites | `/api/household/invite` Resend send |
| Path versioning | `lib/readiness/versions.ts` archive on regenerate |
| Path export | Markdown + JSON download on results path card |
| Legal housing pass | `lib/readiness/legal.ts` + unit tests |

## Days 61–90 — Scale the moment

| Item | Implementation |
|------|----------------|
| Flagship results craft | Results hero + protective path copy |
| Pricing experiment | `lib/readiness/pricing-experiment.ts` + strip on results |
| Partner certificates | `/report/[id]/path-certificate` |
| Status + SLO | `/status` + `docs/ops/RELIABILITY-SLO.md` + sitemap |

## Still operator-owned

- Branch protection requiring `verify` check  
- Resend configured for household emails  
- PostHog key for production analytics (`NEXT_PUBLIC_POSTHOG_KEY` + admin HogQL keys)  
- Partner sales packaging beyond certificate page  

## After ship — habit & measure (not more platform)

See **`docs/ops/PATH-HABIT-MEASURE.md`**. Dashboard/results make Path the default for non-READY; Admin Analytics shows the Path habit funnel.
