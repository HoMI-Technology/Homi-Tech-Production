# RFC: Dashboard Surface index (audit-only)

**Status:** Selected  
**Date:** 2026-09-12  
**Layer:** `docs/audit/` — classification, not activation  
**Not an ADR.** HōMI ADRs stay in `docs/adr/` (CCP = ADR-005, chrome = ADR-006). Do not create `vault/`.  
**Base:** `origin/main` only. Tip recorded in the matrix: `af956b5` (PR K3 Admin v4) plus stay-draft honesty pass **PR #416**.  
**Activation:** none. `HOMI_V4_HOME_ENABLED` stays default-off. `V4_LIVE_PATHS` stays `[]`. Pixel Gate stays **CLOSED**.

---

## 1. Context

Founder wants a **Surface index** table with columns:

`Path | Lane | Page file | View builder | Data SSOT | Five-status | PR | Evidence | Notes`

**in addition to** the locked **V4_PENDING hosts** table that vitest iterates from `V4_PENDING_PATHS`.

The locked pending table is the CCP host contract. It must stay 1:1 with `lib/auth/keep-routes.ts` (`V4_PENDING_PATHS` order). It cannot name prefix pages (`/employee/dashboard`, `/admin/marketing`, `/money/bills`) without either (a) adding extra allow-list hosts or (b) breaking `__tests__/v4/dashboard-surface-matrix.test.ts` (`pending.map(host) === [...V4_PENDING_PATHS]`).

Shipped allow-list (13 hosts, all **HONEST | stay-draft** on the pending
table until the honesty SHA is an ancestor of origin/main):

`/home` · `/money` · `/path` · `/scenarios` · `/ask` · `/tools` · `/learn` · `/settings` · `/connections` · `/assessment` · `/employee` · `/partner` · `/admin`

Prefix matching already covers depth (`matchesListedPath`). Named operate pages that are **not** extra hosts:

| Page | Covered by host |
| --- | --- |
| `/employee/dashboard` | `/employee` |
| `/partner/dashboard` | `/partner` |
| `/money/bills` | `/money` |
| `/admin` + existing rooms (`V4_ADMIN_CONSOLE_NAV` + `V4_ADMIN_ROOMS_NAV`) | `/admin` |

Honest close-out on `origin/main` is **documentation + CORE record**, not a rebuild and not v4 activation.

**Out of this RFC:** flag-true, `V4_LIVE` moves, GitHub/Vercel/Supabase spend against **#241**, leftover branch `cursor/pr-c-shell-home-v4-2905`, `/team` (draft **#414** / K4), KEEP marketing rebuild, scoring/Plaid/ledger rewrites, `/first-moment` as a V4 host.

---

## 2. Decision

**Keep the locked tables (pending / related / out / core) unchanged in contract. Append a second “Surface index” after `core-raw`. Prefix rooms are not extra allow-list hosts.**

Record CORE from PR **#416** Actions: `verify` = **PASS**, `e2e` = **PASS**. Live E2E under **#241** = **SKIPPED**. Pixel Gate = **CLOSED**.

### Alternatives

| Option | What it does | Trade-off | Verdict |
| --- | --- | --- | --- |
| **A. Append Surface index after `core-raw`** | Pending table stays Host\|Status\|Terminal\|Note and 1:1 with `V4_PENDING_PATHS`. New 9-column index lists hosts **and** prefix rooms. New HTML marker `dashboard-matrix:index` **after** `core-raw` so `parseCoreTable` still stops at `core-raw`. | Two tables; some host duplication. Founder gets page/builder/SSOT without rewriting the vitest host lock. | **Selected** |
| **B. Widen the pending table** to the 9 founder columns | One table. | Breaks the locked parser (`Host` header, four cells, host order = `V4_PENDING_PATHS`). Prefix rooms cannot appear unless they become hosts. Highest blast radius for a docs-only close. | Rejected |
| **C. Add prefix rooms to `V4_PENDING_PATHS`** | `/employee/dashboard`, `/admin/*` become listed hosts. | Prefix law already covers them. Looks like activation surface-area growth. | Rejected |
| **D. New ADR (or `vault/` RFC)** | Promote the index to constitution. | Wrong layer. ADRs stay in `docs/adr/`. Do not create `vault/`. | Rejected |

**Why A wins:** the pending table is the allow-list lock; the Surface index is the founder map. Mixing them either breaks vitest or pollutes CCP. Appending after `core-raw` is the only insertion point that does not truncate the CORE parser.

---

## 3. Selected approach

Locked tables stay contract-frozen (markers, headers, pending hosts === `V4_PENDING_PATHS`). Exactly one `<!-- dashboard-matrix:index -->` after `core-raw`. Prefix rooms are index-only. Leftover `/admin/*` without a v4 builder = **BLOCKED** with `BLOCKED:` in Notes. `/dashboard` = DARK. `/team` = OUT (#414). Pixel Gate CLOSED. CORE Actions verify/e2e on #416 = PASS; live E2E under #241 = SKIPPED.

---

## 4. Plan for Coder (≤5 steps)

1. Persist this RFC at `docs/audit/RFC-dashboard-surface-index.md`. No ADR. No `vault/`.
2. One Surface index after `core-raw`.
3. Fill bound row set. HONEST rows cite builder + test. Leftover `/admin/*` = BLOCKED.
4. Record CORE per §2. Keep Pixel Gate CLOSED.
5. Lock with vitest in `__tests__/v4/dashboard-surface-matrix.test.ts`.

---

## 5. Definition of Done

- [x] This RFC lives at `docs/audit/RFC-dashboard-surface-index.md`
- [x] Exactly one Surface index after `core-raw` (Coder follow-up if still before CORE)
- [x] Pending/related/out/core contract unchanged
- [x] Prefix rooms listed on the index and absent from `V4_PENDING_PATHS`
- [x] Pixel Gate CLOSED; `V4_LIVE_PATHS` empty; flag default-off
- [x] CORE: Actions verify/e2e on #416 = PASS; live E2E #241 = SKIPPED
- [x] No leftover PR C; no `/team`; no #241 spend
