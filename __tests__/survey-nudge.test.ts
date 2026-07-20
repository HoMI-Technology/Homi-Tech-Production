import { describe, expect, it } from "vitest";
import {
  isNudgeEligible,
  pickOnePerUser,
  surveyNudgeCopy,
  type DueSurveyRow,
} from "@/lib/outcomes/survey-nudge";

const NOW = new Date("2026-07-20T12:00:00Z");

function row(overrides: Partial<DueSurveyRow>): DueSurveyRow {
  return {
    id: "s1",
    user_id: "u1",
    kind: "day30",
    due_at: "2026-07-19T12:00:00Z",
    completed_at: null,
    notified_at: null,
    ...overrides,
  };
}

describe("isNudgeEligible", () => {
  it("accepts a due, incomplete, un-notified survey", () => {
    expect(isNudgeEligible(row({}), NOW)).toBe(true);
  });

  it("rejects a survey not yet due", () => {
    expect(isNudgeEligible(row({ due_at: "2026-08-01T00:00:00Z" }), NOW)).toBe(false);
  });

  it("rejects a completed survey", () => {
    expect(isNudgeEligible(row({ completed_at: "2026-07-19T13:00:00Z" }), NOW)).toBe(false);
  });

  it("rejects an already-notified survey (dedup)", () => {
    expect(isNudgeEligible(row({ notified_at: "2026-07-19T15:00:00Z" }), NOW)).toBe(false);
  });

  it("rejects a malformed due_at rather than throwing", () => {
    expect(isNudgeEligible(row({ due_at: "not-a-date" }), NOW)).toBe(false);
  });
});

describe("pickOnePerUser", () => {
  it("collapses multiple due rows for one user to the earliest-due", () => {
    const rows = [
      row({ id: "late", due_at: "2026-07-19T12:00:00Z" }),
      row({ id: "early", due_at: "2026-06-01T12:00:00Z" }),
    ];
    const picked = pickOnePerUser(rows, NOW);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.id).toBe("early");
  });

  it("keeps one row per distinct user", () => {
    const rows = [row({ id: "a", user_id: "u1" }), row({ id: "b", user_id: "u2" })];
    expect(pickOnePerUser(rows, NOW)).toHaveLength(2);
  });

  it("drops ineligible rows entirely", () => {
    const rows = [
      row({ id: "done", completed_at: "2026-07-19T13:00:00Z" }),
      row({ id: "future", due_at: "2026-09-01T00:00:00Z" }),
    ];
    expect(pickOnePerUser(rows, NOW)).toHaveLength(0);
  });
});

describe("surveyNudgeCopy", () => {
  it("names the right day count per checkpoint", () => {
    expect(surveyNudgeCopy("day30").body).toContain("30 days");
    expect(surveyNudgeCopy("day90").body).toContain("90 days");
    expect(surveyNudgeCopy("day365").body).toContain("365 days");
  });

  it("has a title and body for every kind", () => {
    for (const kind of ["day30", "day90", "day365"] as const) {
      const copy = surveyNudgeCopy(kind);
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.body.length).toBeGreaterThan(0);
    }
  });
});
