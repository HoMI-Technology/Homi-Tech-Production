# OS Shell Smoke Test Checklist

Generated: 2026-08-12

Manual browser verification after the Decision Intelligence OS shell changes
(sidebar rail, dashboard instrument, Money dual-panel, page transitions).
Companion to [`SMOKE.md`](./SMOKE.md) (automated) and
[`OWNER-GO-LIVE.md`](./OWNER-GO-LIVE.md) (commercial go-live). This file is
the UI checklist those scripts cannot cover.

## Sidebar

- [ ] Score/verdict block visible when signed in with an assessment
- [ ] Score/verdict block shows empty state when no assessment yet
- [ ] Journey nav groups: MEASURE / UNDERSTAND / ACT / REFLECT visible
- [ ] Active nav item has verdict-colored left border
- [ ] Pulse strip shows 3 cells at bottom
- [ ] Mobile drawer opens/closes correctly
- [ ] Sidebar collapses to 72px icon rail at lg, expands at xl

## Assessment

- [ ] /assessment hides sidebar, shows full-bleed focus shell
- [ ] After completing assessment, sidebar shows new score immediately
- [ ] Back to /dashboard shows updated verdict

## Money

- [ ] /money shows dual-panel: picture left + mode rail center + content right
- [ ] Mode rail S/T/D/P switches correctly
- [ ] Mobile: stacks vertically (picture top, rail horizontal, content below)
- [ ] Picture panel shows data when budget has entries
- [ ] Picture panel shows empty state + CTA when no budget data

## Dashboard

- [ ] Score numeral is visually dominant (96px range)
- [ ] Compass is secondary/smaller
- [ ] Page transitions: gentle fade/slide between routes

## Numbers everywhere

- [ ] All currency values use JetBrains Mono tabular-nums
- [ ] Dashboard metric rail values use .num class
- [ ] Money picture panel values use .num-money
