/**
 * The role x state half of post-login landing
 * (docs/design/post-login-home-direction.md §2).
 *
 * __tests__/post-login-destination.test.ts covers the original two-state
 * behaviour — explicit next, and scored vs unscored. This covers the states
 * layered on top of it: orientation, partner, employee, hard stop, staleness.
 *
 * These cases are the specification. If a row changes, the product's answer to
 * "where do I land?" changed, and that is a founder decision, not a refactor.
 */

import { describe, expect, it } from "vitest";
import {
  POST_LOGIN_ASSESS,
  POST_LOGIN_EMPLOYEE,
  POST_LOGIN_HOME,
  POST_LOGIN_ONBOARDING,
  POST_LOGIN_PARTNER,
  resolvePostLoginDestination,
  resolvePostLoginState,
  STALE_VERDICT_DAYS,
  verdictAgeDays,
  type PostLoginSignals,
} from "@/lib/auth/postLoginDestination";

const NOW = new Date("2026-08-27T12:00:00.000Z");
const DAY = 86_400_000;

/** An established user with a fresh, clean verdict — the S4 baseline. */
function signals(overrides: Partial<PostLoginSignals> = {}): PostLoginSignals {
  return {
    requestedNext: null,
    hasCompletedAssessment: true,
    role: "user",
    employerId: null,
    onboardingCompleted: true,
    employeeHomeSeen: true,
    hardStopCount: 0,
    scoredAt: new Date(NOW.getTime() - 2 * DAY).toISOString(),
    now: NOW,
    ...overrides,
  };
}

describe("post-login landing — extended states", () => {
  it("S1: someone who has never scored gets orientation once", () => {
    const s = signals({ onboardingCompleted: false, hasCompletedAssessment: false });
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_ONBOARDING);
    expect(resolvePostLoginState(s)).toBe("S1");
  });

  it("S1 does not fire for a First Moment signup who assessed before the account", () => {
    // onboarding_completed is still false, but they have a verdict. Sending
    // them back to "what HōMI is" would insult work already done.
    const s = signals({ onboardingCompleted: false });
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_HOME);
  });

  it("S1 outranks role — orientation comes before any workspace", () => {
    const s = signals({
      onboardingCompleted: false,
      hasCompletedAssessment: false,
      role: "partner",
    });
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_ONBOARDING);
  });

  it("S7: a partner lands on their book, not their own readiness", () => {
    const s = signals({ role: "partner" });
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_PARTNER);
    expect(resolvePostLoginState(s)).toBe("S7");
  });

  it("S7 holds even for a partner who has never scored", () => {
    expect(
      resolvePostLoginDestination(signals({ role: "partner", hasCompletedAssessment: false })),
    ).toBe(POST_LOGIN_PARTNER);
  });

  it("S8: an employee sees benefit context once, then the personal home", () => {
    const first = signals({ employerId: "org_1", employeeHomeSeen: false });
    expect(resolvePostLoginDestination(first)).toBe(POST_LOGIN_EMPLOYEE);
    expect(resolvePostLoginState(first)).toBe("S8");

    const second = signals({ employerId: "org_1", employeeHomeSeen: true });
    expect(resolvePostLoginDestination(second)).toBe(POST_LOGIN_HOME);
  });

  it("S3: an unscored account still goes to Assess, which also resumes a draft", () => {
    const s = signals({ hasCompletedAssessment: false });
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_ASSESS);
    expect(resolvePostLoginState(s)).toBe("S3");
  });

  it("S5: a hard stop is distinguished from a clean verdict, at the same href", () => {
    const s = signals({ hardStopCount: 2 });
    expect(resolvePostLoginState(s)).toBe("S5");
    expect(resolvePostLoginDestination(s)).toBe(POST_LOGIN_HOME);
  });

  it("S6: a verdict past the stale window is flagged rather than trusted", () => {
    const s = signals({ scoredAt: new Date(NOW.getTime() - (STALE_VERDICT_DAYS + 1) * DAY).toISOString() });
    expect(resolvePostLoginState(s)).toBe("S6");
  });

  it("S6 does not fire exactly at the boundary", () => {
    const s = signals({ scoredAt: new Date(NOW.getTime() - STALE_VERDICT_DAYS * DAY).toISOString() });
    expect(resolvePostLoginState(s)).toBe("S4");
  });

  it("S5 outranks S6 — a stop matters more than staleness", () => {
    const s = signals({
      hardStopCount: 1,
      scoredAt: new Date(NOW.getTime() - 400 * DAY).toISOString(),
    });
    expect(resolvePostLoginState(s)).toBe("S5");
  });
});

describe("post-login landing — non-routing roles", () => {
  // Both are in the design doc's table but are deliberately NOT landings:
  // "admin is a workspace, not a home", and a team view is aggregate-only.
  // Asserted so nobody later "completes the table" by adding a redirect.
  it("an admin lands on their personal home, reaching admin via the switcher", () => {
    expect(resolvePostLoginDestination(signals({ role: "admin" }))).toBe(POST_LOGIN_HOME);
  });

  it("an org member lands on their personal home, never a team aggregate", () => {
    const href = resolvePostLoginDestination(signals({ role: "user" }));
    expect(href).toBe(POST_LOGIN_HOME);
    expect(href).not.toContain("/team");
  });
});

describe("post-login landing — the extension is backward compatible", () => {
  // The original call shape must keep behaving exactly as it did, or every
  // caller that has not been taught the new signals silently changes meaning.
  it("degrades to the original two states when only the base signals are given", () => {
    expect(resolvePostLoginDestination({ requestedNext: null, hasCompletedAssessment: true })).toBe(
      POST_LOGIN_HOME,
    );
    expect(resolvePostLoginDestination({ requestedNext: null, hasCompletedAssessment: false })).toBe(
      POST_LOGIN_ASSESS,
    );
  });

  it("an explicit next still wins over every new state", () => {
    const s = signals({
      requestedNext: "/report/123",
      role: "partner",
      onboardingCompleted: false,
      hasCompletedAssessment: false,
    });
    expect(resolvePostLoginDestination(s)).toBe("/report/123");
    expect(resolvePostLoginState(s)).toBe("explicit");
  });

  it("a hostile next is still refused", () => {
    expect(resolvePostLoginDestination(signals({ requestedNext: "//evil.com" }))).toBe(
      POST_LOGIN_HOME,
    );
  });
});

describe("verdictAgeDays", () => {
  it("reads a missing or unparseable timestamp as fresh rather than stale", () => {
    expect(verdictAgeDays(null, NOW)).toBeNull();
    expect(verdictAgeDays(undefined, NOW)).toBeNull();
    expect(verdictAgeDays("not-a-date", NOW)).toBeNull();
  });

  it("counts whole days", () => {
    expect(verdictAgeDays("2026-08-20T12:00:00.000Z", NOW)).toBe(7);
  });
});
