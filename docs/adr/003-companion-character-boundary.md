# Companion character: a product persona, not a second mark

**Status:** Proposed
**Date:** 2026-08-16

## Context

The Threshold Compass is the institutional mark. Its geometry is trade secret and
trademark, its usage is locked by [`CANON.md`](../../CANON.md) and the brand OS
(`07-threshold-compass-specification.md`, `08-logo-usage-rules.md`), and it renders on
25 product surfaces via [`components/brand/ThresholdCompass.tsx`](../../components/brand/ThresholdCompass.tsx).

The Companion is a different thing. [`COMPANION-ECOSYSTEM.md`](../../COMPANION-ECOSYSTEM.md)
line 3: **"The Companion is the mote. HōMI like homie — a friend."** It has its own
name, accent, presets, and voice rules, and it is already a separate entity from the
mark in code — [`lib/advisor/identity.ts`](../../lib/advisor/identity.ts) types it as
`HomiPreset` with `form: "compass" | "orb"`.

Five places forbid giving that entity a face:

| Source | Rule |
| ------ | ---- |
| `public/marketing/gtm/NEVER_SAY.md` | "No house photos / faces as brand identity." |
| `public/marketing/agency/05-CREATIVE-BRIEF.md` | Forbidden new work: "a mascot." Image brief: "Do not: faces as identity." |
| `13-image-generation-rules.md` (brand OS) | HOMI-IMAGE-026 no faces · -027 no hands or body parts · -030 abstract only |
| `components/companion/CompanionWidget.tsx:61` | "Abstract on purpose — no mascots." |
| `lib/advisor/identity.ts:44` | "no animals, no emoji, brand colors only" |

Six design sessions between 2026-08-15 and 2026-08-16 produced faced characters. The
founder rated all four variants in `companion-improve-faces-20260816` at **5/5** and
wrote, in `companion-improve-20260815`: *"this needs to have a face not just black
under a hood should be both male and female."* Every session self-flagged the collision
in its `approved.json` and marked itself `"status": "study"`. **Zero were ever
promoted.** The loop has run six times because there was no procedure to end it.

The prohibition is not taste. [`public/marketing/agency/01-NARRATIVE.md`](../../public/marketing/agency/01-NARRATIVE.md)
names "approval theater" as the enemy, and the visual signature of that category is a
smiling couple in front of a house. "No faces as brand identity" is positioning
encoded as a visual rule, and it is load-bearing.

Both positions are correct, because they are about different objects. The rule
protects **the brand**. The studies are about **the Companion**.

## Decision

**Two registers, permanently separated.**

**Register 1 — the institutional mark.** Threshold Compass and Wordmark. Governs
identity: what represents HōMI Technology in public, and every surface carrying a
score, a verdict, or a legal statement. Unchanged by this ADR.

**Register 2 — the Companion character.** A product persona that speaks in first
person to one user. **It is not a mark and may never function as one.**

**The boundary runs by job, not by product-versus-marketing.** The character belongs
where the job is **warmth and attention**. The mark stands alone wherever the job is
**authority** — anywhere a number, a verdict, or a legal statement appears. That line
does not move when the surface changes from product to campaign.

Rendered statement of the boundary:
`~/.gstack/projects/Homi-Tech-Production/designs/companion-boundary-20260816/board.png`.

The distinction is enforced by surface path, not by intent.

### Where a character MAY appear

Signed-in product only. Already structurally enforced:
`app/(product)/layout.tsx` mounts `{user && <CompanionHost />}`, so no Companion
surface renders for logged-out visitors or crawlers.

Within that, exactly **one** surface per pilot. See "Pilot surface" below.

### Where a character MUST NOT appear

Not style preferences. Each has a reason.

| Denied surface | Paths | Why |
| -------------- | ----- | --- |
| Verdict, score, and Path surfaces | `app/(product)/results`, `report/[id]/**`, `share/[token]`, `path`, `plan`, `components/results/ResultsVerdictView.tsx` | **Legal control.** Safety canon is *AI explains, deterministic code scores.* A face appearing to deliver a verdict inverts that, and a face reads as a person, which reads as a testimonial, which attaches FTC endorsement exposure to a product with an explicit no-advice floor. |
| Icons, OG, splash, manifest | `public/icon*`, `public/apple-touch-icon*`, `public/favicon.ico`, `public/splash/*`, `public/og*`, `app/opengraph-image.tsx`, `app/shadow/[token]/opengraph-image.tsx`, `app/manifest.ts` | These positions *are* the logo. Occupying them makes the character a mark. |
| Brand and press assets | `public/marketing/brand/**`, `public/marketing/launch/press-kit/**` | Same, and already distributed. |
| Campaign and social pixels | `public/marketing/content/**` | `NEVER_SAY.md` stands, unamended. This ADR does not touch marketing. |
| Legal pages | `app/(marketing)/legal/**` | A character on a disclaimer undercuts the disclaimer. |
| Any frame at logo scale or logo position | — | Never in the same frame as the mark at comparable visual weight. |
| Any generative-model output containing the rings | — | Tool line: image models never animate, redraw, reference, outpaint, reframe, or upscale a frame containing the compass. Composite the mark **after** all generative operations. |
| The classic `homi` preset | `lib/advisor/identity.ts` | `form: "compass"` stays the mark. A character is an addition, never a replacement. |

### Code seam

`lib/advisor/identity.ts` currently reads:

```ts
/** Visual form: the threshold compass, or a glowing orb in the accent color. */
form: "compass" | "orb";
```

A character is a third member of that union and one branch in the `HomiForm`
component in `CompanionWidget.tsx`. That is the entire surface area of the change,
which is what makes it cleanly revertible.

### Pilot surface — open, founder decides

The Companion picker is **closed by founder ruling**, twice on 2026-08-16:
`companion-rebuild-20260816/approved.json` sets `"hold_figure_in_presets": false`, and
the session brief states *"Hold and Figure stay OUT of presets."* This ADR does not
reopen it.

Remaining candidates, one to be chosen:

- **A. First-run identity moment.** The character appears once when the user names
  their HōMI, then recedes permanently to the mote. Highest emotional return, smallest
  footprint, never adjacent to a score.
- **B. `/twin` letter.** A personal letter is already a first-person format. But its
  output sits near readiness content, which brushes the verdict boundary.
- **C. Empty state only.** Lowest risk, lowest return.
- **D. Picker.** Closed. Listed so the record shows it was considered.

### Destination — top of funnel, after the pilot

Abstract navy geometry is beautiful and it does not stop a scroll. If the pilot earns
its evidence, the character extends to **masthead, film, and social** — the surfaces
whose job is attention and warmth. Two hard preconditions:

1. The 60-day pilot cleared its promotion gates.
2. Issue #241 is closed. Campaign execution is frozen while it is open.

Reaching the destination requires amending `NEVER_SAY.md`, `05-CREATIVE-BRIEF.md`, and
the brand-OS image rules **in the same commit**, per the amendment procedure in
`CANON.md`. The denied surfaces above do not change. A face never appears on a verdict,
a score, a Path surface, a report, a credential, a legal page, an icon, an OG image, or
a press logo — in the product or in a campaign.

## Consequences

- Two visual systems to maintain, permanently. A real and ongoing cost.
- The character can be retired without touching the mark, the rasters, the press kit,
  or any distributed asset. One type member, one branch, one commit.
- `NEVER_SAY.md`, `05-CREATIVE-BRIEF.md`, and the brand-OS image rules are
  **unamended** by this ADR and continue to govern marketing.
- Six sessions of existing study work become promotable instead of archived.
- `scripts/brand-check.mjs` should fail the build if a character asset path appears
  under any denied path above. Enforcement in code, not in review.
- `CompanionWidget.tsx:61` and `lib/advisor/identity.ts:44` carry "no mascots" comments
  that must be revised at pilot time, or they become stale law contradicting shipped
  code.

## Rejected alternatives

**Amend the doctrine outright (faces allowed everywhere).** Cheapest to execute,
highest strategic price. Spends the abstraction that separates HōMI from the category
`01-NARRATIVE.md` names as the enemy, and retroactively contradicts the live
`/guides/what-homi-is-not` hub. Rejected.

**Keep the prohibition absolute.** Honest, and it is the status quo. But it has
produced six rounds of 5/5-rated work that cannot ship, and it leaves a Companion
described as "a friend" with no way to feel like one. Rejected as a stable state.

**Ship a character without a boundary document.** The default path, and how mascot
creep starts: one surface, then an OG image "just once," then the favicon. Rejected.

**Full rebrand.** No qualifying condition applies. Named for the record.
