# Budget Apps Hole Research — Synthesis

**Date:** 2026-07-27  
**Framework:** Find the Hole, Fill the Hole™  
**Agents:** 5 parallel research agents (Rocket Money, peer landscape, Homi codebase, VOC, strategic plug)

---

## One-liner

> **Rocket Money answers: “Where is my money leaking?”**  
> **HōMI answers: “Am I ready for the next decision — and should I proceed?”**

---

## Framework application

| Step                    | Finding                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| **1. Observe friction** | Categorization hell, sync breaks, bill-neg fees, YNAB guilt, “I track but still can’t decide”      |
| **2. Spot gaps**        | No DO NOT PROCEED / readiness gate; no path-to-ready calendar; life decisions ≠ ledgers            |
| **3. Quantify demand**  | Post-Mint paid ~$100/yr apps; Rocket 10M+ members; people already pay for _weaker_ rear-view tools |
| **4. Build the plug**   | **Path to Ready** — verdict → calendar milestones → finance targets → reassess (not another Mint)  |
| **5. Test fast**        | Compose existing scoring + finance temps + calendar seed + companion context                       |

---

## Competitive summary

| Cluster               | Products                           | Job                                 |
| --------------------- | ---------------------------------- | ----------------------------------- |
| Bill / sub killers    | Rocket Money                       | Cancel waste, negotiate bills       |
| Zero-based discipline | YNAB, Goodbudget, Actual           | Give every dollar a job             |
| Premium hubs          | Monarch, Copilot, Simplifi, Origin | Full picture / couples              |
| Wealth                | Empower                            | Net worth + retirement + AUM funnel |

**Shared holes:** decision engines, bank-sync tax, true household OS, income volatility, closed-loop action beyond cancel Netflix.

**Rocket Money specifically does not own:** decision readiness, life milestones as product objects, couple readiness, big-purchase gates, debt strategy, investment planning tools.

---

## Homi surface (build-on, not rebuild)

| Exists                                                 | Gap                                                   |
| ------------------------------------------------------ | ----------------------------------------------------- |
| `/finance` cockpit + `user_finance_state` sync         | Debt tab not in FinanceState; no Plaid → manual merge |
| `/calendar` milestones (kinds only)                    | No amounts, no finance link, seeds are generic        |
| Plaid full backend (encrypted tokens, txns, snapshots) | No txn UI / recurring detection UI                    |
| Assessment → DO NOT PROCEED                            | No auto path after verdict                            |
| Companion finance + VERIFIED cashflow                  | Path/milestones not in context yet                    |
| Tools grid                                             | Partial finance prefill only                          |

---

## Recommended plug: Path to Ready

**User story:** After DO NOT PROCEED, one click generates a dated Build Path on `/calendar` tied to finance temperatures (runway, DTI, savings gap) with links to the right tools; Companion names the next milestone.

**Non-goals MVP:** Mint clone, cancel concierge, auto bank milestone completion, new scoring math.

**Success (30d):** ≥40% path gen on non-ready results; ≥50% keep a milestone 7d; ≥30% tool handoff; ≥15% reassess in 30d.

---

## Agent IDs (for resume)

1. Rocket Money — `019fa4e6-3d21-7601-b1d9-3fa4f983dc5d`
2. Peer landscape — `019fa4e6-3d22-70d3-a227-03568a7798bf`
3. Homi codebase — `019fa4e6-3d23-70e2-a084-330f3c3dad0f`
4. VOC (complete) — `019fa4e8-3f57-7582-bd50-6432eb1fe53c`
5. Strategy — `019fa4e6-3d24-73c2-8d24-ce4a3aaa9dc9`
