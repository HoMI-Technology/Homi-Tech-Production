# Admin + Marketing Attention Doctrine (Phase 4)

**Status:** Locked  
**Authority:** This file for `/admin*` operate hierarchy. Companion presence, Home Path,
and Money/Tools depth are out of scope (Phases 1–3 locked).

Admin is **attention-first**. Marketing is **ship-or-kill**. Companion stays **off**.

---

## Primary questions

| Surface | Primary question |
| --- | --- |
| **Admin home** (`/admin`) | What needs ops attention now? |
| **Marketing** (`/admin/marketing`) | Paid vs organic → First Moment / unique activation — what ship or kill today? |
| **Ad spend** (`/admin/ad-spend`) | Which paid channel earns vs burns — what cut or keep? |
| **Analytics / directories** | Supporting depth — not competing homes |

---

## One primary action

| Surface | Primary action |
| --- | --- |
| Admin home | CTA on the top `AttentionStrip` item |
| Marketing | Primary attention (`MarketingTodayStrip`) or `#approval-queue` |
| Ad spend | Attention CTA (log spend / review worst channel) before tables |

KPI walls (`MetricRail`, charts, desks) stay **below** attention.

---

## Never on these screens

- Companion chat / Homie avatar / fold presence line
- Equal 12-tile KPI hero with no owner or as-of
- Ad-spend ledger tables as the first thing the eye hits on Marketing
- FOMO, scarcity, banker urgency in ops copy
- Softening zeros (“almost converting”) — zeros stay zeros
- Remounting personal Path / Home fold as the admin instrument

---

## Still HōMI

- Tokens only: navy, cyan, emerald, yellow, amber, crimson
- Educational / ops honesty — not Mixpanel cosplay
- Brand wordmark HōMI where chrome already shows it

---

## Companion off (locked)

`CompanionHost` / `CompanionWidget` skip `pathname === "/admin"` and
`pathname.startsWith("/admin/")`. Do not weaken this gate.

---

## Definition of done

- [ ] `docs/ADMIN-MARKETING-ATTENTION.md` matches this doctrine
- [ ] `/admin` mounts `PageFrame` + `AttentionStrip` before `MetricRail`
- [ ] `/admin/marketing` leads with attention / ship-kill, desks below
- [ ] `/admin/ad-spend` leads with an attention/decision band
- [ ] Companion remains unmounted on admin routes
- [ ] Phases 1–3 tests stay green; `brand-check` + `typecheck` green
