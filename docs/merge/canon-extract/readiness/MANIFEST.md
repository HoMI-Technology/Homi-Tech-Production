# Canon Manifest — HoMI-Technology/Homi-Tech-Production

Fetched raw (character-for-character via raw.githubusercontent) from commit `204e118e3ec5dbb64f9ebfe116a9051fda0afba6` (default branch HEAD at fetch time). Byte sizes verified against GitHub API metadata.

**Note:** the task listed 22 readiness files but only 20 filenames were enumerated; the repo's `lib/readiness/` contains exactly those 20 — all fetched, none missing. **Failures: none.**

## lib/readiness/ → canon/readiness/
| File | Bytes | Purpose |
|---|---|---|
| analytics.ts | 5742 | Path funnel analytics emitting occurrence-style events only (no scores/PII). |
| autocomplete.ts | 3654 | Pure helper that auto-completes path steps when live signals clear the gate. |
| coach.ts | 2909 | Pure companion path coach producing structured weekly board-meeting prompt lines. |
| evidence.ts | 2810 | Evidence-based path step completion recording why each step cleared (manual/finance/bank). |
| export.ts | 1853 | Path export to markdown and JSON for user download/partner share. |
| funding.ts | 4151 | Couples path fundingTarget steps to the finance cockpit as applyable targets without inventing amounts. |
| habit.ts | 2498 | Pure path habit-stage derivation plus session-scoped once flags for client islands. |
| impact-bus.ts | 18007 | Impact Bus v1: transient, Path-only completion feedback bus that never touches or invents HōMI-Score values. |
| index.ts | 3873 | Barrel file re-exporting the public readiness module API. |
| legal.ts | 1661 | Single source of truth for housing/readiness legal disclaimer copy (educational posture). |
| partner.ts | 2896 | Partner dual-readiness: reads local couples store to feed alignment as a path input without inventing partner scores. |
| path.ts | 22987 | Pure binding-constraint "Path to Ready" generator that sequences protective next steps from AssessmentResult. |
| preflight.ts | 6849 | Decision Pre-Flight 60-second gate combining scoring hard-stops with cash/FOMO checks. |
| pricing-experiment.ts | 2535 | Path/household pricing experiment hooks with sticky localStorage variant assignment. |
| progress.ts | 10382 | Pure binding-constraint progress and path-freshness helpers (no I/O). |
| recurring.ts | 2568 | Recurring fixed-obligation capacity store tracked as readiness drag, separate from finance cockpit. |
| scenario-path.ts | 5115 | Builds a Path to Ready from wait-12/24 scenario simulation inputs plus readiness context. |
| scenario.ts | 3028 | Scenario studio wrapping decisions simulation for readiness-aware buy-now vs wait comparison. |
| store.ts | 7262 | Path to Ready local-first persistence with optional server last-write-wins sync. |
| versions.ts | 1712 | Path versioning that keeps a capped local history of prior paths on regeneration. |

## lib/decisions/ → canon/decisions/
| File | Bytes | Purpose |
|---|---|---|
| simulate.ts | 7526 | Pure deterministic Decision Rehearsal simulation comparing 5-year net position of buying now vs waiting 12/24 months. |
| state.ts | 2188 | Local-first localStorage persistence of Decision Rehearsal simulation inputs so rehearsals resume across navigation. |

## lib/ → canon/
| File | Bytes | Purpose |
|---|---|---|
| simulator.ts | 13433 | Readiness-score simulator pure math for the /simulator page: seeds a baseline, simulates only the financial pillar via the canonical engine, and ranks money-lever impacts. |

## lib/genome/ → canon/genome/
| File | Bytes | Purpose |
|---|---|---|
| constants.ts | 2375 | Behavioral Genome dashboard display constants keyed to the live 9-dimension model. |
| dimensions.ts | 11180 | Defines the HōMI Behavioral Genome's 9 decision-psychology dimensions with 2 (partly reverse-scored) questions each and 0-100 scoring. |
