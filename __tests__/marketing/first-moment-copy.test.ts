/**
 * First Moment beats and primary-close constants stay character-exact.
 */
import { describe, expect, it } from "vitest";
import {
  ACCOUNT_THEN_ASSESSMENT_HREF,
  CONTINUE_ASSESSMENT_HREF,
  FIRST_MOMENT_BEAT_COUNT,
  FIRST_MOMENT_BEATS,
  FIRST_MOMENT_HANDOFF_LINE,
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL,
  PRIMARY_CLOSE_LABEL_HOME,
  SIGNED_IN_ASSESS_HREF,
} from "@/components/marketing/first-moment-copy";

const BANNED_PRIMARY_LABELS = [
  /get your score/i,
  /check my readiness/i,
  /see my verdict/i,
  /\bscore\b/i,
];

describe("First Moment — word-locked beats", () => {
  it("has exactly five beats — no sixth", () => {
    expect(FIRST_MOMENT_BEAT_COUNT).toBe(5);
    expect(FIRST_MOMENT_BEATS).toHaveLength(5);
    expect(FIRST_MOMENT_BEATS.map((b) => b.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it("locks each beat line character-for-character", () => {
    expect(FIRST_MOMENT_BEATS[0].line).toBe(
      "Most apps want you to buy. I want to know if you’re ready.",
    );
    expect(FIRST_MOMENT_BEATS[1].line).toBe(
      "I might tell you not yet. Not because I don’t want to help. Because I do.",
    );
    expect(FIRST_MOMENT_BEATS[2].line).toBe(
      "I look at three things: your finances, your feelings, your timing.",
    );
    expect(FIRST_MOMENT_BEATS[3].line).toBe("I’m a reflection tool, not a financial advisor.");
    expect(FIRST_MOMENT_BEATS[4].line).toBe(FIRST_MOMENT_HANDOFF_LINE);
    expect(FIRST_MOMENT_HANDOFF_LINE).toBe(
      "This takes about 5 minutes. You’ll need an account so the verdict stays yours.",
    );
  });

  it("keeps the suggested mid-CTAs", () => {
    expect(FIRST_MOMENT_BEATS[0].cta).toBe("Let's find out");
    expect(FIRST_MOMENT_BEATS[1].cta).toBe("I understand");
    expect(FIRST_MOMENT_BEATS[2].cta).toBe("Show me where I stand");
    expect(FIRST_MOMENT_BEATS[3].cta).toBe("Got it");
    expect(FIRST_MOMENT_BEATS[4].cta).toBe("Create account");
    expect(FIRST_MOMENT_BEATS[4].continueCta).toBe("Continue");
  });

  it("does not revive the dead ‘No account needed yet’ line", () => {
    const blob = FIRST_MOMENT_BEATS.map((b) => `${b.line} ${b.cta}`).join(" ");
    expect(blob.toLowerCase()).not.toContain("no account needed yet");
  });
});

describe("primary marketing close", () => {
  it("labels the close Assess and sends signed-out users to First Moment", () => {
    expect(PRIMARY_CLOSE_LABEL).toBe("Assess");
    expect(PRIMARY_CLOSE_HREF).toBe("/first-moment");
    expect(SIGNED_IN_ASSESS_HREF).toBe("/assessment");
  });

  it("labels the landing hero/close cut See where you stand (audit fix 6)", () => {
    expect(PRIMARY_CLOSE_LABEL_HOME).toBe("See where you stand");
  });

  it("does not use banned primary labels", () => {
    for (const banned of BANNED_PRIMARY_LABELS) {
      expect(PRIMARY_CLOSE_LABEL).not.toMatch(banned);
      expect(PRIMARY_CLOSE_LABEL_HOME).not.toMatch(banned);
    }
  });

  it("hands off to account then 45-q — not results, not Shadow Score", () => {
    expect(ACCOUNT_THEN_ASSESSMENT_HREF).toBe("/auth/sign-up?next=/assessment");
    expect(CONTINUE_ASSESSMENT_HREF).toBe("/auth/sign-in?next=/assessment");
    for (const href of [ACCOUNT_THEN_ASSESSMENT_HREF, CONTINUE_ASSESSMENT_HREF]) {
      expect(href).not.toContain("/results");
      expect(href).not.toContain("/shadow-score");
    }
  });
});
