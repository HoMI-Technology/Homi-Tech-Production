# Security Policy

This document outlines the security posture of the **HōMI — Decision Readiness Intelligence™** platform.

## Supported Versions

| Version | Branch | Supported |
| ------- | ------ | --------- |
| 1.x     | `main` | ✅ Active |

Only the latest deployed production version receives security updates. Older release branches are not maintained.

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please report it **privately** so we can address it before public disclosure.

- **Email:** [security@homitechnology.com](mailto:security@homitechnology.com)
- **Fallback:** Contact us through the support channel listed on [homitechnology.com](https://homitechnology.com)

Please include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Potential impact assessment
- Any suggested remediation

We aim to acknowledge reports within **48 hours** and provide a timeline for resolution within **7 days**.

## Responsible Disclosure

We ask that you:

- Do not publicly disclose the vulnerability until we have released a fix
- Do not access, modify, or delete data belonging to other users
- Provide us reasonable time to remediate before publishing any findings

## Known Security Measures

The following controls are implemented in the HōMI production stack:

### Content Security Policy (CSP)

- Enforced via `Content-Security-Policy` header on production builds
- Report-only mode everywhere for ongoing violation monitoring
- `default-src 'self'` as the restrictive baseline
- `frame-ancestors 'none'` to prevent clickjacking
- `upgrade-insecure-requests` to force HTTPS upgrades
- External origins limited to verified vendors: Supabase, Plaid, PostHog, Anthropic (server-side)
- No `unsafe-eval` in script-src

### Transport & Headers

- **HSTS** (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`)
- **X-Frame-Options: DENY**
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy: strict-origin-when-cross-origin**
- **Permissions-Policy** restricting camera, microphone, and geolocation
- `poweredByHeader: false` in Next.js config

### Authentication & Authorization

- **Supabase Auth** with SSR session management via `@supabase/ssr`
- Middleware **fail-closed**: protected routes redirect to sign-in when auth cannot be verified
- **RLS (Row Level Security)** enforced on all tenant-scoped tables via Supabase migrations
- Privilege-escalation guards (BEFORE UPDATE triggers) protecting `role`, `subscription_tier`, `subscription_status`, `stripe_customer_id`

### Input Validation

- **Zod** schemas validate all API route bodies (checkout, assessments, webhooks, email, etc.)
- Scoring engine clamps numeric inputs to safe ranges
- Open-redirect protection: `next` query params validated to same-origin relative paths only

### Secrets & Environment

- `lib/env.ts` provides typed, lazy-validated environment access
- Required vars throw on first use (not at import time)
- Optional integrations (Stripe, Anthropic, PostHog) degrade gracefully when absent
- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `CRON_SECRET`) are never prefixed with `NEXT_PUBLIC_`

## Dependencies Handling Sensitive Data

The following third-party dependencies process or transport sensitive information:

| Dependency                                | Purpose                                 | Sensitive Data                                    |
| ----------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| `@supabase/supabase-js` / `@supabase/ssr` | Database, Auth, Storage                 | User PII, auth tokens, session cookies            |
| `stripe`                                  | Payments, subscriptions, billing portal | Payment methods, subscription tiers, customer IDs |
| `resend`                                  | Transactional email                     | Email addresses, message content                  |
| `@vercel/speed-insights`                  | Performance monitoring                  | Page-load telemetry (no PII)                      |
| `@sentry/nextjs`                          | Error tracking                          | Stack traces, request context                     |

### Webhook Security

- **Stripe webhooks** verify signatures using `stripe.webhooks.constructEvent` with the `STRIPE_WEBHOOK_SECRET`
- **Plaid webhooks** verify JWT tokens (production only; dev escape hatch documented)
- **Internal API routes** (`/api/email`, `/api/cron/*`) guard with `x-homi-internal` or `Authorization: Bearer` + `CRON_SECRET`
- Webhook events are deduplicated via the `webhook_events` table (unique index on `event_id`)

## Security Testing

Security-specific tests live in `__tests__/security/` and are run:

- On every Pull Request and push to `main` / feature branches, as part of the
  `verify` job in `.github/workflows/ci.yml` (`vitest run` picks up
  `__tests__/security/*.test.ts`)
- There is **no** separate `security-scan.yml` workflow today. Dependabot
  handles dependency updates (`.github/dependabot.yml`). Code scanning and
  secret scanning are not enabled on this private repository yet.

Tests cover:

- CSP policy assertions
- Environment validation
- Input sanitization (Zod schemas, scoring engine clamp behavior)
- Source-code audit for raw SQL concatenation

## Audit History

- **2026-07-08** — Full platform security audit (`docs/archive/AUDIT-2026-07-08.md`)
  - CSP enforce/report-only split
  - Middleware fail-closed fix
  - Privilege-escalation guard (migration 00018)
  - Open-redirect fix (`lib/auth/safeNext.ts`)
  - Outcome-surveys IDOR fix

## License & Scope

This security policy applies to the `HoMI-Technology/Homi-Tech-Production` repository and all production deployments derived from it.
