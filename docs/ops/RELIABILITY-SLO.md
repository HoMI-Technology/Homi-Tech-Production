# Reliability SLOs — Path to Ready era

## Product SLOs

| Service                            | Target                              | Measurement                   |
| ---------------------------------- | ----------------------------------- | ----------------------------- |
| Assessment scoring                 | 99.9% success when app responds 200 | client errors / scoring calls |
| Marketing + assess routes          | 99.5% availability                  | uptime / Vercel               |
| Path UI usable offline of DB       | Always for generate/local           | manual + e2e                  |
| Path/household API 5xx             | <1% of authed requests (7d)         | server logs / APM             |
| Companion without inventing scores | 100% of sampled evals               | red-team prompts              |

## Error budget

- If Path API 5xx exceeds 1% for 7 days → freeze feature work; fix reliability.
- If bank-verified data is shown without confidence label → P0.

## Public surfaces

- `/status` — human-readable posture
- `/api/healthcheck` — machine probe
- `/architecture.json` — agent-scrapable product map (`npm run architecture:gen`)

## Ownership

- Core readiness: scoring + path engine
- Money truth: finance + Plaid
- Platform: CI, migrations SSOT (`docs/ops/MIGRATIONS-SSOT.md`)
