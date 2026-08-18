# Design: HōMI full financial picture via Plaid

**Status:** implementing on `feat/plaid-link-webhook` (recommended design)  
**Date:** 2026-08-18  
**Repo:** Homi-Tech-Production  
**Branch to implement on:** `feat/plaid-link-webhook` (webhook URL + `/connections/oauth` already there)

## 1. Problem

Today Link initializes with `products: ["transactions"]` only (`app/api/plaid/link-token/route.ts`). We persist `plaid_items`, `plaid_accounts`, `plaid_transactions` and compute a 30-day verified cash-flow. `/money/investments` and `BrokerPanel` are **demo / session-local**. They do not read Plaid.

The founder asked to pull **all financial records, investment accounts, and users**, then chose **Accounts + Identity** (bank-file name/address/email/phone, not KYC). “All financial records” is treated as cash + investments + *consented* liabilities, fetched only when the linked accounts actually support them.

## 2. What “users” is — and is not

| Term | Product | Use in HōMI |
|---|---|---|
| Identity | `/identity/get` | Bank-file owners on linked accounts. Server-only. Match against the signed-in profile. |
| Identity Match | `/identity/match` | Out of v1 (extra per-call fee). |
| Identity Verification | KYC docs/selfie | Out. Cannot mix in the same Link session. |
| Plaid Check / CRA | Consumer report | **Forbidden.** FCRA + Plaid Terms §1.2. |
| Auth | Routing / account numbers | **Out.** We do not move money. |

Plaid guarantees **name** on Identity. Email / address / phone may be empty arrays. Joint accounts put every name in **one** `owners[]` object. Some banks stamp every Item-level name onto every account. Capital One **credit-card-only** Items return `PRODUCTS_NOT_SUPPORTED` for `/identity/get`.

## 3. Recommended Link shape

Official PFM recommendation ([Choosing how to initialize products](https://plaid.com/docs/link/initializing-products/)):

```ts
{
  client_name: "HōMI",
  user: { client_user_id: userId },
  country_codes: ["US"],
  language: "en",
  webhook: `${site}/api/plaid/webhook`,
  products: ["transactions"],
  required_if_supported_products: ["identity"],
  additional_consented_products: ["investments", "liabilities"],
}
```

Why this, not `products: ["transactions","investments","identity"]`:

- `products` is an **intersection**. The user can only pick institutions that support *every* listed product. Checking-only banks drop out if Investments is required.
- Investments and Liabilities in `additional_consented_products` collect consent now, bill **only** when we first call the endpoint, and a call on the wrong account type **fails without a bill**.
- Identity in `required_if_supported_products` does not shrink the institution list, but at OAuth banks the user cannot quietly opt out of identity and still finish Link. Plaid documents that fraud actors opt out when Identity is merely optional.

Dashboard DTM use case: **“Track and manage your finances” only.** Do not select loan / credit-building use cases.

## 4. After exchange

1. Existing `/transactions/sync` path unchanged (cursor discipline already shipped).
2. `/identity/get` once, persist owners server-side, return only a match flag + display initials to the client.
3. If any account `type === "investment"`: enqueue `/investments/holdings/get` (replace snapshot) and `/investments/transactions/get` (paginate `count`/`offset` up to 24 months). **Do not** run the investments-transactions call on the Link `onSuccess` request — first call can block 1–2 minutes.
4. If any account is credit card / student / mortgage: enqueue `/liabilities/get`.
5. `/item/get` → persist `consented_products`, `billed_products`, `consent_expiration_time`.

There is **no** `/investments/transactions/sync`. `/transactions/sync` never includes brokerage activity.

## 5. Existing Transactions-only Items

DTM (on for new US/CA customers since Oct 2024) and **all Robinhood (`ins_54`) Items** refuse new products with `ADDITIONAL_CONSENT_REQUIRED` unless they were consented at Link time.

Update mode:

```ts
{
  access_token,
  // no products array
  additional_consented_products: ["investments", "identity", "liabilities"],
}
```

No second `/item/public_token/exchange`. Then call the product endpoints.

Identity *might* already be in `consented_products` because Transactions already collected the Contact scope — check `/item/get` before forcing update mode for Identity alone. Investments and Liabilities always need a new scope.

## 6. Schema

Service-role writes only. RLS owner-select. Purge on disconnect / `USER_PERMISSION_REVOKED` / `USER_ACCOUNT_REVOKED` (same order as today’s transaction-then-account purge).

- `plaid_securities` PK `security_id` — name, ticker, type, subtype, figi, is_cash_equivalent, close_price, institution_security_id. Do not depend on CUSIP/ISIN (null without a CGS license).
- `plaid_holdings` unique `(account_id, security_id)` — quantity, institution_price, institution_value, cost_basis, vested_*. **Replace snapshot** on `HOLDINGS: DEFAULT_UPDATE`.
- `plaid_investment_transactions` PK `investment_transaction_id` — amount sign is **inverted vs bank tx** (buy positive / sale negative). Honor `cancel_transaction_id`.
- `plaid_account_owners` — names/emails/phones/addresses JSON. **Never** select this from a client-exposed view.
- `plaid_liabilities` — typed payload (credit / student / mortgage) + extracted next_payment, last_payment, interest_rate, credit_limit.

Do **not** mash holdings or investment tx into `plaid_transactions`.

## 7. Webhooks (extend existing router)

| Type | Code | Action |
|---|---|---|
| TRANSACTIONS | SYNC_UPDATES_AVAILABLE | existing `syncItem` |
| HOLDINGS | DEFAULT_UPDATE | replace holdings snapshot |
| INVESTMENTS_TRANSACTIONS | DEFAULT_UPDATE | pull changed date window |
| INVESTMENTS_TRANSACTIONS | HISTORICAL_UPDATE | only if async post-Link add |
| LIABILITIES | DEFAULT_UPDATE | `/liabilities/get` |
| ITEM | ERROR / PENDING_* / revoked | existing handlers; **delete owners** on revoke |

Identity has **no** product webhook.

Ack within 10s; do heavy work after insert-first idempotency (already the Stripe/Plaid pattern). Rate limits: holdings 15/min/item, inv-tx 30/min, identity 15/min.

## 8. Scoring / Companion / UI

- **Scoring wall:** identity, holdings, and liabilities must not enter `lib/scoring/*`. Verdict stays 35/35/30 on assessment inputs. Stale/reconnect labels stay a legal control (UDAAP).
- **Companion:** may narrate verified cash flow + portfolio totals as VERIFIED blocks, with as-of dates. Never “you qualify.”
- **UI v1:** Connections shows investment accounts next to bank accounts; `/money/investments` reads live holdings instead of the demo store. BrokerPanel demo remains until that read path exists.
- Client never receives raw `owners[]`.

## 9. Cost (Pay As You Go sheet — do not publish)

Transactions $0.30 + refresh $0.12 already in play. Adding Investments Holdings $0.18 and Investments Transactions+Holdings $0.35 are **separate subscriptions**, billed on first relevant call if we keep them in `additional_consented_products`. Identity is one-time per Item when `/identity/get` runs (or at create if it sits in `required_if_supported_products` — confirm Dashboard billing before locking Identity in RISP vs `optional_products`). Liabilities $0.20 if we actually call it. Calendar-month UTC, not prorated; `/item/remove` is the only stop.

Fidelity / Schwab Production access is often delayed (weeks). Do not promise those brokerages on day one.

## 10. Failure modes we will handle in tests

- `ADDITIONAL_CONSENT_REQUIRED` → reconnect / update-mode CTA
- `PRODUCTS_NOT_SUPPORTED` / `NO_INVESTMENT_ACCOUNTS` / `NO_LIABILITY_ACCOUNTS` → skip, no bill, no user-facing error
- `PRODUCT_NOT_READY` → retry after webhook, do not fail Link
- `ACCESS_NOT_GRANTED` → update mode
- `ITEM_LOGIN_REQUIRED` → existing reconnect
- Chase / Schwab duplicate Item (one OAuth Item per user at Schwab; Chase invalidates if account sets differ)
- Option `quantity` is contracts × 100
- Missing cost_basis / empty tax_lots
- Closed account disappears (no tombstone) — drop holdings for that account_id
- Identity empty arrays / joint owners / business name
- Revoke deletes owners + holdings + inv-tx + liabilities

## 11. Implementation slices (after approval)

1. Migration + types + RLS + purge hooks  
2. Link token arrays + `/item/get` consent persistence  
3. Identity fetch + match + server-only storage  
4. Holdings + securities sync + HOLDINGS webhook  
5. Investment transactions pagination + webhook  
6. Liabilities fetch + webhook  
7. Connections + `/money/investments` read path  
8. Update-mode CTA for existing Items  

## 12. Assumption register

| ID | Assumption | Confidence | Critical? |
|---|---|---|---|
| A1 | Founder wants bank-file Identity, not KYC | 0.95 | Yes — chosen in session |
| A2 | Liabilities should be consented now, fetched only when accounts exist | 0.75 | No — can drop `liabilities` from ACP |
| A3 | Production Identity + Investments are enabled on the Plaid team | 0.40 | Yes — verify in Dashboard before billing |
| A4 | DTM is on for this client_id (new-customer default since Oct 2024) | 0.85 | Yes — forces update mode for old Items |
| A5 | Readiness Score must not consume these feeds | 1.00 | Yes — CANON |

## Sources

- https://plaid.com/docs/link/initializing-products/
- https://plaid.com/docs/api/products/investments/
- https://plaid.com/docs/api/products/identity/
- https://plaid.com/docs/link/data-transparency-messaging-migration-guide/
- https://plaid.com/docs/link/update-mode/
- https://plaid.com/docs/account/billing/
- https://plaid.com/legal/terms-of-use/
- https://github.com/plaid/pattern
- https://github.com/plaid/quickstart
- https://github.com/plaid/pattern-account-funding
