// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { HomeFold } from "./HomeFold";

afterEach(() => {
  cleanup();
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

describe("HomeFold", () => {
  it("empty state is one Assess close — no score rail, no fake 76", () => {
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
    expect(container.querySelector("[data-home-build-hero]")).toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("Your build")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /see results/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).not.toBeNull();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeTruthy();
  });

  it("has-verdict leads with the build, score rail reading, Companion, and tool closes", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64 }}
        verdict="BUILD_FIRST"
        stopMessages={[]}
        hasPath
        pathDone={2}
        pathTotal={7}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold?.getAttribute("data-home-instrument")).toBe("build");
    expect(fold?.getAttribute("data-hard-stop")).toBe("0");
    expect(fold?.classList.contains("dash-instrument")).toBe(true);
    expect(screen.getByLabelText("HōMI")).toBeInTheDocument();
    expect(screen.getByText("Your build")).toBeInTheDocument();
    expect(container.querySelector(".dash-hero-meta")).not.toBeNull();
    expect(container.querySelector("[data-home-build-hero]")).not.toBeNull();
    expect(container.querySelector("[data-home-build-progress]")).toHaveTextContent("2 of 7");
    expect(container.querySelector("[data-home-score-rail]")).not.toBeNull();
    expect(screen.getByLabelText("Overall HōMI-Score 64 out of 100")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(
      screen.getByText("Financial Reality is the softest pillar on this read."),
    ).toBeInTheDocument();
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).not.toBeNull();
    expect(companion?.classList.contains("panel-focus")).toBe(true);
    expect(companion).toHaveTextContent(/Companion/);
    expect(companion).toHaveTextContent(/binding step on Path to Ready/);
    // Compact score rail keeps a quiet reveal link via the verdict badge only —
    // no competing "See results" button that steals the Build.
    expect(container.querySelector("[data-home-verdict]")).toHaveAttribute("href", "/results");
    expect(screen.getByRole("link", { name: /last verdict/i })).toHaveAttribute("href", "/results");
    expect(screen.queryByRole("link", { name: /^see results$/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /money picture/i })).not.toBeInTheDocument();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
  });

  it("hard-stop banner outranks the build and suppresses step progress", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 71 }}
        verdict="NOT_YET"
        stopMessages={["DTI is above 50%."]}
        suppressBuildPercent
        pathDone={3}
        pathTotal={7}
        foldSentence="A hard stop is the read right now. The path names what has to move first."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    const banner = container.querySelector("[data-home-hard-stop]");
    const build = container.querySelector("[data-home-build-hero]");
    expect(fold?.getAttribute("data-hard-stop")).toBe("1");
    expect(banner).not.toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("DTI is above 50%.");
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(container.querySelector("[data-home-build-progress]")).toBeNull();
    if (!banner || !build) {
      throw new Error("expected hard-stop banner and build hero");
    }
    expect(banner.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(container.querySelector(".dash-spectrum")).toBeNull();
    expect(screen.queryByText("Almost")).not.toBeInTheDocument();
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
    expect(container.querySelector("[data-home-build-hero]")).not.toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).not.toBeNull();
    expect(fold?.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
  });
});
