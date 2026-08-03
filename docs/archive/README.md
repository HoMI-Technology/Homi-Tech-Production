# Archived docs

Moved here 2026-08-03 (Plans.md task 4.1). Preserved byte-identical for history;
none of these is a live source of truth.

- **AUDIT-2026-07-08.md** — the 2026-07-08 full-platform audit that drove the hardening tiers. All findings since triaged/fixed; superseded by `SECURITY.md` (log) and the acceptance suite (`__tests__/acceptance/`).
- **BUILD-BRIEF.md** — the master build brief for the hardening/redesign push. Its §1 non-negotiable guardrails now live in `AGENTS.md` ("Product guardrails"); the tiered work items are done or tracked in `Plans.md`.
- **COMPANION-INTELLIGENCE-AUDIT.md** — companion/LLM-surface audit that produced the companion canon; superseded by `COMPANION-ECOSYSTEM.md` (root).
- **TOOLS-REDESIGN.md** — the tools-surface redesign spec; the redesign shipped, `DESIGN.md` (root) is the living design doc.
- **LAUNCH-RUNBOOK.md** — branch-era launch runbook. Its "what shipped" key-file map is preserved in `docs/launch-shipped-map.md`; owner steps superseded by `GO-LIVE-CHECKLIST.md`; incidents by `docs/RUNBOOK.md`.
- **LAUNCH.md** — 2026-07-23 launch checklist, superseded by `GO-LIVE-CHECKLIST.md` (root), which is THE launch doc. Known-stale bits here: the "PR #81 i18n sweep" item (i18n was removed in #125), `RECEIPT_SIGNING_KEY` (dead name — the real var is `RECEIPT_SIGNING_SECRET`), and "apply 00001–00033 via `supabase db push`" (do not — see `docs/ops/MIGRATIONS-SSOT.md`).
