/**
 * Packet A — First Moment + primary marketing close.
 * Beat lines are word-locked. Do not invent a sixth beat.
 * Warm “not yet” prose is allowed; verdict badges stay ADR-001
 * (enum NOT_YET, label DO NOT PROCEED) and do not appear here.
 */

export const PRIMARY_CLOSE_LABEL = "Assess";
export const PRIMARY_CLOSE_HREF = "/first-moment";

/**
 * Landing-page cut of the primary close (2026-08 audit fix 6): the homepage
 * hero and closing CTA read "See where you stand"; compact surfaces (site
 * header, product ramps, pricing) keep PRIMARY_CLOSE_LABEL. Same href, same
 * ?src= tracking — the label is the only difference.
 */
export const PRIMARY_CLOSE_LABEL_HOME = "See where you stand";

/** After beat 5: create account, then the 45-q assessment. */
export const ACCOUNT_THEN_ASSESSMENT_HREF = "/auth/sign-up?next=/assessment";

/** Existing account: sign in, then resume/start the 45-q. */
export const CONTINUE_ASSESSMENT_HREF = "/auth/sign-in?next=/assessment";

/** Signed-in primary close — Assess / resume 45-q, never Shadow Score. */
export const SIGNED_IN_ASSESS_HREF = "/assessment";

export const FIRST_MOMENT_HANDOFF_LINE =
  "This takes about 5 minutes. You’ll need an account so the verdict stays yours.";

export const FIRST_MOMENT_BEATS = [
  {
    id: 1,
    name: "Opening",
    line: "Most apps want you to buy. I want to know if you’re ready.",
    cta: "Let's find out",
  },
  {
    id: 2,
    name: "Inversion",
    line: "I might tell you not yet. Not because I don’t want to help. Because I do.",
    cta: "I understand",
  },
  {
    id: 3,
    name: "Promise",
    line: "I look at three things: your finances, your feelings, your timing.",
    cta: "Show me where I stand",
  },
  {
    id: 4,
    name: "Disclosure",
    line: "I’m a reflection tool, not a financial advisor.",
    cta: "Got it",
  },
  {
    id: 5,
    name: "Handoff",
    line: FIRST_MOMENT_HANDOFF_LINE,
    cta: "Create account",
    continueCta: "Continue",
  },
] as const;

export const FIRST_MOMENT_BEAT_COUNT = FIRST_MOMENT_BEATS.length;
