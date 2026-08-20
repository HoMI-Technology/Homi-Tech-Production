// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveReadinessPath, type ReadinessPath } from "@/lib/readiness";
import { PathNextMove } from "./PathNextMove";

vi.mock("@/lib/assessment/latest", () => ({
  fetchLatestStoredAssessment: vi.fn(async () => null),
}));

vi.mock("@/lib/readiness", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readiness")>("@/lib/readiness");
  return {
    ...actual,
    pullReadinessPath: vi.fn(async () => null),
  };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  window.localStorage.clear();
});

function samplePath(overrides: Partial<ReadinessPath> = {}): ReadinessPath {
  return {
    id: "path-fold-cta-1",
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    assessmentCompletedAt: "2026-07-01T00:00:00.000Z",
    verdict: "BUILD_FIRST",
    score: 52,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    mode: "build",
    calendarCommittedAt: null,
    steps: [
      {
        id: "step-1",
        title: "Build emergency runway",
        kind: "milestone",
        daysFromNow: 3,
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        href: "/tools/runway",
        notes: "Protective step — educational only.",
        fundingTarget: 6000,
        fundingLabel: "1-month runway target",
        status: "pending",
        completedAt: null,
      },
      {
        id: "step-reassess",
        title: "Reassess readiness",
        kind: "review",
        daysFromNow: 60,
        reasonCode: "REASSESS",
        href: "/assessment",
        notes: "Re-run when the binding constraint moves.",
        fundingTarget: null,
        fundingLabel: null,
        status: "pending",
        completedAt: null,
      },
    ],
    ...overrides,
  };
}

function primaryButtons(container: HTMLElement) {
  return container.querySelectorAll(".btn-primary");
}

describe("PathNextMove fold hierarchy", () => {
  it("fold variant: exactly one primary — Start step — Full path stays ghost", async () => {
    saveReadinessPath(samplePath());
    const { container } = render(<PathNextMove variant="fold" />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /^start step$/i })).toBeInTheDocument();
    });

    expect(primaryButtons(container)).toHaveLength(1);
    const start = screen.getByRole("link", { name: /^start step$/i });
    expect(start).toHaveClass("btn-primary");
    expect(start).toHaveAttribute("data-path-fold-primary");
    expect(start).toHaveAttribute("href", "/tools/runway");

    const markDone = screen.getByRole("button", { name: /^mark done$/i });
    expect(markDone).toHaveClass("btn-ghost");
    expect(markDone).not.toHaveClass("btn-primary");

    const fullPath = screen.getByRole("link", { name: /^full path$/i });
    expect(fullPath).toHaveClass("btn-ghost");
    expect(fullPath).not.toHaveClass("btn-primary");
  });

  it("default variant keeps Mark done as primary (habit surfaces outside fold)", async () => {
    saveReadinessPath(samplePath());
    const { container } = render(<PathNextMove />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^mark done$/i })).toBeInTheDocument();
    });

    expect(primaryButtons(container)).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^mark done$/i })).toHaveClass("btn-primary");
    expect(screen.getByRole("link", { name: /^start step$/i })).toHaveClass("btn-ghost");
  });
});
