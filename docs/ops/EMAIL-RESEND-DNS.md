# Resend DNS + Supabase SMTP (homitechnology.com)

**Goal:** Transactional mail from `HoMI <hello@homitechnology.com>` actually delivers.

**Why this matters:** The app hardcodes that From address in `lib/email/send.ts` and `lib/email/campaign.ts`. There is no env override. The Resend domain **must** be `homitechnology.com` (or the code must change).

**DNS host today:** GoDaddy (`ns47.domaincontrol.com` / `ns48…`).

**What we measured 2026-08-05:**

| Check | Result |
|-------|--------|
| Root SPF | `v=spf1 include:_spf.google.com ~all` (Google only) |
| DMARC | Present: `p=quarantine` |
| MX | Google Workspace (keep for human mail) |
| `resend._domainkey` | **Missing** |
| `send.homitechnology.com` | Points at **Amazon SES** (old path — not Resend root) |

---

## Recommended path (root domain — matches current code)

Use root domain verification so `hello@homitechnology.com` works without a code change.

### A. Resend dashboard

1. Open [resend.com/domains](https://resend.com/domains).
2. **Add Domain** → `homitechnology.com`.
3. Region: pick the closest (US is fine).
4. Open the domain → **DNS Records** / **Records** tab.
5. Copy **exactly** the records Resend shows (DKIM + SPF, sometimes MX for return-path). Do not invent hostnames — Resend rotates values.

### B. GoDaddy DNS (one change at a time)

1. GoDaddy → **My Products** → Domains → `homitechnology.com` → **DNS** / **Manage DNS**.

2. **DKIM (from Resend)**  
   - Usually a **CNAME**: name like `resend._domainkey` (or whatever Resend shows)  
   - Value: the Resend target (ends in something like `resend.com` or similar)  
   - TTL: 1 hour / default  
   - **Do not** put a trailing period unless GoDaddy requires it.

3. **SPF — merge into the single existing TXT** (only one SPF record is allowed).  
   **Current:**
   ```
   v=spf1 include:_spf.google.com ~all
   ```
   **After Resend (typical):**
   ```
   v=spf1 include:_spf.google.com include:amazonses.com ~all
   ```
   Resend’s UI may show `include:amazonses.com` or a Resend-specific include — **use the exact include string from the Resend domain page**.  
   - Edit the **existing** SPF TXT on `@` / root.  
   - Do **not** add a second `v=spf1` TXT.  
   - Keep Google first so Workspace keeps working.  
   - Keep `~all` (soft fail) until mail is proven; tighten to `-all` later if you want.

4. **Return-path / MX (only if Resend shows them)**  
   - Often on a subdomain like `send` or `bounces`.  
   - You already have `send.homitechnology.com` → SES. If Resend wants different MX/TXT on `send`, **replace or align** with Resend’s values so they don’t fight. Prefer whatever Resend’s domain page shows for this account.

5. **DMARC** — already present:
   ```
   v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
   ```
   Leave as-is for now. After verification, optionally add a Resend-aware `rua` later.

6. Save DNS. Wait 5–30 minutes (sometimes up to 48h).

### C. Verify in Resend

1. Domain page → **Verify DNS Records**.
2. Status must become **Verified** (all rows green).
3. If stuck: re-check no duplicate SPF, no typo on DKIM CNAME, wait longer, then re-verify.

### D. Supabase Auth SMTP (confirmation / magic link / reset)

App product mail uses Resend **HTTPS API** (`RESEND_API_KEY`).  
Supabase Auth mail uses **SMTP** — a separate path. Both must work.

1. [Supabase Dashboard](https://supabase.com/dashboard) → project `giyycykxkzfbowiapxpd` → **Authentication** → **Emails** → **SMTP Settings**.
2. Enable custom SMTP:
   | Field | Value |
   |-------|--------|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` (literal) |
   | Password | same value as Vercel `RESEND_API_KEY` |
   | Sender email | `hello@homitechnology.com` |
   | Sender name | `HōMI` |
3. **Authentication → URL Configuration**
   - Site URL: `https://homitechnology.com`
   - Redirect allow list: `https://homitechnology.com/**` and `http://localhost:3000/**`
4. Enable **Leaked password protection** if not already on.

### E. Vercel env (already present — confirm)

In Vercel → `homi-platform` → Settings → Environment Variables:

- `RESEND_API_KEY` — Production + Preview (do not leave empty; sensitive is fine).
- Redeploy Production after any key change.

### F. Prove it (15 minutes)

1. **Product mail:** sign up a throwaway Gmail/Outlook address on https://homitechnology.com → confirmation arrives.  
2. Complete an assessment → verdict / lifecycle email (if triggered) arrives.  
3. In Resend → **Emails** / logs → delivery status **Delivered**.  
4. Check spam once; if spam, wait for domain warm-up and confirm SPF/DKIM aligned (mail-tester.com optional).

---

## Optional better long-term: subdomain

Resend recommends a subdomain (e.g. `mail.homitechnology.com`) for reputation isolation. That would require:

1. Verify `mail.homitechnology.com` in Resend.  
2. Change code From to e.g. `HoMI <hello@mail.homitechnology.com>` in `lib/email/send.ts` + `campaign.ts` + invite route.  
3. Supabase SMTP sender to match.

**Not required for launch** if root domain verifies cleanly.

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Resend 403 / domain not verified | DKIM missing or wrong SPF |
| Supabase confirm never arrives | Auth still on built-in mail or wrong SMTP password |
| Gmail spam | SPF incomplete (Google-only) or no DKIM |
| “Two SPF records” failure | Second `v=spf1` TXT — merge into one |
| Workspace stops sending | SPF dropped `include:_spf.google.com` |

---

## Checklist

- [ ] Domain `homitechnology.com` **Verified** in Resend  
- [ ] Root SPF includes Google **and** Resend’s include  
- [ ] DKIM CNAME present and verified  
- [ ] Supabase custom SMTP enabled + Site URL correct  
- [ ] Throwaway signup confirmation received  
- [ ] Resend log shows Delivered  
