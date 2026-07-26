# Multi-dashboard operate program

**Status:** Active implementation  
**Branch:** `feat/operate-multi-dashboard`  
**Doctrine:** `DESIGN.md` OPERATE — where do I stand, what do I do next?

## Locked decisions

| ID | Decision |
|----|----------|
| D1 | Partner hybrid: L0 attribution (ref → referral_source), L1 named roster only via `partner_id`, L2 receipts later |
| D2 | One home per role at `*/dashboard`; portals redirect |
| D3 | Privacy: team/employer aggregates preferred; no UI that pretends peer scores are invisible if RLS allows them |
| D4 | Brand lock — HōMI tokens only |
| D5 | Waves: integrity → chrome → personal → partner → admin → employee → team |
| D6 | Single-writer PRs; research agents free |

## Waves

1. **I0** — Denormalize `referral_source` on assessment write; partner dashboard reads it  
2. **W0** — `PageFrame` / `PageHeader`, single `#main`, capability palette, companion off on admin  
3. **W1** — Personal hierarchy, skeleton, first-run collapse, single next step  
4. **W2** — Partner home book pulse + invite + correct data  
5. **W3** — Admin attention strip above KPI wall  
6. **W4** — Employee one home + privacy chrome  
7. **W5** — Team uses same operate frame (aggregate UI)

## Success

- 3s hierarchy: score/pulse/attention + one next action  
- Partner invite counts match dashboard  
- `brand-check` + `typecheck` green  
- One `main` landmark on product routes  
