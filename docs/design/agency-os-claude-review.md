---
title: Agency OS — Claude architecture review
source: Claude Code (call-peer plan mode)
date: 2026-08-12
status: design — not yet implemented
related: docs/design/marketing-command-center-v2.md
---

# Agency OS - Claude architecture review

## Context

`/admin/marketing` shipped as a "Marketing Agency OS" (`145df30`, `7d84069`). The founder's read that it is not exceptional is correct, and the reason is structural, not cosmetic:

**The three claims the page makes about itself are not enforced by any code.**

| Claim (rendered on the page) | Where | Reality in code |
|---|---|---|
| "Agents run the work" | `components/admin/AgencyControlTower.tsx:56` | No agent runs anything. `evaluateFleet()` is a pure function over 8 booleans/numbers returning status *labels*. |
| "Approvals stay with you - nothing public without CEO eyes" | `AgencyControlTower.tsx:58` | `components/admin/WebhookPublisher.tsx:40-53` POSTs to Buffer/Make from the browser with no approval state, no record, no gate. |
| "Work the desk. Approve before it ships." | `components/admin/AgencyDesks.tsx:63` | There is no approve action anywhere in the codebase. |

The chrome is genuinely good - `OperateInstrument`, `MetricRail`, `AttentionStrip`, the claim-law strip, the metric-integrity work in `lib/admin/marketing-metrics.ts` are better than most admin UI. What is missing is the **spine**: a persisted artifact with a lifecycle, and something that runs between the founder's sessions. Without those, an "agentic agency OS" is a well-designed set of one-shot text generators behind tabs.

Intended outcome: make the CEO metaphor load-bearing - an asset cannot reach the public without passing an approval state transition, and the founder opens the page to work already waiting.

---

## 1. Product vision & CEO job loop

> The founder is the only human. The system does the drafting, the watching, and the remembering. The founder does the judging. Every public artifact carries a signature - a row saying who approved it, when, against which claim-law version.

Judgment is the scarce resource. Spend less of it per shipped artifact, and none on remembering yesterday.

**Daily loop - target � 7 minutes**

| Step | Time | Surface | State |
|---|---|---|---|
| 1. Read morning brief (what moved, what agents drafted overnight, one decision) | 2m | New `MorningBrief`, first viewport | **Missing** |
| 2. Clear approval queue - approve / edit / reject | 3m | New `ApprovalQueue` | **Missing** |
| 3. Publish approved (one click, server-gated) | 30s | `WebhookPublisher`, rebuilt | Exists, ungated |
| 4. Log yesterday's post numbers | 1m | `PostPerformanceTracker` | **Shipped** (`post_performance_log`) |
| 5. Glance at north star | 30s | `AgencyControlTower` + `ActivationInstrument` | **Shipped** |

Steps 1-2 do not exist. That is the daily loop, and it is the whole gap.

**Weekly loop (Sunday) - target � 25 minutes**

| Step | Surface | State |
|---|---|---|
| Review week: activations, cohort rate, channel mix | `SundayScorecard` + `#proof` | **Shipped** |
| Performance agent's "double down / kill" read | `analytics_summary` | **Shipped** |
| Competitive agent's gap read | `competitor_analysis` | **Shipped** |
| **Approve next week's plan** (7 slots, drafted Saturday) | New `WeekPlan` view | **Missing** |
| Paste scorecard into week doc | `SundayScorecardClient` | **Shipped** |

`lib/admin/marketing-command.ts:412` already has `isSundayInNy()` and re-orders Today CTAs on Sunday - the weekly-rhythm concept exists. What is missing is the **week plan generator**: Sunday produces a *report* but not a *commitment*.

---

## 2. Information architecture

### Problem with today's order

`page.tsx:450-716` renders: `PageHeader`  `MarketingTodayStrip`  `AttentionStrip`  `AgencyControlTower` (10-card grid)  `ActivationInstrument`  `MetricRail`  8 `QUICK_ACTIONS` buttons  `AgencyDesks` (10 tabs)  `#proof`  `#owned`.

Before the first desk: **four status surfaces and eleven navigation targets**. Every one answers "here is how things are"; none answers "here is what to do next." That is the signature of an admin page that is dense but not *operable*, and the most likely source of "not exceptional." Density is not premium; **decidability** is.

Also: all 10 desk panels render server-side and ship in the HTML, toggled only by `hidden` (`AgencyDesks.tsx:95-108`) - ten panels of markup per load for one visible desk.

### Proposed first viewport - three surfaces, one job

```
�������������������������������������������������������������Ŀ
� PageHeader - "Marketing Agency"                             �
�������������������������������������������������������������Ĵ
� MORNING BRIEF                                    [dismiss]  �   NEW
� "3 unique activated (7d, +1). Content drafted Mon/Wed.      �
�  Email blocked: Resend key missing."                        �
�  ONE DECISION: approve Monday's post or rewrite the hook.   �
�������������������������������������������������������������Ĵ
� APPROVAL QUEUE (4)           � NORTH STAR                   �   queue NEW
� ? Mon post � LinkedIn        �   3  unique activated � 7d   �
� ? Wed post � LinkedIn        �   4  completions             �
� ? Drip step 2 � email        �   cohort 3/11 (27%)          �
� ? Image brief � Mon          �   ???�???  30d               �
�   [Approve] [Edit] [Reject]  �                              �
�������������������������������������������������������������Ĵ
� Fleet strip - 10 dots, collapsed. Expands to today's grid.  �   demoted
���������������������������������������������������������������
```

Rules:
- **First viewport answers "what do I decide right now?"** - never "how are things?"
- The 10-card fleet grid demotes to a **one-line dot strip**. It is a beautiful component (`AgencyControlTower.tsx:95-116`) occupying prime real estate to say what the founder already knows. Expand-on-click retains it.
- `AttentionStrip` merges *into* the brief. Two attention systems above the fold is one too many.
- `QUICK_ACTIONS` (8 ghost buttons, `marketing-command.ts:82`)  `PageHeader` overflow menu. Eight equal-weight buttons is the visual definition of "no priority."
- `#proof` / `#owned` (~340 lines of always-expanded charts) become the **Analytics desk**. Review surfaces, not daily surfaces.

### Desk model

Keep the 10 desks - the taxonomy in `lib/admin/agency-fleet.ts:32-113` maps cleanly to a real agency org chart. Two changes:
1. **Lazy-mount** via `next/dynamic` keyed off `active`.
2. **Default tab follows the queue.** `AgencyDesks.tsx:35` hardcodes `useState("desk-content")`; it should open the desk owning the oldest pending approval.

---

## 3. Agent architecture

### Today

`agency-fleet.ts:27-28` defines `aiActions: string[]` on `AgencyAgent`. **Nothing dispatches from that field** - it is documentation. Desks call `/api/admin/marketing-ai` directly from client components with hand-built payloads. No run, no schedule, no memory, no output artifact, no autonomy concept.

### Proposed: autonomy tier on the agent record

```ts
// lib/admin/agency-fleet.ts - additive to AgencyAgent
autonomy: "auto" | "gated" | "manual";
```

| Tier | Meaning | Agents |
|---|---|---|
| `auto` | Scheduled; writes only to admin surfaces. Output never public. | Strategy (brief), Audience (insight), Performance (weekly read) |
| `gated` | Scheduled; writes **drafts** into the queue. Cannot publish. | Content, Calendar, Email, Competitive |
| `manual` | Runs only on founder click. | Publish, Guardrails, Library |

The invariant that makes the metaphor real:

> **`auto` agents may write to the admin surface. Only `gated` agents create drafts. Only the founder moves a draft to `approved`. Only `approved` assets publish. There is no code path from a model completion to an external POST that does not pass through a human `approved_by`.**

### Never auto-post - enforced, not documented

1. Any social copy, all platforms.
2. Any email to a real recipient - `00033_campaigns.sql:24` (`draft|sending|sent`) already has no auto-send path. Keep it.
3. Any competitor-derived copy (7 - prompt-injection surface).
4. Anything the claim-law strip flagged, even if cleaned: `flagged` non-empty  approval requires explicit second confirm.

### Approval queue - the missing spine

```
draft ��? in_review ��? approved ��? published
   �           �
   ���������������? rejected
```

Only `approved  published` may call an external endpoint, enforced server-side, not by a disabled button.

### Agent memory

Every generation is amnesiac today. `SocialContentStudio.tsx:46` caps `history` at 5 in React state, lost on reload. Persisting approvals gives every agent a corpus for free: **"here are 12 posts the CEO approved and 4 they rejected"** in the prompt converges the Content agent on the founder's voice within weeks. This is the highest-value downstream effect of P0 and the reason to build the spine first.

---

## 4. Data model - Supabase vs localStorage

### Current split (verified)

| Data | Store | File |
|---|---|---|
| Post performance log | **Supabase** `post_performance_log` | `20260812200000_post_performance_log.sql` |
| Campaigns + sends | **Supabase** | `00033_campaigns.sql` |
| Content calendar board | localStorage `homi-content-calendar` | `ContentCalendar.tsx:46` |
| Theme calendar + notes | localStorage `homi-theme-calendar`, `homi-theme-cal-notes` | `ThemeCalendar.tsx:68-79` |
| Competitor log + URLs | localStorage `homi-competitor-log`, `homi-competitor-urls` | `CompetitorPulse.tsx:65-83` |
| Buffer / Make webhook URLs | localStorage | `WebhookPublisher.tsx:159-160` |
| Generated posts, captions, briefs, drips | **Nowhere** - React state only | `SocialContentStudio.tsx:46` |

### Decision rule

Persist to Supabase when the data is **evidence** (something happened, someone decided, a number was true). Keep local when it is **preference or a third-party secret**.

| Data | Target | Rationale |
|---|---|---|
| Generated assets + approval state | **Supabase** (`marketing_assets`) | Evidence. Also the agent-memory corpus. |
| Content calendar entries | **Supabase** | A plan the founder committed to; cross-device; feeds week-plan agent. |
| Competitor log | **Supabase** | Hand-gathered intel, expensive to lose. `COMPETITOR_LOG_MAX = 50` (`marketing-agency.ts:1490`) exists only because of localStorage quota. |
| Agent run log | **Supabase** | Cost, latency, model, flagged. Currently only `console.log` (`marketing-ai/route.ts:286`). |
| Theme calendar offset + notes | **localStorage** | UI preference. Correctly placed. |
| **Buffer / Make webhook URLs** | **localStorage - do not move** | The comment at `WebhookPublisher.tsx:134-140` is right: bearer credential for someone else's account. P0 must not break this. |

### `marketing_assets` sketch

```sql
create table if not exists marketing_assets (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  kind           text not null,   -- post | caption | image_brief | drip_step | brief | week_plan
  platform       text,            -- linkedin | x | instagram | threads | email | null
  status         text not null default 'draft',
  body           text not null,
  hashtags       text[] not null default '{}',
  utm_campaign   text,
  source         text not null,   -- model | template (mirrors the API response field)
  model          text,
  flagged        text[] not null default '{}',
  claim_law_rev  int not null default 1,
  created_by     uuid references auth.users (id) on delete set null,
  approved_by    uuid references auth.users (id) on delete set null,
  approved_at    timestamptz,
  published_at   timestamptz,
  publish_target text,            -- buffer | make
  publish_status int,
  agent_id       text,            -- AgencyAgentId
  parent_id      uuid references marketing_assets (id) on delete set null
);
```

RLS: copy `post_performance_log` exactly - `enable` + `force`, single `for all to authenticated using (is_admin()) with check (is_admin())`, `grant . to authenticated`, `revoke all from anon`. Proven in this repo and avoids the `profiles` RLS recursion the migration comment warns about (`20260812200000_post_performance_log.sql:15-17`).

### Also: kill the 10k sample cap

`page.tsx` pulls up to `MARKETING_SAMPLE_CAP = 10_000` rows and aggregates in JS. The page already warns about it (`page.tsx:379-388`, "Move to server-side aggregates soon"). A Postgres RPC returning the daily unique-activated series removes the cap, deletes the `sample-cap` attention item, and cuts latency. Not urgent at current volume - scheduled P2, before it becomes a wrong-numbers incident.

---

## 5. AI action map

### Shipped - 9 actions (`app/api/admin/marketing-ai/route.ts:195-205`)

| Action | Agent | Prompt / template pair |
|---|---|---|
| `generate_post` | Content | `buildPostPrompt` / `templatePost` |
| `caption` | Content | `buildCaptionPrompt` / `templateCaption` |
| `image_brief` | Content | `buildImageBriefPrompt` / `templateImageBrief` |
| `repurpose` | Content | `buildRepurposePrompt` / `templateRepurpose` |
| `audience_insight` | Audience | `buildInsightPrompt` / `templateInsight` |
| `scorecard_summary` | Strategy | `buildScorecardSummaryPrompt` / `templateScorecardSummary` |
| `analytics_summary` | Performance | `buildAnalyticsPrompt` / `templateAnalyticsSummary` |
| `drip_sequence` | Email | `buildDripStepPrompt` / `templateDripSequence` |
| `competitor_analysis` | Competitive | `buildCompetitorPrompt` / `templateCompetitorAnalysis` |

**This library is the best part of the system.** Every action has a deterministic template twin, every completion passes `stripNeverSay` server-side and again client-side, and a claim-law failure falls back to the template rather than erroring (`route.ts:50-62`). Graceful degradation is designed in, not bolted on. Preserve the template-twin discipline for every new action.

### Missing

| Action | Agent | Trigger | Why |
|---|---|---|---|
| `morning_brief` | Strategy | **Cron, daily** | Entry point of the daily loop. Metrics + queue depth + fleet status  3 sentences + one decision. |
| `week_plan` | Calendar | **Cron, Saturday** | Turns the Sunday *report* into a *commitment*: 7 slots with topic, theme, campaign, drafted into the queue. |
| `hook_variants` | Content | Manual, from queue | Reject-and-retry should be one click with 3 alternatives. |
| `rewrite_from_feedback` | Content | Manual, from queue | "Too corporate"  regenerate with the note. **Highest-leverage action for the daily loop** - without it, "Edit" means the founder writes it themselves and the agent contributed nothing. |
| `voice_check` | Guardrails | Auto on draft create | Scores a draft against `FOUNDER_VOICE.md` + approved corpus. Guardrails has zero AI actions today (`agency-fleet.ts:103`) despite being the compliance agent. |

### Two cross-cutting notes

- **Model tiering.** `MODEL` is hardcoded to `claude-haiku-4-5-20251001` (`route.ts:64`). Right for captions and hashtags; wrong for the morning brief and week plan, the two artifacts the founder actually reasons from. Make `MODEL` a per-action lookup.
- **Cron auth is already solved.** `app/api/cron/reassessment/route.ts:31-36` has the exact pattern - `CRON_SECRET` + `safeSecretEquals` on the `authorization` header, `503` when service role is unconfigured. Copy verbatim; add entries to `vercel.json` (currently 2 crons).

---

## 6. Premium UX principles

Direction A ("Cockpit Linear") is established: `OperateInstrument` with `--instrument-tint`, `dash-instrument` / `dash-instrument-inner`, `MetricRail`, `score-numeral`, `.glass`, `eyebrow`. Six rules to keep additions inside it:

1. **Decidability over density.** Every surface answers *what do I decide* or *how are things* - never both, and the fold belongs to the first kind. This is the rule the current first viewport breaks.
2. **One tint per surface.** `OperateInstrument` takes a single `tint` from worst status (`AgencyControlTower.tsx:41-46`). Do not add a second accent inside an instrument.
3. **Numbers carry provenance.** Already strong: `source: "model" | "template"` on every response, `flagged[]` surfaced rather than hidden, cohort rate suppressed under n=5 (`marketing-metrics.ts:88-96`), the sample-cap warning. **Extend to the queue** - every pending item shows which agent drafted it, which model, what the strip removed.
4. **State, not decoration, earns motion.** No animation that does not encode a transition.
5. **Empty states are instructions.** Existing ones are good ("No webhooks configured. Open settings to paste a Buffer or Make URL.", `WebhookPublisher.tsx:264`). Hold that bar.
6. **Anti-slop test.** Before shipping any new panel: Does it tell the founder something the number next to it doesn't? Would a competent human agency employee produce this artifact? If the AI key were removed, does the panel still do useful work? (Template twins already answer yes for all 9 actions.)

**The specific slop risk in this plan is the morning brief.** A daily AI summary is where admin dashboards most often go from premium to noise, degrading into "engagement is up! keep it up!" Mitigations: hard 3-sentence cap; exactly one named decision with a link; when nothing changed the brief must say *"Nothing moved. Yesterday's decision is still open."* rather than manufacture narrative. Make that a template-twin constraint, not just a prompt instruction.

---

## 7. Security & claim law under agent pressure

### Already right

- Admin gate on every AI call: `requireAdmin()` checks `profiles.role === 'admin'` (`route.ts:67-84`).
- Rate limit 20/min per IP **+ admin id** - the comment at `route.ts:309-310` explains the id is appended so two admins behind one NAT don't exhaust each other. Considered, not cargo-culted.
- Zod discriminated union over all 9 actions with tight per-field bounds (`route.ts:86-205`).
- `stripNeverSay` server-side **and** client-side, with rationale documented: server is authoritative, client keeps a cached response honest (`route.ts:56-61`).
- **Fail-closed on claim law**: if the strip empties the copy, the route returns the deterministic template (`route.ts:386-387` and every sibling). A prohibited phrase cannot become publishable text.
- `isValidWebhookUrl` restricts publish targets to https (`marketing-agency.ts:1819`).

Above the bar for a solo-founder admin surface. The gaps below are specific to *adding agency*.

**Gap 1 - competitor text is untrusted input reaching a model whose output gets published.** `CompetitorPulse` takes hand-typed competitor hooks  `buildCompetitorPrompt`  model  `recommendations` shown as things to post. A competitor's LinkedIn hook is attacker-controlled text. `stripNeverSay` is a **denylist** (`NEVER_SAY_PHRASES`, `marketing-agency.ts:145`) - it catches phrasings you predicted. Injected output can be off-brand, defamatory, or claim-adjacent without matching any listed phrase. Mitigations: delimit competitor text as data in the prompt; mark output `kind='competitor_derived'` and force the second-confirm path regardless of `flagged`; never skip the queue. Same applies to imported LinkedIn CSV (`parseLinkedInAnalytics`  `buildAnalyticsPrompt`), smaller blast radius.

**Gap 2 - publishing leaves no record.** `postToWebhook` is a browser `fetch` to a third-party URL (`WebhookPublisher.tsx:40-53`). Nothing records what was sent, when, or by whom. If claim-law-violating copy ever reaches LinkedIn, there is no way to establish what shipped or which claim-law revision it passed. For a "not a lender / not a credit score replacement" product, that ledger is a regulatory-posture asset, not just observability. P0 fixes this as a side effect.

**Gap 3 - claim law is unversioned.** `NEVER_SAY_PHRASES` will grow. `claim_law_rev` on `marketing_assets` makes "re-review everything approved before the rule changed" a query instead of archaeology.

**Gap 4 - cron routes are unauthenticated agent surface.** New crons must use `CRON_SECRET` + `safeSecretEquals` (`reassessment/route.ts:31-36`), and a cron-invoked agent must write `created_by = null`, `status = 'draft'`. **A cron must never produce an `approved` row.** Encode as a `check` constraint so it holds even if a future route forgets.

---

## 8. Phased PR plan

### P0 - The approval spine (unblocks everything; do not reorder)

| File | Change |
|---|---|
| `supabase/migrations/<ts>_marketing_assets.sql` | **New.** Table per 4. RLS copied from `20260812200000_post_performance_log.sql`. Constraint: `created_by is null` (cron) rows cannot have `status='approved'`. |
| `lib/admin/agency-approvals.ts` | **New.** Pure helpers - `canTransition(from, to)`, `requiresSecondConfirm(asset)`, `queueDepth()`. Co-located `.test.ts`. |
| `app/api/admin/marketing-assets/route.ts` | **New.** `POST` create draft, `PATCH` transition. `requireAdmin()` + rate limit copied from `marketing-ai/route.ts:67-84,309-320`. Re-runs `stripNeverSay` on approve - fail closed. |
| `app/api/admin/marketing-publish/route.ts` | **New.** Accepts `{ assetId, webhookUrl }`. **Refuses unless `status === 'approved'`.** Records `published_at`, `publish_target`, `publish_status`. |
| `components/admin/WebhookPublisher.tsx` | Rewrite `postToWebhook` to call the route above. **The URL still comes from localStorage and is passed through** - preserves the "not a secret in a shared table" rationale at `:134-140` while moving the gate server-side. |
| `components/admin/SocialContentStudio.tsx` | On generate, `POST` a `draft` row. Replace in-memory `history` (`:46`) with queue-backed history. |
| `components/admin/ApprovalQueue.tsx` | **New.** Approve / Edit / Reject. Shows agent, model, `source`, `flagged`. |
| `app/(product)/admin/marketing/page.tsx` | Query pending assets; render `ApprovalQueue` in the first viewport. |

**Exit criterion:** grep proves no client-side path from model output to an external POST.

### P1 - Agents that run on their own

| File | Change |
|---|---|
| `app/api/cron/marketing-brief/route.ts` | **New.** Daily. `CRON_SECRET` pattern from `reassessment/route.ts:31-36`. Writes `kind='brief'`. |
| `app/api/cron/marketing-week-plan/route.ts` | **New.** Saturday. Drafts 7 slots into the queue. |
| `vercel.json` | Add both crons. |
| `lib/admin/marketing-agency.ts` | Add `buildMorningBriefPrompt`/`templateMorningBrief`, `buildWeekPlanPrompt`/`templateWeekPlan`, `buildRewritePrompt`/`templateRewrite`. **Template twin required for each.** |
| `app/api/admin/marketing-ai/route.ts` | Add `morning_brief`, `week_plan`, `rewrite_from_feedback`, `hook_variants` to `bodySchema` (`:195-205`). Replace the `MODEL` constant (`:64`) with a per-action lookup. |
| `lib/admin/agency-fleet.ts` | Add `autonomy` to `AgencyAgent`. Extend `FleetSignals` with `pendingApprovals`, `lastRunAt`. `evaluateFleet` returns `needs_you` when the queue is non-empty. |
| `components/admin/MorningBrief.tsx` | **New.** First viewport, above the queue. |

### P2 - Durability + honest numbers

| File | Change |
|---|---|
| `supabase/migrations/<ts>_marketing_calendar.sql` | **New.** `marketing_calendar_entries`, `marketing_competitor_log`. |
| `supabase/migrations/<ts>_marketing_aggregates.sql` | **New.** RPC for the daily unique-activated series - removes `MARKETING_SAMPLE_CAP` client aggregation. |
| `components/admin/ContentCalendar.tsx`, `CompetitorPulse.tsx` | Read/write via routes. Keep `parseStoredCalendar` / `parseStoredCompetitorLog` for one-time localStorage import. |
| `app/(product)/admin/marketing/page.tsx` | Use the RPC; delete the `sample-cap` attention item (`:379-388`). |
| `ThemeCalendar.tsx`, `WebhookPublisher.tsx` | **Unchanged** - correctly local. |

### P3 - Premium chrome + agent memory

| File | Change |
|---|---|
| `app/(product)/admin/marketing/page.tsx` | Re-order per 2: brief + queue + north star above the fold; fleet grid collapsed; `QUICK_ACTIONS`  `PageHeader` overflow; `#proof`/`#owned`  Analytics desk. |
| `components/admin/AgencyDesks.tsx` | Lazy-mount panels; default tab follows oldest pending approval instead of hardcoded `"desk-content"` (`:35`). |
| `components/admin/AgencyControlTower.tsx` | Collapsed dot strip; per-agent last-run / last-output / next-action. |
| `supabase/migrations/<ts>_marketing_agent_runs.sql` | **New.** Run ledger - model, tokens, latency, flagged. Replaces `console.log` at `route.ts:286`. |
| `lib/admin/marketing-agency.ts` | Feed approved/rejected corpus into `buildPostPrompt` - voice convergence. |

---

## 9. Open questions for the founder

1. **Should any agent publish without approval, ever?** Design says no. If you want one exception (e.g. an approved evergreen reposting on schedule), it changes the P0 schema - say so now.
2. **Morning brief delivery - in-app only, or email/push?** `sendTemplateEmail` (`lib/email/send`) already works. In-app is the assumption.
3. **Cost ceiling for autonomous runs?** Daily brief + weekly plan on Haiku is pennies/month. Routing the brief to a stronger model is still cheap but is a standing charge.
4. **Does the week plan draft posts, or only slots?** Seven full posts every Saturday makes Sunday a 7-item queue. Recommendation: slots-only first, measure whether you want the drafts.
5. **How long do rejected assets live?** They are your most valuable training signal (they encode what is *not* your voice). Recommendation: keep indefinitely, surface never.
6. **Multi-admin?** Everything assumes one CEO. `approved_by` is already there, but "who may approve" becomes a policy question if a second admin exists.
7. **Do you want the fleet grid demoted?** 2 recommends collapsing it; it is the most visually striking thing on the page. Taste call, and it is yours - the recommendation is on decidability grounds.

---

## 10. Key decisions & rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | **Approval spine (P0) before new agents or UI.** | Everything compounds on a persisted asset with a lifecycle: agent memory, publish ledger, queue-driven IA, claim-law versioning. Adding agents first produces more ungoverned text. |
| D2 | **Approval enforced server-side, not by a disabled button.** | "Nothing ships without CEO eyes" is a claim the product makes publicly. It must survive a bug, a stale client, and a future refactor. |
| D3 | **Webhook URLs stay local; the *gate* moves server-side.** | The rationale at `WebhookPublisher.tsx:134-140` is correct - a bearer credential for a third-party account. Passing it per-request preserves that while making the gate authoritative. |
| D4 | **Template twin for every new action.** | Nine actions degrade gracefully with no API key. It is why the studio is never a dead button, and the strongest engineering property in this subsystem. |
| D5 | **Demote the fleet grid; promote the queue.** | The fold should answer "what do I decide." Four status surfaces before the first actionable control is the specific reason the page reads as dense rather than exceptional. |
| D6 | **Cron agents produce only drafts - enforced by DB constraint.** | An unauthenticated-by-session surface that can create `approved` rows is one refactor from an auto-publishing agent. |
| D7 | **Competitor-derived output always takes the second-confirm path.** | Only place attacker-controlled text reaches a model whose output is meant for publication. `stripNeverSay` is a denylist and will not catch novel off-brand output. |
| D8 | **Version claim law (`claim_law_rev`).** | The rule set will grow. Without a stamp, "re-review everything approved under the old rules" is not a query you can run. |
| D9 | **Per-action model tiering.** | Haiku is correct for captions. The brief and week plan are what the founder reasons from - that is where quality is worth the spend. |
| D10 | **Keep the 10-desk taxonomy.** | It maps cleanly to a real agency org chart; the mandates in `agency-fleet.ts:32-113` are well written. The taxonomy was never the problem. |

---

## 11. Risks & failure modes

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Queue fatigue.** Agents draft faster than the founder approves; the queue becomes a guilt pile and the page gets avoided. | **High** | High | Cap gated agents at N drafts/day. Auto-expire after 7 days. Show queue *age*, not just depth. Slots-only week plans first (Q4). |
| R2 | **Morning brief becomes slop.** | **High** | Medium | 3-sentence hard cap; one named decision; template twin must emit *"Nothing moved"* when nothing moved. Most likely single point of "not exceptional" in the new work. |
| R3 | **Approval becomes rubber-stamping.** Gate is theatre. | Medium | **High** | Second-confirm on `flagged` or competitor-derived. Show the diff when edited. Do not build bulk-approve. |
| R4 | **Prompt injection via competitor log / CSV import.** | Low | **High** | 7 Gap 1 - delimit as data, mark derived, force second-confirm. |
| R5 | **localStorage migration loses hand-entered data.** | Medium | Medium | Import-on-first-load with existing parsers; never clear the key after import; read-both/write-both for one release. |
| R6 | **Cron cost drift.** First thing in this codebase that spends money with no human in the loop. | Medium | Low | Pull `marketing_agent_runs` forward if crons land before P3. Hard per-day run cap. |
| R7 | **Scope creep - building an agency instead of a product.** 10 desks, 13 AI actions, 4 crons, 5 tables for a pre-launch product with a single-digit north star. | **High** | **High** | North star is *unique activated users*, not agency completeness. Gate P2/P3 on the daily loop being used two consecutive weeks. **If the founder is not clearing a queue daily, more agents is the wrong build.** |
| R8 | **Claim-law regression under growth pressure.** | Low | **Severe** | Already well defended (fail-closed + double strip). P0 adds the audit ledger, D8 adds versioning. Do not weaken `stripNeverSay` to reduce false positives - accept template fallback instead. |

**R7 is the risk worth the founder's attention.** The engineering is sound and the taxonomy is good, but this subsystem is already large relative to a product with a single-digit north star. P0 is justified because it makes a claim the product already makes true. P1 is justified because it creates the daily loop. **P2 and P3 should be earned by evidence the loop is being run**, not scheduled in advance.

---

*Files read: `app/(product)/admin/marketing/page.tsx`, `lib/admin/agency-fleet.ts`, `lib/admin/marketing-metrics.ts`, `lib/admin/marketing-command.ts`, `lib/admin/marketing-agency.ts` (export surface), `app/api/admin/marketing-ai/route.ts`, `components/admin/{AgencyControlTower,AgencyDesks,WebhookPublisher,SocialContentStudio,SundayScorecard}.tsx`, `components/operate/OperateInstrument.tsx`, `supabase/migrations/{00033_campaigns,20260812200000_post_performance_log}.sql`, `app/api/cron/reassessment/route.ts`, `vercel.json`, plus a localStorage sweep across `components/`.*

---

## Executive summary

1. **Blocked on tooling:** Write is disabled this session; `docs/design/agency-os-claude-review.md` was not created. Content above is complete and ready to paste.
2. The page renders three claims about itself - "agents run the work," "nothing public without CEO eyes," "approve before it ships" - and **none is enforced by any code**.
3. `evaluateFleet()` (`agency-fleet.ts:135`) is a pure label renderer over 8 signals. No agent runs, schedules, remembers, or produces an artifact.
4. `aiActions` on the agent record (`agency-fleet.ts:27`) is documentation - nothing dispatches from it.
5. **There is no approve action anywhere in the codebase.** No draft/approved/published state exists.
6. `WebhookPublisher.tsx:40-53` POSTs to Buffer/Make from the browser, ungated and unrecorded. No ledger of what ever shipped.
7. Generated posts live in React state capped at 5 (`SocialContentStudio.tsx:46`) and are lost on reload - no agent memory, no voice convergence.
8. Calendar, theme notes, and competitor log are localStorage-only; only `post_performance_log` and `campaigns` reached Supabase.
9. No marketing cron exists - `vercel.json` has 2, both product lifecycle. No morning brief, no week plan.
10. **The genuinely excellent part:** 9 AI actions each with a deterministic template twin, `stripNeverSay` server + client, fail-closed to template on claim-law violation. Preserve that discipline.
11. `MODEL` is hardcoded Haiku (`route.ts:64`) - fine for captions, wrong for the brief and week plan.
12. First viewport shows four status surfaces and eleven nav targets before the first actionable control. Density, not decidability - the likeliest source of "not exceptional."
13. All 10 desk panels ship in the HTML on every load, toggled by `hidden`.
14. Security posture is above bar (admin gate, IP+id rate limit, tight Zod, https-only webhooks). Real gap: **competitor text is attacker-controlled input reaching a model whose output is meant for publication**, guarded only by a denylist.
15. Claim law is unversioned - no way to re-review assets approved under older rules.
16. **P0:** `marketing_assets` table + approval routes + server-gated publish. The webhook URL stays in localStorage and is passed through, preserving the existing (correct) secret-handling rationale.
17. **P1:** brief + week-plan crons using the proven `CRON_SECRET` pattern; add `rewrite_from_feedback` (highest-leverage missing action); autonomy tiers on the fleet.
18. **P2/P3:** localStorage  Supabase, server-side aggregates to kill the 10k cap, IA re-order, lazy desks, run ledger.
19. **Biggest risk (R7):** this subsystem is already large for a product with a single-digit north star. Gate P2/P3 on the daily loop actually being used.
20. **Second-biggest (R2):** the morning brief is where this goes from premium to slop. Hard 3-sentence cap, one named decision, and it must say "Nothing moved" rather than manufacture narrative.
<<<END_UNTRUSTED_CLAUDE_48c31e9e>>>

--- peer raw (for host agent to summarize) ---
Write is disabled in this session and I'm read-only, so I could not create `docs/design/agency-os-claude-review.md`. Full deliverable below - copy verbatim to that path.

---

# Agency OS - Claude architecture review

## Context

`/admin/marketing` shipped as a "Marketing Agency OS" (`145df30`, `7d84069`). The founder's read that it is not exceptional is correct, and the reason is structural, not cosmetic:

**The three claims the page makes about itself are not enforced by any code.**

| Claim (rendered on the page) | Where | Reality in code |
|---|---|---|
| "Agents run the work" | `components/admin/AgencyControlTower.tsx:56` | No agent runs anything. `evaluateFleet()` is a pure function over 8 booleans/numbers returning status *labels*. |
| "Approvals stay with you - nothing public without CEO eyes" | `AgencyControlTower.tsx:58` | `components/admin/WebhookPublisher.tsx:40-53` POSTs to Buffer/Make from the browser with no approval state, no record, no gate. |
| "Work the desk. Approve before it ships." | `components/admin/AgencyDesks.tsx:63` | There is no approve action anywhere in the codebase. |

The chrome is genuinely good - `OperateInstrument`, `MetricRail`, `AttentionStrip`, the claim-law strip, the metric-integrity work in `lib/admin/marketing-metrics.ts` are better than most admin UI. What is missing is the **spine**: a persisted artifact with a lifecycle, and something that runs between the founder's sessions. Without those, an "agentic agency OS" is a well-designed set of one-shot text generators behind tabs.

Intended outcome: make the CEO metaphor load-bearing - an asset cannot reach the public without passing an approval state transition, and the founder opens the page to work already waiting.

---

## 1. Product vision & CEO job loop

> The founder is the only human. The system does the drafting, the watching, and the remembering. The founder does the judging. Every public artifact carries a signature - a row saying who approved it, when, against which claim-law version.

Judgment is the scarce resource. Spend less of it per shipped artifact, and none on remembering yesterday.

**Daily loop - target � 7 minutes**

| Step | Time | Surface | State |
|---|---|---|---|
| 1. Read morning brief (what moved, what agents drafted overnight, one decision) | 2m | New `MorningBrief`, first viewport | **Missing** |
| 2. Clear approval queue - approve / edit / reject | 3m | New `ApprovalQueue` | **Missing** |
| 3. Publish approved (one click, server-gated) | 30s | `WebhookPublisher`, rebuilt | Exists, ungated |
| 4. Log yesterday's post numbers | 1m | `PostPerformanceTracker` | **Shipped** (`post_performance_log`) |
| 5. Glance at north star | 30s | `AgencyControlTower` + `ActivationInstrument` | **Shipped** |

Steps 1-2 do not exist. That is the daily loop, and it is the whole gap.

**Weekly loop (Sunday) - target � 25 minutes**

| Step | Surface | State |
|---|---|---|
| Review week: activations, cohort rate, channel mix | `SundayScorecard` + `#proof` | **Shipped** |
| Performance agent's "double down / kill" read | `analytics_summary` | **Shipped** |
| Competitive agent's gap read | `competitor_analysis` | **Shipped** |
| **Approve next week's plan** (7 slots, drafted Saturday) | New `WeekPlan` view | **Missing** |
| Paste scorecard into week doc | `SundayScorecardClient` | **Shipped** |

`lib/admin/marketing-command.ts:412` already has `isSundayInNy()` and re-orders Today CTAs on Sunday - the weekly-rhythm concept exists. What is missing is the **week plan generator**: Sunday produces a *report* but not a *commitment*.

---

## 2. Information architecture

### Problem with today's order

`page.tsx:450-716` renders: `PageHeader`  `MarketingTodayStrip`  `AttentionStrip`  `AgencyControlTower` (10-card grid)  `ActivationInstrument`  `MetricRail`  8 `QUICK_ACTIONS` buttons  `AgencyDesks` (10 tabs)  `#proof`  `#owned`.

Before the first desk: **four status surfaces and eleven navigation targets**. Every one answers "here is how things are"; none answers "here is what to do next." That is the signature of an admin page that is dense but not *operable*, and the most likely source of "not exceptional." Density is not premium; **decidability** is.

Also: all 10 desk panels render server-side and ship in the HTML, toggled only by `hidden` (`AgencyDesks.tsx:95-108`) - ten panels of markup per load for one visible desk.

### Proposed first viewport - three surfaces, one job

```
�������������������������������������������������������������Ŀ
� PageHeader - "Marketing Agency"                             �
�������������������������������������������������������������Ĵ
� MORNING BRIEF                                    [dismiss]  �   NEW
� "3 unique activated (7d, +1). Content drafted Mon/Wed.      �
�  Email blocked: Resend key missing."                        �
�  ONE DECISION: approve Monday's post or rewrite the hook.   �
�������������������������������������������������������������Ĵ
� APPROVAL QUEUE (4)           � NORTH STAR                   �   queue NEW
� ? Mon post � LinkedIn        �   3  unique activated � 7d   �
� ? Wed post � LinkedIn        �   4  completions             �
� ? Drip step 2 � email        �   cohort 3/11 (27%)          �
� ? Image brief � Mon          �   ???�???  30d               �
�   [Approve] [Edit] [Reject]  �                              �
�������������������������������������������������������������Ĵ
� Fleet strip - 10 dots, collapsed. Expands to today's grid.  �   demoted
���������������������������������������������������������������
```

Rules:
- **First viewport answers "what do I decide right now?"** - never "how are things?"
- The 10-card fleet grid demotes to a **one-line dot strip**. It is a beautiful component (`AgencyControlTower.tsx:95-116`) occupying prime real estate to say what the founder already knows. Expand-on-click retains it.
- `AttentionStrip` merges *into* the brief. Two attention systems above the fold is one too many.
- `QUICK_ACTIONS` (8 ghost buttons, `marketing-command.ts:82`)  `PageHeader` overflow menu. Eight equal-weight buttons is the visual definition of "no priority."
- `#proof` / `#owned` (~340 lines of always-expanded charts) become the **Analytics desk**. Review surfaces, not daily surfaces.

### Desk model

Keep the 10 desks - the taxonomy in `lib/admin/agency-fleet.ts:32-113` maps cleanly to a real agency org chart. Two changes:
1. **Lazy-mount** via `next/dynamic` keyed off `active`.
2. **Default tab follows the queue.** `AgencyDesks.tsx:35` hardcodes `useState("desk-content")`; it should open the desk owning the oldest pending approval.

---

## 3. Agent architecture

### Today

`agency-fleet.ts:27-28` defines `aiActions: string[]` on `AgencyAgent`. **Nothing dispatches from that field** - it is documentation. Desks call `/api/admin/marketing-ai` directly from client components with hand-built payloads. No run, no schedule, no memory, no output artifact, no autonomy concept.

### Proposed: autonomy tier on the agent record

```ts
// lib/admin/agency-fleet.ts - additive to AgencyAgent
autonomy: "auto" | "gated" | "manual";
```

| Tier | Meaning | Agents |
|---|---|---|
| `auto` | Scheduled; writes only to admin surfaces. Output never public. | Strategy (brief), Audience (insight), Performance (weekly read) |
| `gated` | Scheduled; writes **drafts** into the queue. Cannot publish. | Content, Calendar, Email, Competitive |
| `manual` | Runs only on founder click. | Publish, Guardrails, Library |

The invariant that makes the metaphor real:

> **`auto` agents may write to the admin surface. Only `gated` agents create drafts. Only the founder moves a draft to `approved`. Only `approved` assets publish. There is no code path from a model completion to an external POST that does not pass through a human `approved_by`.**

### Never auto-post - enforced, not documented

1. Any social copy, all platforms.
2. Any email to a real recipient - `00033_campaigns.sql:24` (`draft|sending|sent`) already has no auto-send path. Keep it.
3. Any competitor-derived copy (7 - prompt-injection surface).
4. Anything the claim-law strip flagged, even if cleaned: `flagged` non-empty  approval requires explicit second confirm.

### Approval queue - the missing spine

```
draft ��? in_review ��? approved ��? published
   �           �
   ���������������? rejected
```

Only `approved  published` may call an external endpoint, enforced server-side, not by a disabled button.

### Agent memory

Every generation is amnesiac today. `SocialContentStudio.tsx:46` caps `history` at 5 in React state, lost on reload. Persisting approvals gives every agent a corpus for free: **"here are 12 posts the CEO approved and 4 they rejected"** in the prompt converges the Content agent on the founder's voice within weeks. This is the highest-value downstream effect of P0 and the reason to build the spine first.

---

## 4. Data model - Supabase vs localStorage

### Current split (verified)

| Data | Store | File |
|---|---|---|
| Post performance log | **Supabase** `post_performance_log` | `20260812200000_post_performance_log.sql` |
| Campaigns + sends | **Supabase** | `00033_campaigns.sql` |
| Content calendar board | localStorage `homi-content-calendar` | `ContentCalendar.tsx:46` |
| Theme calendar + notes | localStorage `homi-theme-calendar`, `homi-theme-cal-notes` | `ThemeCalendar.tsx:68-79` |
| Competitor log + URLs | localStorage `homi-competitor-log`, `homi-competitor-urls` | `CompetitorPulse.tsx:65-83` |
| Buffer / Make webhook URLs | localStorage | `WebhookPublisher.tsx:159-160` |
| Generated posts, captions, briefs, drips | **Nowhere** - React state only | `SocialContentStudio.tsx:46` |

### Decision rule

Persist to Supabase when the data is **evidence** (something happened, someone decided, a number was true). Keep local when it is **preference or a third-party secret**.

| Data | Target | Rationale |
|---|---|---|
| Generated assets + approval state | **Supabase** (`marketing_assets`) | Evidence. Also the agent-memory corpus. |
| Content calendar entries | **Supabase** | A plan the founder committed to; cross-device; feeds week-plan agent. |
| Competitor log | **Supabase** | Hand-gathered intel, expensive to lose. `COMPETITOR_LOG_MAX = 50` (`marketing-agency.ts:1490`) exists only because of localStorage quota. |
| Agent run log | **Supabase** | Cost, latency, model, flagged. Currently only `console.log` (`marketing-ai/route.ts:286`). |
| Theme calendar offset + notes | **localStorage** | UI preference. Correctly placed. |
| **Buffer / Make webhook URLs** | **localStorage - do not move** | The comment at `WebhookPublisher.tsx:134-140` is right: bearer credential for someone else's account. P0 must not break this. |

### `marketing_assets` sketch

```sql
create table if not exists marketing_assets (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  kind           text not null,   -- post | caption | image_brief | drip_step | brief | week_plan
  platform       text,            -- linkedin | x | instagram | threads | email | null
  status         text not null default 'draft',
  body           text not null,
  hashtags       text[] not null default '{}',
  utm_campaign   text,
  source         text not null,   -- model | template (mirrors the API response field)
  model          text,
  flagged        text[] not null default '{}',
  claim_law_rev  int not null default 1,
  created_by     uuid references auth.users (id) on delete set null,
  approved_by    uuid references auth.users (id) on delete set null,
  approved_at    timestamptz,
  published_at   timestamptz,
  publish_target text,            -- buffer | make
  publish_status int,
  agent_id       text,            -- AgencyAgentId
  parent_id      uuid references marketing_assets (id) on delete set null
);
```

RLS: copy `post_performance_log` exactly - `enable` + `force`, single `for all to authenticated using (is_admin()) with check (is_admin())`, `grant . to authenticated`, `revoke all from anon`. Proven in this repo and avoids the `profiles` RLS recursion the migration comment warns about (`20260812200000_post_performance_log.sql:15-17`).

### Also: kill the 10k sample cap

`page.tsx` pulls up to `MARKETING_SAMPLE_CAP = 10_000` rows and aggregates in JS. The page already warns about it (`page.tsx:379-388`, "Move to server-side aggregates soon"). A Postgres RPC returning the daily unique-activated series removes the cap, deletes the `sample-cap` attention item, and cuts latency. Not urgent at current volume - scheduled P2, before it becomes a wrong-numbers incident.

---

## 5. AI action map

### Shipped - 9 actions (`app/api/admin/marketing-ai/route.ts:195-205`)

| Action | Agent | Prompt / template pair |
|---|---|---|
| `generate_post` | Content | `buildPostPrompt` / `templatePost` |
| `caption` | Content | `buildCaptionPrompt` / `templateCaption` |
| `image_brief` | Content | `buildImageBriefPrompt` / `templateImageBrief` |
| `repurpose` | Content | `buildRepurposePrompt` / `templateRepurpose` |
| `audience_insight` | Audience | `buildInsightPrompt` / `templateInsight` |
| `scorecard_summary` | Strategy | `buildScorecardSummaryPrompt` / `templateScorecardSummary` |
| `analytics_summary` | Performance | `buildAnalyticsPrompt` / `templateAnalyticsSummary` |
| `drip_sequence` | Email | `buildDripStepPrompt` / `templateDripSequence` |
| `competitor_analysis` | Competitive | `buildCompetitorPrompt` / `templateCompetitorAnalysis` |

**This library is the best part of the system.** Every action has a deterministic template twin, every completion passes `stripNeverSay` server-side and again client-side, and a claim-law failure falls back to the template rather than erroring (`route.ts:50-62`). Graceful degradation is designed in, not bolted on. Preserve the template-twin discipline for every new action.

### Missing

| Action | Agent | Trigger | Why |
|---|---|---|---|
| `morning_brief` | Strategy | **Cron, daily** | Entry point of the daily loop. Metrics + queue depth + fleet status  3 sentences + one decision. |
| `week_plan` | Calendar | **Cron, Saturday** | Turns the Sunday *report* into a *commitment*: 7 slots with topic, theme, campaign, drafted into the queue. |
| `hook_variants` | Content | Manual, from queue | Reject-and-retry should be one click with 3 alternatives. |
| `rewrite_from_feedback` | Content | Manual, from queue | "Too corporate"  regenerate with the note. **Highest-leverage action for the daily loop** - without it, "Edit" means the founder writes it themselves and the agent contributed nothing. |
| `voice_check` | Guardrails | Auto on draft create | Scores a draft against `FOUNDER_VOICE.md` + approved corpus. Guardrails has zero AI actions today (`agency-fleet.ts:103`) despite being the compliance agent. |

### Two cross-cutting notes

- **Model tiering.** `MODEL` is hardcoded to `claude-haiku-4-5-20251001` (`route.ts:64`). Right for captions and hashtags; wrong for the morning brief and week plan, the two artifacts the founder actually reasons from. Make `MODEL` a per-action lookup.
- **Cron auth is already solved.** `app/api/cron/reassessment/route.ts:31-36` has the exact pattern - `CRON_SECRET` + `safeSecretEquals` on the `authorization` header, `503` when service role is unconfigured. Copy verbatim; add entries to `vercel.json` (currently 2 crons).

---

## 6. Premium UX principles

Direction A ("Cockpit Linear") is established: `OperateInstrument` with `--instrument-tint`, `dash-instrument` / `dash-instrument-inner`, `MetricRail`, `score-numeral`, `.glass`, `eyebrow`. Six rules to keep additions inside it:

1. **Decidability over density.** Every surface answers *what do I decide* or *how are things* - never both, and the fold belongs to the first kind. This is the rule the current first viewport breaks.
2. **One tint per surface.** `OperateInstrument` takes a single `tint` from worst status (`AgencyControlTower.tsx:41-46`). Do not add a second accent inside an instrument.
3. **Numbers carry provenance.** Already strong: `source: "model" | "template"` on every response, `flagged[]` surfaced rather than hidden, cohort rate suppressed under n=5 (`marketing-metrics.ts:88-96`), the sample-cap warning. **Extend to the queue** - every pending item shows which agent drafted it, which model, what the strip removed.
4. **State, not decoration, earns motion.** No animation that does not encode a transition.
5. **Empty states are instructions.** Existing ones are good ("No webhooks configured. Open settings to paste a Buffer or Make URL.", `WebhookPublisher.tsx:264`). Hold that bar.
6. **Anti-slop test.** Before shipping any new panel: Does it tell the founder something the number next to it doesn't? Would a competent human agency employee produce this artifact? If the AI key were removed, does the panel still do useful work? (Template twins already answer yes for all 9 actions.)

**The specific slop risk in this plan is the morning brief.** A daily AI summary is where admin dashboards most often go from premium to noise, degrading into "engagement is up! keep it up!" Mitigations: hard 3-sentence cap; exactly one named decision with a link; when nothing changed the brief must say *"Nothing moved. Yesterday's decision is still open."* rather than manufacture narrative. Make that a template-twin constraint, not just a prompt instruction.

---

## 7. Security & claim law under agent pressure

### Already right

- Admin gate on every AI call: `requireAdmin()` checks `profiles.role === 'admin'` (`route.ts:67-84`).
- Rate limit 20/min per IP **+ admin id** - the comment at `route.ts:309-310` explains the id is appended so two admins behind one NAT don't exhaust each other. Considered, not cargo-culted.
- Zod discriminated union over all 9 actions with tight per-field bounds (`route.ts:86-205`).
- `stripNeverSay` server-side **and** client-side, with rationale documented: server is authoritative, client keeps a cached response honest (`route.ts:56-61`).
- **Fail-closed on claim law**: if the strip empties the copy, the route returns the deterministic template (`route.ts:386-387` and every sibling). A prohibited phrase cannot become publishable text.
- `isValidWebhookUrl` restricts publish targets to https (`marketing-agency.ts:1819`).

Above the bar for a solo-founder admin surface. The gaps below are specific to *adding agency*.

**Gap 1 - competitor text is untrusted input reaching a model whose output gets published.** `CompetitorPulse` takes hand-typed competitor hooks  `buildCompetitorPrompt`  model  `recommendations` shown as things to post. A competitor's LinkedIn hook is attacker-controlled text. `stripNeverSay` is a **denylist** (`NEVER_SAY_PHRASES`, `marketing-agency.ts:145`) - it catches phrasings you predicted. Injected output can be off-brand, defamatory, or claim-adjacent without matching any listed phrase. Mitigations: delimit competitor text as data in the prompt; mark output `kind='competitor_derived'` and force the second-confirm path regardless of `flagged`; never skip the queue. Same applies to imported LinkedIn CSV (`parseLinkedInAnalytics`  `buildAnalyticsPrompt`), smaller blast radius.

**Gap 2 - publishing leaves no record.** `postToWebhook` is a browser `fetch` to a third-party URL (`WebhookPublisher.tsx:40-53`). Nothing records what was sent, when, or by whom. If claim-law-violating copy ever reaches LinkedIn, there is no way to establish what shipped or which claim-law revision it passed. For a "not a lender / not a credit score replacement" product, that ledger is a regulatory-posture asset, not just observability. P0 fixes this as a side effect.

**Gap 3 - claim law is unversioned.** `NEVER_SAY_PHRASES` will grow. `claim_law_rev` on `marketing_assets` makes "re-review everything approved before the rule changed" a query instead of archaeology.

**Gap 4 - cron routes are unauthenticated agent surface.** New crons must use `CRON_SECRET` + `safeSecretEquals` (`reassessment/route.ts:31-36`), and a cron-invoked agent must write `created_by = null`, `status = 'draft'`. **A cron must never produce an `approved` row.** Encode as a `check` constraint so it holds even if a future route forgets.

---

## 8. Phased PR plan

### P0 - The approval spine (unblocks everything; do not reorder)

| File | Change |
|---|---|
| `supabase/migrations/<ts>_marketing_assets.sql` | **New.** Table per 4. RLS copied from `20260812200000_post_performance_log.sql`. Constraint: `created_by is null` (cron) rows cannot have `status='approved'`. |
| `lib/admin/agency-approvals.ts` | **New.** Pure helpers - `canTransition(from, to)`, `requiresSecondConfirm(asset)`, `queueDepth()`. Co-located `.test.ts`. |
| `app/api/admin/marketing-assets/route.ts` | **New.** `POST` create draft, `PATCH` transition. `requireAdmin()` + rate limit copied from `marketing-ai/route.ts:67-84,309-320`. Re-runs `stripNeverSay` on approve - fail closed. |
| `app/api/admin/marketing-publish/route.ts` | **New.** Accepts `{ assetId, webhookUrl }`. **Refuses unless `status === 'approved'`.** Records `published_at`, `publish_target`, `publish_status`. |
| `components/admin/WebhookPublisher.tsx` | Rewrite `postToWebhook` to call the route above. **The URL still comes from localStorage and is passed through** - preserves the "not a secret in a shared table" rationale at `:134-140` while moving the gate server-side. |
| `components/admin/SocialContentStudio.tsx` | On generate, `POST` a `draft` row. Replace in-memory `history` (`:46`) with queue-backed history. |
| `components/admin/ApprovalQueue.tsx` | **New.** Approve / Edit / Reject. Shows agent, model, `source`, `flagged`. |
| `app/(product)/admin/marketing/page.tsx` | Query pending assets; render `ApprovalQueue` in the first viewport. |

**Exit criterion:** grep proves no client-side path from model output to an external POST.

### P1 - Agents that run on their own

| File | Change |
|---|---|
| `app/api/cron/marketing-brief/route.ts` | **New.** Daily. `CRON_SECRET` pattern from `reassessment/route.ts:31-36`. Writes `kind='brief'`. |
| `app/api/cron/marketing-week-plan/route.ts` | **New.** Saturday. Drafts 7 slots into the queue. |
| `vercel.json` | Add both crons. |
| `lib/admin/marketing-agency.ts` | Add `buildMorningBriefPrompt`/`templateMorningBrief`, `buildWeekPlanPrompt`/`templateWeekPlan`, `buildRewritePrompt`/`templateRewrite`. **Template twin required for each.** |
| `app/api/admin/marketing-ai/route.ts` | Add `morning_brief`, `week_plan`, `rewrite_from_feedback`, `hook_variants` to `bodySchema` (`:195-205`). Replace the `MODEL` constant (`:64`) with a per-action lookup. |
| `lib/admin/agency-fleet.ts` | Add `autonomy` to `AgencyAgent`. Extend `FleetSignals` with `pendingApprovals`, `lastRunAt`. `evaluateFleet` returns `needs_you` when the queue is non-empty. |
| `components/admin/MorningBrief.tsx` | **New.** First viewport, above the queue. |

### P2 - Durability + honest numbers

| File | Change |
|---|---|
| `supabase/migrations/<ts>_marketing_calendar.sql` | **New.** `marketing_calendar_entries`, `marketing_competitor_log`. |
| `supabase/migrations/<ts>_marketing_aggregates.sql` | **New.** RPC for the daily unique-activated series - removes `MARKETING_SAMPLE_CAP` client aggregation. |
| `components/admin/ContentCalendar.tsx`, `CompetitorPulse.tsx` | Read/write via routes. Keep `parseStoredCalendar` / `parseStoredCompetitorLog` for one-time localStorage import. |
| `app/(product)/admin/marketing/page.tsx` | Use the RPC; delete the `sample-cap` attention item (`:379-388`). |
| `ThemeCalendar.tsx`, `WebhookPublisher.tsx` | **Unchanged** - correctly local. |

### P3 - Premium chrome + agent memory

| File | Change |
|---|---|
| `app/(product)/admin/marketing/page.tsx` | Re-order per 2: brief + queue + north star above the fold; fleet grid collapsed; `QUICK_ACTIONS`  `PageHeader` overflow; `#proof`/`#owned`  Analytics desk. |
| `components/admin/AgencyDesks.tsx` | Lazy-mount panels; default tab follows oldest pending approval instead of hardcoded `"desk-content"` (`:35`). |
| `components/admin/AgencyControlTower.tsx` | Collapsed dot strip; per-agent last-run / last-output / next-action. |
| `supabase/migrations/<ts>_marketing_agent_runs.sql` | **New.** Run ledger - model, tokens, latency, flagged. Replaces `console.log` at `route.ts:286`. |
| `lib/admin/marketing-agency.ts` | Feed approved/rejected corpus into `buildPostPrompt` - voice convergence. |

---

## 9. Open questions for the founder

1. **Should any agent publish without approval, ever?** Design says no. If you want one exception (e.g. an approved evergreen reposting on schedule), it changes the P0 schema - say so now.
2. **Morning brief delivery - in-app only, or email/push?** `sendTemplateEmail` (`lib/email/send`) already works. In-app is the assumption.
3. **Cost ceiling for autonomous runs?** Daily brief + weekly plan on Haiku is pennies/month. Routing the brief to a stronger model is still cheap but is a standing charge.
4. **Does the week plan draft posts, or only slots?** Seven full posts every Saturday makes Sunday a 7-item queue. Recommendation: slots-only first, measure whether you want the drafts.
5. **How long do rejected assets live?** They are your most valuable training signal (they encode what is *not* your voice). Recommendation: keep indefinitely, surface never.
6. **Multi-admin?** Everything assumes one CEO. `approved_by` is already there, but "who may approve" becomes a policy question if a second admin exists.
7. **Do you want the fleet grid demoted?** 2 recommends collapsing it; it is the most visually striking thing on the page. Taste call, and it is yours - the recommendation is on decidability grounds.

---

## 10. Key decisions & rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | **Approval spine (P0) before new agents or UI.** | Everything compounds on a persisted asset with a lifecycle: agent memory, publish ledger, queue-driven IA, claim-law versioning. Adding agents first produces more ungoverned text. |
| D2 | **Approval enforced server-side, not by a disabled button.** | "Nothing ships without CEO eyes" is a claim the product makes publicly. It must survive a bug, a stale client, and a future refactor. |
| D3 | **Webhook URLs stay local; the *gate* moves server-side.** | The rationale at `WebhookPublisher.tsx:134-140` is correct - a bearer credential for a third-party account. Passing it per-request preserves that while making the gate authoritative. |
| D4 | **Template twin for every new action.** | Nine actions degrade gracefully with no API key. It is why the studio is never a dead button, and the strongest engineering property in this subsystem. |
| D5 | **Demote the fleet grid; promote the queue.** | The fold should answer "what do I decide." Four status surfaces before the first actionable control is the specific reason the page reads as dense rather than exceptional. |
| D6 | **Cron agents produce only drafts - enforced by DB constraint.** | An unauthenticated-by-session surface that can create `approved` rows is one refactor from an auto-publishing agent. |
| D7 | **Competitor-derived output always takes the second-confirm path.** | Only place attacker-controlled text reaches a model whose output is meant for publication. `stripNeverSay` is a denylist and will not catch novel off-brand output. |
| D8 | **Version claim law (`claim_law_rev`).** | The rule set will grow. Without a stamp, "re-review everything approved under the old rules" is not a query you can run. |
| D9 | **Per-action model tiering.** | Haiku is correct for captions. The brief and week plan are what the founder reasons from - that is where quality is worth the spend. |
| D10 | **Keep the 10-desk taxonomy.** | It maps cleanly to a real agency org chart; the mandates in `agency-fleet.ts:32-113` are well written. The taxonomy was never the problem. |

---

## 11. Risks & failure modes

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Queue fatigue.** Agents draft faster than the founder approves; the queue becomes a guilt pile and the page gets avoided. | **High** | High | Cap gated agents at N drafts/day. Auto-expire after 7 days. Show queue *age*, not just depth. Slots-only week plans first (Q4). |
| R2 | **Morning brief becomes slop.** | **High** | Medium | 3-sentence hard cap; one named decision; template twin must emit *"Nothing moved"* when nothing moved. Most likely single point of "not exceptional" in the new work. |
| R3 | **Approval becomes rubber-stamping.** Gate is theatre. | Medium | **High** | Second-confirm on `flagged` or competitor-derived. Show the diff when edited. Do not build bulk-approve. |
| R4 | **Prompt injection via competitor log / CSV import.** | Low | **High** | 7 Gap 1 - delimit as data, mark derived, force second-confirm. |
| R5 | **localStorage migration loses hand-entered data.** | Medium | Medium | Import-on-first-load with existing parsers; never clear the key after import; read-both/write-both for one release. |
| R6 | **Cron cost drift.** First thing in this codebase that spends money with no human in the loop. | Medium | Low | Pull `marketing_agent_runs` forward if crons land before P3. Hard per-day run cap. |
| R7 | **Scope creep - building an agency instead of a product.** 10 desks, 13 AI actions, 4 crons, 5 tables for a pre-launch product with a single-digit north star. | **High** | **High** | North star is *unique activated users*, not agency completeness. Gate P2/P3 on the daily loop being used two consecutive weeks. **If the founder is not clearing a queue daily, more agents is the wrong build.** |
| R8 | **Claim-law regression under growth pressure.** | Low | **Severe** | Already well defended (fail-closed + double strip). P0 adds the audit ledger, D8 adds versioning. Do not weaken `stripNeverSay` to reduce false positives - accept template fallback instead. |

**R7 is the risk worth the founder's attention.** The engineering is sound and the taxonomy is good, but this subsystem is already large relative to a product with a single-digit north star. P0 is justified because it makes a claim the product already makes true. P1 is justified because it creates the daily loop. **P2 and P3 should be earned by evidence the loop is being run**, not scheduled in advance.

---

*Files read: `app/(product)/admin/marketing/page.tsx`, `lib/admin/agency-fleet.ts`, `lib/admin/marketing-metrics.ts`, `lib/admin/marketing-command.ts`, `lib/admin/marketing-agency.ts` (export surface), `app/api/admin/marketing-ai/route.ts`, `components/admin/{AgencyControlTower,AgencyDesks,WebhookPublisher,SocialContentStudio,SundayScorecard}.tsx`, `components/operate/OperateInstrument.tsx`, `supabase/migrations/{00033_campaigns,20260812200000_post_performance_log}.sql`, `app/api/cron/reassessment/route.ts`, `vercel.json`, plus a localStorage sweep across `components/`.*

---

## Executive summary

1. **Blocked on tooling:** Write is disabled this session; `docs/design/agency-os-claude-review.md` was not created. Content above is complete and ready to paste.
2. The page renders three claims about itself - "agents run the work," "nothing public without CEO eyes," "approve before it ships" - and **none is enforced by any code**.
3. `evaluateFleet()` (`agency-fleet.ts:135`) is a pure label renderer over 8 signals. No agent runs, schedules, remembers, or produces an artifact.
4. `aiActions` on the agent record (`agency-fleet.ts:27`) is documentation - nothing dispatches from it.
5. **There is no approve action anywhere in the codebase.** No draft/approved/published state exists.
6. `WebhookPublisher.tsx:40-53` POSTs to Buffer/Make from the browser, ungated and unrecorded. No ledger of what ever shipped.
7. Generated posts live in React state capped at 5 (`SocialContentStudio.tsx:46`) and are lost on reload - no agent memory, no voice convergence.
8. Calendar, theme notes, and competitor log are localStorage-only; only `post_performance_log` and `campaigns` reached Supabase.
9. No marketing cron exists - `vercel.json` has 2, both product lifecycle. No morning brief, no week plan.
10. **The genuinely excellent part:** 9 AI actions each with a deterministic template twin, `stripNeverSay` server + client, fail-closed to template on claim-law violation. Preserve that discipline.
11. `MODEL` is hardcoded Haiku (`route.ts:64`) - fine for captions, wrong for the brief and week plan.
12. First viewport shows four status surfaces and eleven nav targets before the first actionable control. Density, not decidability - the likeliest source of "not exceptional."
13. All 10 desk panels ship in the HTML on every load, toggled by `hidden`.
14. Security posture is above bar (admin gate, IP+id rate limit, tight Zod, https-only webhooks). Real gap: **competitor text is attacker-controlled input reaching a model whose output is meant for publication**, guarded only by a denylist.
15. Claim law is unversioned - no way to re-review assets approved under older rules.
16. **P0:** `marketing_assets` table + approval routes + server-gated publish. The webhook URL stays in localStorage and is passed through, preserving the existing (correct) secret-handling rationale.
17. **P1:** brief + week-plan crons using the proven `CRON_SECRET` pattern; add `rewrite_from_feedback` (highest-leverage missing action); autonomy tiers on the fleet.
18. **P2/P3:** localStorage  Supabase, server-side aggregates to kill the 10k cap, IA re-order, lazy desks, run ledger.
19. **Biggest risk (R7):** this subsystem is already large for a product with a single-digit north star. Gate P2/P3 on the daily loop actually being used.
20. **Second-biggest (R2):** the morning brief is where this goes from premium to slop. Hard 3-sentence cap, one named decision, and it must say "Nothing moved" rather than manufacture narrative.
