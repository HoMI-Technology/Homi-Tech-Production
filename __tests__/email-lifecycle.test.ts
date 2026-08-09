import { describe, it, expect } from "vitest";
import {
  latestPerUser,
  planReassessmentNudges,
  planOutcomeSurveys,
  type LifecycleAssessmentRow,
} from "@/lib/email/lifecycle";

const NOW = new Date("2026-07-16T12:00:00Z");

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function row(partial: Partial<LifecycleAssessmentRow> & { id: string }): LifecycleAssessmentRow {
  return { user_id: "u1", completed_at: daysAgo(31), is_shadow: false, ...partial };
}

describe("latestPerUser", () => {
  it("keeps only the newest completed assessment per user", () => {
    const rows = [
      row({ id: "old", user_id: "u1", completed_at: daysAgo(60) }),
      row({ id: "new", user_id: "u1", completed_at: daysAgo(5) }),
      row({ id: "other", user_id: "u2", completed_at: daysAgo(40) }),
    ];
    const latest = latestPerUser(rows);
    expect(latest.map((r) => r.id).sort()).toEqual(["new", "other"]);
  });

  it("ignores rows with no completed_at", () => {
    expect(latestPerUser([row({ id: "x", completed_at: null })])).toEqual([]);
  });
});

describe("planReassessmentNudges", () => {
  it("nudges when the latest assessment is 30+ days old", () => {
    const sends = planReassessmentNudges([row({ id: "a1", completed_at: daysAgo(31) })], NOW);
    expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({
      kind: "reassess30",
      assessmentId: "a1",
      dedupeKey: "reassess30:a1",
      daysSince: 31,
    });
  });

  it("does NOT nudge when a newer assessment reset the clock", () => {
    const sends = planReassessmentNudges(
      [
        row({ id: "stale", completed_at: daysAgo(45) }),
        row({ id: "fresh", completed_at: daysAgo(3) }),
      ],
      NOW,
    );
    expect(sends).toHaveLength(0);
  });

  it("stops nudging after the 14-day grace window (ledger owns dedupe inside it)", () => {
    expect(planReassessmentNudges([row({ id: "a", completed_at: daysAgo(29) })], NOW)).toHaveLength(
      0,
    );
    expect(planReassessmentNudges([row({ id: "b", completed_at: daysAgo(43) })], NOW)).toHaveLength(
      1,
    );
    expect(planReassessmentNudges([row({ id: "c", completed_at: daysAgo(44) })], NOW)).toHaveLength(
      0,
    );
  });
});

describe("planOutcomeSurveys", () => {
  it("invites at the 30/90/365 checkpoints", () => {
    const sends = planOutcomeSurveys(
      [
        row({ id: "d30", user_id: "u1", completed_at: daysAgo(30) }),
        row({ id: "d90", user_id: "u2", completed_at: daysAgo(91) }),
        row({ id: "d365", user_id: "u3", completed_at: daysAgo(370) }),
        row({ id: "d10", user_id: "u4", completed_at: daysAgo(10) }),
      ],
      NOW,
    );
    expect(sends.map((s) => s.kind).sort()).toEqual(["outcome30", "outcome365", "outcome90"]);
    expect(sends.find((s) => s.kind === "outcome30")?.dedupeKey).toBe("outcome30:d30");
  });

  it("excludes shadow assessments from the outcome dataset", () => {
    const sends = planOutcomeSurveys(
      [row({ id: "s", is_shadow: true, completed_at: daysAgo(30) })],
      NOW,
    );
    expect(sends).toHaveLength(0);
  });

  it("surveys every qualifying assessment, not just the latest per user", () => {
    const sends = planOutcomeSurveys(
      [
        row({ id: "first", user_id: "u1", completed_at: daysAgo(92) }),
        row({ id: "second", user_id: "u1", completed_at: daysAgo(31) }),
      ],
      NOW,
    );
    expect(sends.map((s) => s.assessmentId).sort()).toEqual(["first", "second"]);
  });
});
