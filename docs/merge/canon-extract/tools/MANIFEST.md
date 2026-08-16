# lib/tools Manifest — HoMI-Technology/Homi-Tech-Production (default branch)

Saved RAW from GitHub to /mnt/agents/output/canon/tools/. Local byte sizes verified equal to GitHub-reported sizes for every file.

| file | size (bytes) | purpose |
|---|---|---|
| apr.ts | 2321 | Compares loan offers by effective cost-inclusive APR (points + fees financed) via binary-searched rate solving, and picks the lowest-APR winner. |
| blindbudget.ts | 1426 | Range-based budgeting: computes worst/best-case safe-to-spend amounts and savings runway months from low/high income, fixed costs, and savings inputs. |
| cfm.ts | 12149 | Builds the Canonical Financial Model — a source-labeled view of the user's numbers combining the finance store with a synced lens overlay, plus CFM coverage and dot-path resolution. |
| debt.ts | 4083 | Simulates debt payoff month-by-month under avalanche (highest APR) and snowball (smallest balance) orderings, reporting months, interest, and payoff curves with strategy comparison. |
| deltas.ts | 5717 | Computes before/after runway and DTI impact deltas of new or replacement monthly obligations against the user's saved finance state (the canonical lens-impact arithmetic). |
| digest.ts | 11749 | Lens Digest transport and prompt-building: publishes/consumes a page-scoped sessionStorage digest of a tool's computed outputs and renders the Companion's context note and deterministic fallback synthesis. |
| fire.ts | 2517 | FIRE math: classic FIRE number from a safe withdrawal rate plus Coast-FIRE projections (needed amount now, coast age, projected balance at retirement). |
| format.ts | 1761 | Shared formatting helpers for currency (full, compact, stat-tile), percent, and months-to-years display strings. |
| heloc.ts | 2119 | Home equity/HELOC availability math: equity, available line under CLTV caps, interest-only monthly cost, and a 0.80/0.85/0.90 CLTV tier comparison. |
| loanprograms.ts | 4054 | Compares Conventional, FHA, and VA loan programs on financed upfront fees (UFMIP/funding fee), monthly mortgage insurance, and true monthly totals. |
| montecarlo.ts | 8225 | Seeded (mulberry32 + Box-Muller) Monte Carlo savings-trajectory simulation producing P10/P50/P90 bands, target-hit probability, survival and distress rates, with optional job-loss/shock/income-growth events. |
| mortgage.ts | 5621 | Core mortgage math: amortized monthly payment, PITI affordability tiers (Protected/Stretch/Red Line) via binary search, payment breakdowns with HOA, and amortization summary. |
| readiness-bands.ts | 4283 | Computes magnitude-only readiness impact (band, direction, hard-stop) of a housing hypothetical by running the canonical simulator twice, with number-free/weight-free output language. |
| refinance.ts | 2372 | Refinance break-even analysis: payment savings, months to recoup closing costs, and lifetime interest delta including closing costs. |
| registry.ts | 20999 | Declarative Lens Registry for all decision tools — ring grouping, slider input specs with CFM seeding/write-back, decision chains, and carry-value mapping across lenses. |
| roth.ts | 2166 | Educational Roth conversion comparison: tax cost today vs tax avoided at horizon on the grown converted balance, in nominal undiscounted dollars. |
| scenarios.ts | 10291 | Tool scenario snapshots with CFM anchoring: drift detection, deterministic same-lens scenario evaluation/comparison, and a capped local-only store for anonymous users. |

Notes:
- No fetch failures. The brief said 18 files but listed 17; the repo's lib/tools/ directory contains exactly these 17 files (verified via directory listing), so nothing is missing.
- Repo was accessed read-only; no writes to GitHub.
