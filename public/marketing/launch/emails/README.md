# Launch email sequence (4 emails)

| # | File | When | Purpose |
|---|------|------|---------|
| 1 | `01-teaser.md` | D-3 to D-1 | Build curiosity, no hard sell |
| 2 | `02-live.md` | Launch day | Link live + PH if any |
| 3 | `03-how-to-start.md` | D+1 / D+2 | How to explore calmly |
| 4 | `04-what-homi-isnt.md` | D+3 to D+5 | Bright lines & trust |

## How to load (HōMI product — preferred)

Product ESP is **Resend** via admin broadcasts (not a separate ESP copy-paste forever).

1. Confirm `RESEND_API_KEY` is set and domain **homitechnology.com** is verified (SPF/DKIM green in Resend).
2. Open **https://homitechnology.com/admin/email** (admin session).
3. Create **four draft campaigns** — one per file above.
4. Subject: use option A from each file (or A/B later).
5. Body: paste the prose under the `---` in each `.md` into the composer. Keep disclaimers. Replace `{{first_name | there}}` with the composer’s first-name merge if available, else “there”.
6. Audience:
   - Waitlist-only for teaser if product is soft-launching  
   - Waitlist + free accounts for live / how-to / isn’t  
7. **Do not send all four as a blast on an empty list.** Warm path: personal invites first; sequence when you have a real soft-launch window.
8. Honor unsubscribes (product already appends List-Unsubscribe on marketing templates).

### Already automated (do not rebuild)

| Trigger | Template | Code |
|---------|----------|------|
| Waitlist join | Confirmation | `lib/email/templates.ts` → `waitlist` |
| Account created | Welcome | `maybeSendWelcomeEmail` |
| Assessment complete | Verdict | `sendVerdictEmailForAssessment` |
| 30d reassess / outcomes | Lifecycle planners | `lib/email/lifecycle.ts` + cron |

### “Engaged” definition (ops)

| Definition | How to measure today |
|------------|----------------------|
| **Engaged email** | Opened **or** clicked in last 30 days (Resend analytics), **or** replied to hello@ |
| **Proxy if ESP analytics lag** | Accounts who completed an assessment in last 30d (activation) |

True open/click sync into Supabase is **not** shipped — use Resend dashboard weekly until webhooks land.

**Compliance:** Keep disclaimers. Never add “approved / guaranteed / best mortgage.”