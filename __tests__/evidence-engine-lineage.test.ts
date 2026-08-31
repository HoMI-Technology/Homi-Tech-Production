import { describe, expect, it } from "vitest";
import { assertSameUserLineage } from "@/lib/outcomes/lineage";
import { decisionStateFromLegacyOutcome } from "@/lib/outcomes/decision-state";
import { buildCheckpointSurveyRows } from "@/lib/outcomes/decision-snapshot";

describe("reassessment lineage", () => {
  it("rejects a missing prior assessment", () => {
    expect(assertSameUserLineage("u1", null)).toBe("missing");
  });

  it("rejects self-links", () => {
    expect(assertSameUserLineage("u1", { id: "a1", user_id: "u1" }, "a1")).toBe("self");
  });

  it("rejects cross-user links", () => {
    expect(assertSameUserLineage("u1", { id: "a0", user_id: "u2" })).toBe("cross_user");
  });

  it("accepts same-user prior without mutating it", () => {
    const prior = { id: "a0", user_id: "u1", verdict: "BUILD_FIRST" };
    expect(assertSameUserLineage("u1", prior, "a1")).toBeNull();
    expect(prior.verdict).toBe("BUILD_FIRST");
  });
});

describe("legacy outcome map", () => {
  it("maps moved/waited/lender_blocked without rewriting not_okay as waited", () => {
    expect(decisionStateFromLegacyOutcome("moved")).toBe("proceeded");
    expect(decisionStateFromLegacyOutcome("waited")).toBe("waited");
    expect(decisionStateFromLegacyOutcome("lender_blocked")).toBe("blocked_externally");
    expect(decisionStateFromLegacyOutcome("not_okay")).toBe("unknown");
    expect(decisionStateFromLegacyOutcome("no_answer")).toBeNull();
  });
});

describe("checkpoint schedule", () => {
  it("emits day30, day90, and day365 from the actual completed timestamp", () => {
    const rows = buildCheckpointSurveyRows({
      userId: "u1",
      assessmentId: "a1",
      completedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(rows.map((r) => r.kind)).toEqual(["day30", "day90", "day365"]);
    expect(rows[0]?.due_at).toBe("2026-01-31T00:00:00.000Z");
    expect(rows[1]?.due_at).toBe("2026-04-01T00:00:00.000Z");
    expect(rows[2]?.due_at).toBe("2027-01-01T00:00:00.000Z");
    expect(rows.every((r) => r.contact_state === "eligible")).toBe(true);
  });
});
