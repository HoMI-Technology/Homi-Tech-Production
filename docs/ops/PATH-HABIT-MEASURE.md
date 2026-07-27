# Path habit — default for NOT_YET + how we measure it

**Goal:** Every non-READY user treats Path to Ready as the default next move, not a buried feature. Measure activation; do not expand platform surface.

## Product habit loop

1. **Results** — auto-generate path for non-READY; hero CTA “Continue Path to Ready” → `#path-to-ready`.
2. **Dashboard** — hero primary is “Open Path to Ready” for NOT_YET / BUILD_FIRST / ALMOST_THERE; `PathNextMove` ensures a path from local assessment if missing and offers **Mark done** / Start step.
3. **`/path`** — full timeline; page view tracked once per session.

## Funnel events (occurrence-only)

Ordered habit funnel (also on **Admin → Analytics**):

| Event | Meaning |
|-------|---------|
| `path_generated` | Path created (auto or manual) |
| `path_habit_impression` | Habit surface shown (dashboard / results / path) |
| `path_page_viewed` | `/path` opened |
| `path_start_step_clicked` | User started a step tool |
| `path_first_step_done` | First pending step marked done |

Related: `path_return_visit`, `path_step_done`, `path_calendar_committed`, `verdict_shown`.

Props are enums/counts only (stage, surface, reason_code, verdict key). No scores, free text, or PII.

## Operator SLOs

| Metric | Target |
|--------|--------|
| Path activation | ≥95% of non-READY result views get a path (auto-path) |
| Habit impression | Dashboard shows PathNextMove when local assessment is non-READY |
| First step | Track ratio `path_first_step_done / path_generated` (7d) |

## Env

- `NEXT_PUBLIC_POSTHOG_KEY` — client capture
- `POSTHOG_PERSONAL_API_KEY` (+ optional `POSTHOG_PROJECT_ID`) — admin HogQL funnel

Without PostHog, events still land in `window.__homiEvents` for local debug.

## Explicitly out of scope

Bill negotiation, cancel-concierge, action marketplace. Path + preflight + household only.
