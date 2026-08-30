# /workspace inventory — 29 Aug 2026

**Scope:** Knowledge box `/workspace`. Not a wholesale copy into Homi-Tech-Production.
**Repo canon for Baseline 001:** `docs/design/baseline/` on origin/main. The box must not hold a competing baseline.
**Tiers:** 1 = text locks into `docs/knowledge/corpus/` (later, Step 2). 2 = off-box archive. 3 = leave/discard.
**Do not:** merge to main, deploy, copy `kimi-homi-local/` or `venv/` into the product repo.
**Note on size:** A sidebar figure of 226.6 MiB / 287 files / 51 folders is a shallow box metric. The recursive folder walk below is larger because `kimi-homi-local/` (~1.2G unzip), `venv/` (168M), `homi-marketing-agency/` (156M), `homi-knowledge/` (229M), `repos/` (90M), and a stale `Homi-Tech-Production/` clone sit on this VM. Inventory is by top-level folder as requested.

## Priority: fold folders (App UX — do not reinvent)

| Folder | Verdict |
|---|---|
| `home-fold-v1/` | REJECTED empty Fraunces poster. Files: `HOME-first-viewport-PASS.png`, `HOMI-home-first-viewport-PASS-4b5d47ad.png` (same still), `home-first-viewport.html`, `icon-v2.svg`, `fonts/`. Tried: Brand empty first-viewport still as the signed-in Home. Rejected: founder disliked; #333 CLOSED superseded (not merged, 29 Aug 4:02 PM ET). Remaining look HOLD: do not match still `4b5d47ad`. Does **not** supersede `docs/design/baseline/`. |
| `home-redesign/` | Still dump only. Contains rejected `4b5d47ad` poster AND compass-as-page QA crop `QA-compass-as-page-889b0250.png` plus `brand-pass-home-first-viewport.png`. Tried: poster, then compass-as-page QA. QA crop is **not a gate**, not chrome law. Nav in that still still paints Home+Money+Path as peers (conflict row). Does **not** supersede `docs/design/baseline/`. |
| `baseline001/` | REAL box copy (no hyphen). `2026-08-29-verdict-screen-BASELINE.png` (1.3M, duplicate of repo canon) + `before-baseline001.png` (same bytes) + `THRESHOLDFOLD-BASELINE001-BRIEF.md` (App UX 8-defect brief, 29 Aug ~8:48 PM ET). Tried: document the founder “this is horrible” crop of live ThresholdFold. Not a competing baseline — a copy plus a brief. Repo `docs/design/baseline/` remains canon. |
| `baseline-001/` | STUB (hyphen). 0-byte `2026-08-29-verdict-screen-BASELINE.png` + README of visual-baseline rules (copy of repo README). **Not real.** Do not build from this folder. |
| `brandqa/` | 15 Aug `hero_1440.png` + `hero_composition_1440.png`. Homepage hero QA, not Baseline 001. Do not use for the fold fix. |

**Which is real:** `baseline001/` (no hyphen) holds the PNG. `baseline-001/` (hyphen) is an empty stub. Neither supersedes repo `docs/design/baseline/`.

## Folders (recursive file count, size, last mtime; `.git`/`node_modules` skipped)

| Folder | Files | Size | Last file | Purpose / tier |
|---|---|---|---|---|
| `audits/` | 1 | 20K | 2026-08-11 | Early product-file copies. Regenerable from repo. Tier 3. |
| `baseline-001/` | 2 | 7K | 2026-08-30 | STUB. Empty 0-byte PNG + README. NOT the real baseline. Do not compete with repo `docs/design/baseline/`. Tier 3 discard. |
| `baseline001/` | 3 | 2.6M | 2026-08-30 | REAL box copy of founder verdict PNG + App UX ThresholdFold brief. Duplicate of repo canon. Tier 2 archive PNG. |
| `brand-compass/` | 32 | 3.4M | 2026-08-20 | Compass craft stills (Aug 20). Not Baseline 001. Tier 2. |
| `brand-lock/` | 8 | 283K | 2026-08-19 | Brand lock stills (Aug 19). Tier 2. |
| `brandqa/` | 2 | 3.1M | 2026-08-15 | 15 Aug hero composition PNGs. NOT Baseline 001. Do not use for the fold fix. Tier 2/3. |
| `cloud-agent-transcripts/` | 73 | 30M | 2026-08-30 | Cloud agent JSONL transcripts. Sandbox-only. Tier 2 archive. Not product-repo. |
| `corpus-export/` | 0 | 0B | - | Empty staging from aborted export. Tier 3 discard. |
| `docs/` | (staging) | | 2026-08-30 | Local team-state + corpus staging for this PR. |
| `footer-check/` | 3 | 5.3M | 2026-08-19 | Marketing footer screenshots. Tier 2/3. |
| `grok-homi-local/` | 5 | 836K | 2026-08-29 | Grok share extract working copy. Rank 8 history. EXTRACT.md is knowledge; full tree not product-repo. Tier 2. |
| `home-fold-v1/` | 11 | 663K | 2026-08-29 | REJECTED empty Fraunces poster (still `4b5d47ad`). #333 closed superseded. Do not match. Do not rebuild. Tier 2 archive as evidence of rejection. |
| `home-redesign/` | 3 | 373K | 2026-08-29 | Still dump: rejected `4b5d47ad` poster + compass-as-page QA crop `889b0250`. QA crop is not a gate. Tier 2. |
| `homi-finance/` | 7 | 103K | 2026-08-19 | Finance agent scratch. Score law is `DASHBOARD_SCORE_MONEY_LOCK.md` in homi-knowledge. Tier 2/3. |
| `homi-fold-v2/` | 10 | 893K | 2026-08-29 | Compass-as-page QA still (`HOMI-first-viewport.png` SHA256 `889b0250e85fd32fdfc568167651a1dcbf2733b18ac66844deabef23e7a32301`). Reference only. Copy also under homi-knowledge/desktop-qa. Tier 2 duplicate. |
| `homi-fold-wireframes/` | 6 | 225K | 2026-08-29 | Fold wireframe stills. Not canon. Tier 2. |
| `homi-homepage/` | 10 | 7.5M | 2026-08-19 | Homepage craft shots. Marketing. Tier 2. |
| `homi-intake/` | 773 | 49M | 2026-08-15 | Brand/intake dumps. History under CANON. Not product-repo wholesale. Tier 2. |
| `homi-knowledge/` | 1488 | 229M | 2026-08-30 | Knowledge SoT (this agent). Tier 1 text locks go to `docs/knowledge/corpus/` in Step 2. Raw dumps stay sandbox/Tier 2. |
| `homi-landing/` | 4 | 3.3M | 2026-08-14 | Landing prototypes. Dated. Tier 2/3. |
| `homi-marketing-agency/` | 494 | 156M | 2026-08-30 | Marketing agency dump. Not product-repo. Tier 2/3. |
| `Homi-Tech-Production/` | 1045 | 9.5M | 2026-08-11 | STALE local clone (dated 11 Aug). Do not treat as origin/main. Repo lives on GitHub. Tier 3 leave. |
| `homi_shots/` | 17 | 36M | 2026-08-15 | Site screenshots Aug 15. Tier 2. |
| `homi_smoke/` | 0 | 0B | - | Empty smoke dir. Tier 3 discard. |
| `intake-extract/` | 2 | 18K | 2026-08-12 | Small intake extract. Tier 1 candidate. |
| `kimi-extract/` | 6 | 638K | 2026-08-14 | 14 Aug Kimi extract (rank 9 drift). Tier 1 EXTRACT.md only. |
| `kimi-homi-local/` | 14435 | 1.2G | 2026-08-29 | 1.2G Kimi Budget Planner unzip. NOT SoT. Rank 8. Do not copy into product repo. Tier 2 archive or discard. |
| `live-depth/` | 22 | 73K | 2026-08-19 | Live site depth captures. Dated. Tier 2. |
| `live-home/` | 12 | 42K | 2026-08-19 | Live homepage captures. Dated. Tier 2. |
| `live-mkt/` | 8 | 188K | 2026-08-20 | Live marketing captures. Dated. Tier 2. |
| `live-money/` | 11 | 28K | 2026-08-19 | Live money captures. Dated. Tier 2. |
| `live-rail/` | 3 | 35K | 2026-08-19 | Live rail captures. Dated. Tier 2. |
| `live-roles/` | 10 | 64K | 2026-08-19 | Live role-surface captures. Dated. Tier 2. |
| `og-audit/` | 1 | 139K | 2026-08-19 | OG image audit. Tier 2. |
| `poke-page1/` | 28 | 4.1M | 2026-08-19 | Page-1 poke shots. Tier 2/3. |
| `pr333-qa/` | 21 | 122K | 2026-08-29 | #333 QA notes. PR closed superseded. Evidence of rejection. Tier 2. |
| `pr333-sha/` | 1 | 753B | 2026-08-29 | #333 SHA note. Tier 3. |
| `prod-brand/` | 24 | 233K | 2026-08-12 | Old prod-brand copies. Dated 12 Aug. Tier 2/3. |
| `qa-287/` | 4 | 482K | 2026-08-20 | PR #287 QA. Dated. Tier 2. |
| `qa-289/` | 25 | 307K | 2026-08-20 | PR #289 QA. Dated. Tier 2. |
| `qa-290/` | 48 | 273K | 2026-08-20 | PR #290 QA. Dated. Tier 2. |
| `qa289/` | 14 | 254K | 2026-08-20 | Duplicate QA-289 folder. Tier 3 duplicate. |
| `repos/` | 1351 | 90M | 2026-08-14 | Other repo checkouts. Do not merge into Homi-Tech-Production. Tier 2/3. |
| `rpt-frags/` | 0 | 0B | - | Empty. Tier 3 discard. |
| `shots/` | 12 | 2.8M | 2026-08-20 | Misc shots Aug 20. Tier 2. |
| `skill-run/` | 9 | 76K | 2026-08-12 | Skill-run scratch. Tier 3. |
| `terafab/` | 23 | 37M | 2026-08-15 | TeraFab reference shots. Do not clone terafab into product. Tier 2. |
| `uploads/` | 25 | 39M | 2026-08-20 | Chat uploads. May include user files. Do not export secrets. Tier 2 careful. |
| `venv/` | 1274 | 168M | 2026-08-15 | Python venv. Regenerable. Tier 3 discard. |
| `visual-lock-research/` | 12 | 48K | 2026-08-30 | Brand visual lock research (source of BRAND_VISUAL_LOCK). Tier 1 lock already in homi-knowledge/desktop-qa. |
| `xposts/` | 4 | 90K | 2026-08-20 | X post drafts. Tier 2/3. |

Loose top-level files (PNGs, TSX copies, landing md, OG cards) are regenerable QA/marketing artifacts. Not listed as folders. Do not copy into product repo wholesale.

## Cannot export into the product repo

- `kimi-homi-local/` (~1.2G unzip) — not SoT, too large.
- `EXTRACT.raw.md` trees inside `homi-knowledge/` — never cite; too large.
- `cloud-agent-transcripts/` — session transcripts; Tier 2 archive.
- `venv/`, stale `Homi-Tech-Production/` clone — regenerable.
- Secrets, EIN, Plaid/Stripe/Supabase credentials — none should be committed. If found, redact.
- Binary QA image sets — Tier 2 archive, not `docs/knowledge/corpus/`.

## Next

Step 2 (after this PR is seen): Tier 1 text locks from `homi-knowledge/` into `docs/knowledge/corpus/` with INDEX.md. Tier 2 full tarball off-box. Packet 2 parked.
