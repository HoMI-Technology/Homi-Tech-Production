# Money Reality Unification — Design Spec

**Status:** Approved for implementation (founder direction 2026-08-08: merge finance + tools, ground-up, ultra-premium)  
**Product:** HōMI Decision Readiness Intelligence  
**Canon:** AI explains; deterministic code scores/calculates. Zero-affiliate. Completeness is first-class.

## Problem

Finance (`/finance`) and Tools (`/tools`) are one product implemented as two. Users store numbers in one place and run decision math in another. CFM reads legacy `FinanceState` while Budget uses the ledger — two money truths.

## Product thesis

> Show an honest picture of my money → stress a decision against it → return to Path/readiness with named next moves.

Not Mint. Not a calculator mall. **Financial Reality made operable.**

## Name & chrome

| Surface | Label | Route |
|---------|--------|--------|
| Canonical home | **Money** | `/money` |
| Track | Budget | `/money/budget` |
| Plan | Plan | `/money/plan` |
| Decide hub | Decide | `/money/decide` |
| Lenses (calculators) | (registry names) | `/tools/*` (public funnel preserved) |

- Primary nav: **Money** replaces **Tools**.
- **Finance** removed from chrome; `/finance` → `/money` (308).
- Public `/tools` hub remains for acquisition; signed-in home is Money.

## Modes (OPERATE — Cockpit Linear)

Three modes only — not eight classic tabs:

1. **Stand** (`/money`) — instrument fold: free cash, runway, goal gap, completeness; action dock (max 3).
2. **Track** (`/money/budget`) — ledger CRUD + calendar.
3. **Decide** (`/money/decide`) — decision jobs → lenses; calculators still resolve at `/tools/*`.

Plan is a primary action from Stand and its own route `/money/plan`.

## Data spine

```
Budget Ledger (SoT, cents)
  → Stand signals / Track UI / Plan
  → CFM view + decision overlay (price, rate, rent…)
  → Decide lenses
```

1. Ledger is the only money SoT for income, expenses, debt payments, savings, goals, transactions.
2. CFM is a **view**, never a second database.
3. Overlay write-back stays explicit.
4. Completeness & freshness travel with every derived number.
5. Legacy `FinanceState` is fallback until migration is complete; classic finance tabs are not promoted in chrome.
6. Scoring engine untouched.

## Decide taxonomy (jobs)

| Job | Lenses |
|-----|--------|
| Housing | affordability, mortgage, rent-vs-buy, down-payment, heloc, refinance, loan-programs, apr-compare |
| Stability | runway, debt-payoff, blind-budget |
| Horizon | fire, monte-carlo, roth-conversion |
| Readiness probes | simulator, preflight, path, scenarios (registry readiness ring) |

## Entitlements

- Stand + Track core: free  
- Bank sync: Plus (`bankSync`)  
- Advanced modeling depth: Pro (`advancedTools`) — gate depth, not the Money home  
- Free must not present a mall of locked doors

## Non-goals (this initiative)

- New scoring weights or hard stops  
- Affiliate / lender marketplace  
- Full Mint clone (cancel concierge, bill negotiation)  
- Deleting public `/tools/*` calculator URLs in v1 (funnel + SEO)

## Success criteria

- One chrome entry for money picture + decision math  
- Editing budget changes lens seeds without a second save ritual  
- Completeness never implies false certainty  
- verify gate green; brand-check green  
- Canonical mental model: **one money picture, many lenses**

## Phased delivery

| Phase | Deliverable |
|-------|-------------|
| M1 | CFM prefers ledger; tests |
| M2 | `/money` Stand cockpit + mode nav |
| M3 | Track + Plan under `/money/*` |
| M4 | Decide hub; ToolShell copy alignment |
| M5 | Nav, redirects, route-protection, sitemap |
| M6 | Nudge/link sweep `/finance` → `/money` |
| M7 | Retire classic chrome (later); e2e polish |

---

*Design owned by product design session 2026-08-08. Implementation on `feat/money-reality-unification`.*
