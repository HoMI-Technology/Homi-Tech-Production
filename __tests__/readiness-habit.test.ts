import { describe, expect, it } from "vitest";
import {
  derivePathHabitStage,
  pathPendingStepCount,
  isPathReturnVisit,
  PATH_HABIT_FUNNEL_EVENTS,
  type ReadinessPath,
} from "@/lib/readiness";

function samplePath(
  overrides: Partial<ReadinessPath> & {
    stepStatuses?: Array<"pending" | "done" | "skipped">;
  } = {},
): ReadinessPath {
  const statuses = overrides.stepStatuses ?? ["pending", "pending"];
  const { stepStatuses: _s, ...rest } = overrides;
  return {
    id: "t1",
    version: 1,
    createdAt: new Date().toISOString(),
    assessmentCompletedAt: new Date().toISOString(),
    verdict: "NOT_YET",
    score: 42,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    mode: "build",
    calendarCommittedAt: null,
    steps: statuses.map((status, i) => ({
      id: `s${i}`,
      title: `Step ${i + 1}`,
      kind: "deadline" as const,
      daysFromNow: 3,
      reasonCode: "RUNWAY_UNDER_1_MONTH" as const,
      href: "/tools/runway",
      notes: "",
      fundingTarget: null,
      fundingLabel: null,
      status,
      completedAt: status === "done" ? new Date().toISOString() : null,
    })),
    ...rest,
  };
}

describe("derivePathHabitStage", () => {
  it("returns no_path for null", () => {
    expect(derivePathHabitStage(null)).toBe("no_path");
  });

  it("returns ready_optional for optional mode", () => {
    expect(derivePathHabitStage(samplePath({ mode: "ready_optional" }))).toBe("ready_optional");
  });

  it("returns path_pending_first when nothing done", () => {
    expect(derivePathHabitStage(samplePath({ stepStatuses: ["pending"] }))).toBe(
      "path_pending_first",
    );
  });

  it("returns path_in_progress when partial", () => {
    expect(derivePathHabitStage(samplePath({ stepStatuses: ["done", "pending"] }))).toBe(
      "path_in_progress",
    );
  });

  it("returns path_complete when all done", () => {
    expect(derivePathHabitStage(samplePath({ stepStatuses: ["done", "skipped"] }))).toBe(
      "path_complete",
    );
  });
});

describe("pathPendingStepCount / isPathReturnVisit", () => {
  it("counts pending steps", () => {
    expect(pathPendingStepCount(samplePath({ stepStatuses: ["done", "pending", "pending"] }))).toBe(
      2,
    );
  });

  it("detects return visit after min days on incomplete path", () => {
    const old = samplePath({
      stepStatuses: ["pending"],
      createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    });
    expect(isPathReturnVisit(old, 1)).toBe(true);
    expect(isPathReturnVisit(old, 7)).toBe(false);
  });

  it("does not count complete paths as return habit", () => {
    const old = samplePath({
      stepStatuses: ["done"],
      createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    });
    expect(isPathReturnVisit(old, 1)).toBe(false);
  });
});

describe("PATH_HABIT_FUNNEL_EVENTS", () => {
  it("is ordered generate → impression → page → start → first done", () => {
    expect([...PATH_HABIT_FUNNEL_EVENTS]).toEqual([
      "path_generated",
      "path_habit_impression",
      "path_page_viewed",
      "path_start_step_clicked",
      "path_first_step_done",
    ]);
  });
});
