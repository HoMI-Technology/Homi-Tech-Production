// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DRAFT_VERSION, saveDraft } from "@/lib/assessment/draft";
import { DashboardResumeRamp } from "./DashboardResumeRamp";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("DashboardResumeRamp", () => {
  it("offers resume when a started draft is on the device", () => {
    saveDraft({
      decisionType: "home_buying",
      responses: { fin_income: 6500 },
      conflict: { referralSource: null, deadlineOrigin: null },
      index: 8,
    });
    expect(DRAFT_VERSION).toBeGreaterThan(0);
    render(<DashboardResumeRamp />);
    expect(screen.getByRole("link", { name: /resume your assessment/i })).toHaveAttribute(
      "href",
      "/assessment",
    );
    expect(
      screen.getByRole("heading", { name: /the build is where you left it/i }),
    ).toBeInTheDocument();
  });

  it("falls back to the first-run empty state when there is no draft", () => {
    render(<DashboardResumeRamp />);
    expect(screen.getByRole("link", { name: /shadow score/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /resume your assessment/i })).not.toBeInTheDocument();
  });
});
