# HoMI Marketing — state packet 2026-08-30

**Agent:** HoMI Marketing.
**SHA:** `3bfe729` (`origin/main` at write; includes #345 F1, #348 test rebuild, #347 Product packet, #344 Finance packet). Live repo wins.
**Status:** DRAFT packet only. Stay draft. No product code. No test changes. No DESIGN.md. Packet 2 parked. Never post externally. Never push/merge `main`. Never deploy. Never spend.

---

## Locks / HOLDs (and why)

- **Unprompted work OFF** (founder 2026-08-29). Weekday 8am social memo **PAUSED**. No new routines unless founder asks in Marketing chat.
- **Advise only** unless founder authorizes a **specific** post. Never like / comment / DM / upload unsupervised. Never ask another bot to publish.
- **Do not Approve** the 8 admin morning-brief drafts unless founder asks. Board unread since 8/20 — **UNVERIFIED** in this repo (admin board is live data, not git). Zeros stay zeros. Do not invent the board.
- **Packet 2 PARKED.** No launch posts. No `founder_*` posts. Public byline **Founder** until name unlocked.
- **No LinkedIn drafts** (none exists). Skip deronin X-growth pack. Graph likes off-lane. Stadium almost never reply.
- **TikTok profile live Aug 20** (avatar + bio, 0 videos) — **UNVERIFIED** in this repo (external account). **UPLOAD forbidden** until a specific yes. Close `/first-moment`, never `/assessment` (`PRIMARY_CLOSE_HREF` in `components/marketing/first-moment-copy.ts`).
- **Public X only `@Homi_Tech`.** Repo: `GROWTH_ENGINES` href `https://x.com/Homi_Tech`; share metadata `site`/`creator` `@homi_tech` (`lib/seo/share.ts`, `lib/admin/marketing-command.ts`). Confirm handle on screen before any compose. Never founder personal account. **Two X accounts. Personal = hard stop.**
- **Do not edit** X bio / pin / follows / header / avatar unless founder says. Pin stays `https://x.com/Homi_Tech/status/2090190607960703219` — **UNVERIFIED** in this repo (external).
- **Dunk-viral rejected.** North star = unique completed assessments. Repo lock: `MARKETING_LOCK.northStar` = “Weekly activations (completed readiness path)”; Activation Instrument hero is activations, not likes.
- **Share-card HTML v5 (verified on disk at this SHA):**
  - `public/og-v5.png` SHA256 `10b98850d787df151aca1aedb2249c499b1a4621fbd5b9eed44758afc8b31339`
  - `public/twitter-v5.png` SHA256 `a02b7217e2978c39813ebb4f07517d7aa42509149fc0d06d2db729ba47c80567`
  - Metadata pins these (`lib/seo/share.ts`, homepage re-pins OG so the HTML title does not leak). `og-v3` bytes remain on disk; metadata no longer points at them.
  - **X cache flush NOT completed** — **UNVERIFIED** in repo (cannot see X compose). Hold link-posts if compose still shows v3.
- **HOLDs are law until CEO lifts them.** Never push/merge `main`, never deploy, never spend, never post.
- **Pixels decide visual claims.** Never soften a failing test. Local `npm run build` fails **BY DESIGN** (SWC) — Marketing does not touch it.
- **#289:** domain memory said stay draft until verify+e2e + CEO. **GitHub at this write: #289 is MERGED** (`feat(admin): X + TikTok engines on /admin/marketing`). Marketing does not reopen, undraft, or treat #289 as an open draft. A LinkedIn-only **string** is not in current admin TSX; live eyebrow is “This week · X + TikTok engine” (`ActivationInstrument`). Whether a chip still *looks* LinkedIn-only is **UNPIXELLED** — `/admin/marketing` needs a working Chrome box (Dev). Do not PASS from code.

---

## Decisions made (my domain)

- Desk collapsed into Marketing. X Strategy Setup retired.
- 8–12 replies/day is **capacity, not quota**. No invented tweet IDs.
- Founder asked 2026-08-29 to build X+TikTok agency; OS rebuilt same evening **on the Marketing computer**. Memo stays paused. No slate running. `HOMI-X-TIKTOK-AGENCY.md` is **not in this repo** — do not copy it in unless founder asks.
- `/homi-launch` A/B SEO/metadata, copy truth-audit, and launch-plan drafts are **PARKED until captures exist.**
- Claims Marketing owns: `og:title` **HōMI**; share description **“Know when you're ready. Move when it matters.”**; cards **og-v5 / twitter-v5**. Plumbing is Dev (`generateMetadata` / `export const metadata` / layouts). Marketing writes the string; Dev ships the export.

---

## In-flight (branch / PR / wave)

- Marketing has **no product branch / wave**. This packet PR is the only in-flight.
- Paused routine: weekday-social-memo.
- Packet 2 stays parked. No launch posts.

---

## Top gotchas

- **Two X accounts.** Personal = hard stop. `@InmanNews` 404s; live `@Inman`.
- Chrome Aw Snap 9 / driver shell failed three weekdays. Do not invent the admin board.
- **`/assessment` is the live product path** (45-q home bank). **TikTok / homepage primary close is `/first-moment`.** DecisionOS layer 01 still hrefs `/assessment` (`FrontDoor.tsx`) — do not copy that into TikTok.
- Never **HōMI Score** / **HōMI Compass** / **Decision Intelligence OS** / **73%** / **$42K** / “zero trackers” (PostHog optional). Homepage uses **Decision Readiness Intelligence™**, not Decision Intelligence OS.
- **Homie as product name quarantined.** Voice line **“Your homie, not your banker”** / **“Your HōMI, not your banker”** is CANON. Live homepage: `NotYourBanker` title “Your HōMI, not your banker.” (`FrontDoor.tsx`).
- Homepage duration vs 45-q is a **live truth fail** (see Launch-track §2). Do not keep “5 minutes” unless Product/Knowledge re-lock duration.
- Homepage verdict spectrum still says **NOT YET**; operate + `/pricing` FAQ use **DO NOT PROCEED**. Do not screenshot the old #333 empty Fraunces first-viewport. Do not claim guest `/` *looks* like ThresholdFold until Brand shoots.
- Fold PRs #342 / #345 / #348 do **not** rewrite public marketing pages.

---

## Needs from other agents

- **Assistant:** this packet is the file. Stay draft. Do not merge. Do not undraft.
- **Founder:** resume 8am memo / run a slate / hold. Specific-post yes only. Name unlock for byline. X cache flush (if compose still v3).
- **Dev:** working-box Chrome for `/admin/marketing`; metadata ratchet for public marketing + `/tools/*` (tools already have `__tests__/seo-tool-metadata.test.ts` via `layout.tsx` — see Launch-track §1). Do not invent titles in this packet.
- **Brand:** pixels before any visual marketing claim about the new fold. Product packet is **UNPIXELLED**.
- **Product:** is Companion a launch-promised surface or HOLD (blocks homepage companions copy).
- **Captures** before any `/homi-launch` draft work.

---

## Launch-track answers

### 1. Metadata / SEO ownership

**Ownership:** Marketing owns the *claims* (share `og:title` **HōMI**, description **“Know when you're ready. Move when it matters.”**, cards og-v5 / twitter-v5 — verified in `lib/seo/share.ts` + on-disk SHA256). Dev owns Next.js `generateMetadata` / `export const metadata` / per-route `layout.tsx` plumbing and any T3-style ratchet. Shared: Marketing writes the string; Dev ships the export; a metadata ratchet should be a Dev test that Marketing can fail.

**Grep at `3bfe729` (page.tsx only — the orchestrator’s “40 of 70” is stale / UNVERIFIED as 40/70):**

| Surface | Count at this SHA |
| --- | --- |
| `app/**/page.tsx` | **106** |
| Export `metadata` or `generateMetadata` | **59** |
| `page.tsx` with neither | **47** |
| `app/(marketing)/**/page.tsx` | **29** |
| Marketing pages that export metadata | **27** |
| Marketing pages that do not | **2** — `app/(marketing)/blog/page.tsx` and `learning/page.tsx` (both `permanentRedirect("/guides")`; not crawlable bodies) |
| `app/(product)/tools/**/page.tsx` | **16** exist |
| Tools `page.tsx` that export metadata | **2** — `tools/page.tsx` (index via `pageMetadata`) and `tools/mortgage/page.tsx` (redirect + cross-canonical) |
| Tools `page.tsx` that do not export metadata | **14** client lenses |

**Those 14 tools are not bare.** Each has a server `layout.tsx` calling `toolMetadata(path)` (`lib/seo/tool-seo.ts`). `__tests__/seo-tool-metadata.test.ts` already ratchets every public lens directory. The “40 of 70 product pages export no metadata, including every public `/tools/*`” figure is **UNVERIFIED / stale at this SHA**. Missing *page-level* export on client tools is the `"use client"` constraint, not a missing-title gap.

**Public marketing HTML title is not the share card.** Homepage `export const metadata` title is “Decision Readiness Intelligence · A Decision Companion · HōMI”; description is the credit-score vs readiness line. OG/Twitter are re-pinned to share defaults so Slack/X get **HōMI** + the walk primary. That split is intentional (`lib/seo/metadata.ts` comment). Do not “fix” it by leaking the ranking title into OG.

**Recommendation (drafts only, later):** Dev may add a policy test that every *crawlable* public marketing + `/tools/*` surface emits title/description/canonical (tools already covered). Marketing supplies any new copy in a follow-up. This packet invents no titles.

### 2. Marketing-surface truth after fold work (#342, #345, #348)

Those PRs are signed-in fold / F1 hard-stop copy / test-suite rebuild. **GitHub:** #342 MERGED “draft: Baseline 001 ThresholdFold 8 defects”; #345 MERGED “draft: F1 hard-stop copy by stop code”; #348 MERGED “draft: rebuild dashboard/finance/layout/marketing/observe/planner test suites.” They do **not** automatically rewrite public marketing pages. Guest `/` is still `InterviewHero` + `FrontDoor`.

**Live-copy collisions still in repo at this SHA:**

- **Duration fail.** Homepage `InterviewHero` / `FrontDoor` CloseCta: “Free · about 5 minutes”. First Moment handoff: “This takes about 5 minutes.” (`first-moment-copy.ts`). Home assessment is **45 questions** (`lib/questions/bank.ts`: “home_buying — 45: 15 per dimension”). `/pricing` already says “free 45-question assessment”. Do not keep 5 minutes unless Product/Knowledge re-lock duration.
- **Verdict vocabulary split.** Homepage `PUBLIC_VERDICT_LABELS.NOT_YET` = **“NOT YET”** (`FrontDoor.tsx`, comment: marketing-page label). Operate fold + `VERDICT_META` badge = **DO NOT PROCEED**. Pricing FAQ: “What happens if HōMI tells me DO NOT PROCEED?” Inconsistency is the gotcha. Marketing must not screenshot the old #333 empty Fraunces first-viewport. Do not claim guest `/` *looks* like ThresholdFold until Brand shoots. Product packet: **UNPIXELLED**.
- **OPERATE / Companion over-promise (flag, do not rewrite here).** DecisionOS: “AI agent layer” / “Specialized companions…” / “Private command center” / “Enter the command center” (`FrontDoor.tsx` `OS_LAYERS`). Companion is HOLD-chrome (see §3). Flag only.
- **Pricing SKUs (verified in `app/(marketing)/pricing/page.tsx` + `MARKETING_LOCK.pricing`):** Free $0, Plus $9.99, Pro $24.99, Family $39.99. Matches Marketing lock. Fold PRs do not change SKUs.

**Pixels decide:** Marketing will not PASS a new fold look from code. Brand UNPIXELLED per Product packet.

### 3. Companion discoverability

Product packet 2026-08-30: **`/advisor` marketing HOLD.** Do not treat More “Companion” as first-screen chrome. `CompanionHost` returns null on `/dashboard`, `/dashboard/*`, `/admin`, `/admin/*` (`components/companion/CompanionHost.tsx`).

Brand pixel QA / `docs/ops/product-defects.md`: `/advisor` content exists off-nav; More and Jump-to have no Companion entry. Catalog: `lib/layout/nav-catalog.ts` `href: "/advisor"`, `surfaces: { palette: false }`. e2e `e2e/shell-nav.e2e.ts` asserts `APP_MORE_NAV` has no `/advisor`. Unit tests in `__tests__/layout/nav-catalog-parity.test.ts` and `__tests__/layout/app-header-nav.test.ts` lock the same.

**Intended surfacing (Marketing):** do **not** promise a nav entry. Companion is the widget + `/advisor` route, not a More item, not homepage chrome. Homepage “AI agent layer / Specialized companions” currently *does* promise a headline feature users cannot find — **copy over-claim**. Do not invent nav.

**BLOCKED** on Product (is Companion a launch-promised surface or HOLD) before Marketing rewrites homepage companions copy.

### 4. Naming law (#313)

**Lock:** **Decision Readiness Score.** Never HōMI-Score / Homie Score / HōMI Score. Compass is **Threshold Compass**, never HōMI Compass. (Founder lock in DESIGN.md via #313; executable tests: `__tests__/policy/rules/naming-law.test.ts`.)

**Grep at this SHA:**

- `app/(marketing)/**`, `components/home/**`, `components/marketing/**` — **no** `HōMI-Score` / `HōMI Score` / `Homie Score`. Homepage FrontDoor uses “Decision Readiness Score”.
- `app/share/[token]/page.tsx` — **Decision Readiness Score** (aria-label + caption). The otherbots note that share still prints “HōMI-Score” is **STALE**.
- `components/finance/ThresholdCompass.tsx` — **no** `HōMI-Score` string. Docs leftover: `docs/design/redesign-audit-seed.md` and `docs/design/baseline/README.md` still *mention* a finance-compass naming violation as history. That is operate/docs debt, not a live marketing-surface leak. Hand operate leftovers to Product/Dev. Marketing does not edit DESIGN.md.
- `public/marketing/gtm/NEVER_SAY.md`, `06-CLAIM-LAW.md`, `agency/04-COPY-SYSTEM.md` list “HōMI Score” / “HōMI Compass” as **banned → replacement** rows. Those are prohibition tables, not claims.
- Docs/history only: `docs/knowledge/homi-agent-knowledge.md` (supersession note), `docs/knowledge/homi-agent-knowledge-otherbots.md` (stale share line), `docs/MEASURE_ACT_W1.md`, `docs/archive/AUDIT-2026-07-08.md`.

**Public marketing pages are clean.** Leftovers are docs / prohibition tables / operate history.

### 5. Zero-affiliate + launch drafts

**Canon:** zero affiliate, no commissions, no referral fees; subscription not transaction.

**Live marketing (this SHA):**

- Homepage `FrontDoor`: “No commissions. No referral fees.”
- `/pricing`: “No commissions. No referral fees.” + FAQ “subscription rather than taking commissions.”
- `/partner`, `/b2b`, `/decision-readiness-intelligence` — same wall.
- `app/(marketing)/legal/**` — **no** affiliate / commission / referral-fee *monetization*. The only “referral” hit is acceptable-use “referral to law enforcement” (not a fee).
- `public/marketing/**` GTM / launch / agency copy states zero-affiliate. No dirty monetization pages found.

**Launch material this muster:** Packet 2 parked. No `/homi-launch` SEO A/B, copy truth-audit, or `docs/launch/launch-plan.md` have been written by Marketing this muster (`docs/launch/` is **absent**). Local OS kit exists only on the Marketing computer (`HOMI-X-TIKTOK-AGENCY.md`) — **not in this repo; do not copy it in.** Older static kit under `public/marketing/launch/` is library, not a go-live sequence.

**What still needs writing (later, after captures — drafts only):** public metadata *copy* follow-ups if Dev asks; homepage duration truth-audit; companions-copy HOLD rewrite; launch plan. **Nothing posts without founder approval.**

---

## BLOCKED

- **Founder:** 8am memo resume vs hold vs slate. Specific-post authorization. Name unlock for public byline. X cache flush if compose still shows v3.
- **Product:** is Companion a promised launch surface or HOLD (blocks homepage companions copy).
- **Dev:** metadata ratchet for crawlable public marketing (tools already ratcheted); readable `/admin/marketing` on a working Chrome box.
- **Brand:** fold pixels before any screenshot of signed-in product in marketing.
- **Captures** before `/homi-launch` drafts.

File the packet anyway. Incomplete on the record beats never landing.
