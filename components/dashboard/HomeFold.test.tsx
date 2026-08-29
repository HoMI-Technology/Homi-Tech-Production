// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { saveReadinessPath, type ReadinessPath } from "@/lib/readiness";
import { HomeFold } from "./HomeFold";

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

beforeEach(() => {
  window.localStorage.clear();
});

const base = {
  assessmentsFailed: false,
  suppressBuildPercent: false,
  improved: false,
  instrumentTint: COLORS.amber,
  dueSurvey: null,
  staleDays: 2,
  hasPath: false,
  pathDone: 0,
  pathTotal: 0,
};

function runwayPath(): ReadinessPath {
  return {
    id: "path-fold-cta-1",
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    assessmentCompletedAt: "2026-07-01T00:00:00.000Z",
    verdict: "NOT_YET",
    score: 61,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    mode: "build",
    calendarCommittedAt: null,
    steps: [
      {
        id: "step-1",
        title: "Grow emergency fund toward 3–6 months",
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
    ],
  };
}

describe("HomeFold first viewport", () => {
  it("empty state is one Assess close — no compact score/age, no money strip", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={null}
        verdict={null}
        stopMessages={[]}
        foldSentence="One measurement and this page has a build to show."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold).not.toBeNull();
    expect(fold?.getAttribute("data-home-instrument")).toBe("empty");
    expect(screen.getByRole("link", { name: /^assess$/i })).toHaveAttribute(
      "href",
      "/assessment",
    );
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(container.querySelector("[data-last-read-chrome]")).toBeNull();
    expect(screen.queryByText(/from Aug/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Last read/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(container.querySelector("[data-home-verdict]")).toBeNull();
  });

  it("Brand PASS crop: verdict once, Path primary, compact 61 · from Aug 29", async () => {
    saveReadinessPath(runwayPath());
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 61 }}
        verdict="NOT_YET"
        lastReadAt="2026-08-29T12:00:00.000Z"
        stopMessages={["You have less than one month of expenses set aside."]}
        stopCodes={["RUNWAY_UNDER_1_MONTH"]}
        suppressBuildPercent
        hasPath
        foldSentence="Runway is the hold. Build the fund before anything else."
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /grow emergency fund toward 3–6 months/i }),
      ).toBeInTheDocument();
    });

    const viewport = container.querySelector("[data-home-first-viewport]");
    expect(viewport).not.toBeNull();

    expect(screen.getByRole("alert")).toHaveTextContent("Hard stop · runway");
    const verdictHits = screen.getAllByText("DO NOT PROCEED");
    expect(verdictHits).toHaveLength(1);
    expect(container.querySelector("[data-home-verdict]")).toHaveTextContent("DO NOT PROCEED");
    expect(screen.getByText("Runway is the hold. Build the fund before anything else.")).toBeInTheDocument();

    expect(viewport).toHaveTextContent("61 · from Aug 29");
    expect(viewport).not.toHaveTextContent("Last read");
    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent("61 · from Aug 29");
    expect(container.querySelector("[data-last-read-chrome]")).not.toHaveTextContent("DO NOT PROCEED");

    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open Money/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Decide$/i)).not.toBeInTheDocument();

    const primaries = viewport?.querySelectorAll(".btn-primary") ?? [];
    expect(primaries).toHaveLength(1);

    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(viewport?.querySelector("[data-home-money-standing]")).toBeNull();
    expect(viewport?.querySelector("[data-outcome-survey], .glass")).toBeNull();
    expect(screen.queryByText(/Checking in/i)).not.toBeInTheDocument();
  });

  it("compact last-read uses the assessment date — Aug 29 is {Mon D} shape, not a ship date", async () => {
    saveReadinessPath(runwayPath());
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 61 }}
        verdict="NOT_YET"
        lastReadAt="2026-03-15T12:00:00.000Z"
        stopMessages={["You have less than one month of expenses set aside."]}
        stopCodes={["RUNWAY_UNDER_1_MONTH"]}
        suppressBuildPercent
        hasPath
        foldSentence="Runway is the hold. Build the fund before anything else."
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /grow emergency fund toward 3–6 months/i }),
      ).toBeInTheDocument();
    });

    const chrome = container.querySelector("[data-last-read-chrome]");
    expect(chrome).toHaveTextContent("61 · from Mar 15");
    expect(chrome).not.toHaveTextContent("Aug 29");
    expect(chrome).not.toHaveTextContent("Last read");
    expect(chrome).not.toHaveTextContent("DO NOT PROCEED");
    expect(chrome).not.toHaveTextContent("NOT_YET");
    expect(screen.getAllByText("DO NOT PROCEED")).toHaveLength(1);
  });

  it("does not render day30 inside the first viewport even when due_at has passed", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 61 }}
        verdict="BUILD_FIRST"
        lastReadAt="2026-08-29T12:00:00.000Z"
        staleDays={12}
        pathHeldDays={12}
        stopMessages={[]}
        dueSurvey={{ id: "s-day30", kind: "day30" }}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    expect(screen.queryByText(/Checking in/i)).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-first-viewport]")).not.toHaveTextContent(
      "Checking in",
    );
  });

  it("READY has no hard-stop hero — Path next + compact score · age", async () => {
    saveReadinessPath({
      ...runwayPath(),
      verdict: "READY",
      mode: "ready_optional",
      bindingConstraint: "READY_CELEBRATE",
    });
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a3", overallScore: 82 }}
        verdict="READY"
        lastReadAt="2026-08-29T12:00:00.000Z"
        stopMessages={[]}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /review path/i })).toBeInTheDocument();
    });

    expect(container.querySelector("[data-home-hard-stop]")).toBeNull();
    expect(container.querySelector("[data-home-verdict]")).toBeNull();
    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent("82 · from Aug 29");
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
  });

  it("does not dual-mount giant hero numeral and compass on a scored fold", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a3", overallScore: 82 }}
        verdict="READY"
        stopMessages={[]}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold?.getAttribute("data-home-instrument")).toBe("build");
    expect(fold?.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
  });
});
