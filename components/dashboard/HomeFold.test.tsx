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
};

describe("HomeFold", () => {
  it("empty state is one Assess close — no zeroed hero, no fake 76", () => {
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
      "/first-moment",
    );
    expect(container.querySelector("[data-home-hero]")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("HōMI-Score")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /see results/i })).not.toBeInTheDocument();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeTruthy();
  });

  it("has-verdict shows the hero numeral, verdict word, and See results", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64 }}
        verdict="BUILD_FIRST"
        stopMessages={[]}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold?.getAttribute("data-home-instrument")).toBe("hero");
    expect(fold?.getAttribute("data-hard-stop")).toBe("0");
    expect(screen.getByText("HōMI-Score")).toBeInTheDocument();
    expect(container.querySelector("[data-home-hero]")).not.toBeNull();
    expect(screen.getByText("Overall HōMI-Score 64 out of 100")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(
      screen.getByText("Financial Reality is the softest pillar on this read."),
    ).toBeInTheDocument();
    const results = screen.getAllByRole("link", { name: /see results/i });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]).toHaveAttribute("href", "/results");
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
  });

  it("hard-stop banner outranks the number and does not paint a compass", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 71 }}
        verdict="NOT_YET"
        stopMessages={["DTI is above 50%."]}
        suppressBuildPercent
        foldSentence="A hard stop is the read right now. The path names what has to move first."
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    const banner = container.querySelector("[data-home-hard-stop]");
    const hero = container.querySelector("[data-home-hero]");
    expect(fold?.getAttribute("data-hard-stop")).toBe("1");
    expect(banner).not.toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("DTI is above 50%.");
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    if (!banner || !hero) {
      throw new Error("expected hard-stop banner and hero numeral");
    }
    expect(banner.compareDocumentPosition(hero) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(container.querySelector(".dash-spectrum")).toBeNull();
    expect(screen.queryByText("Almost")).not.toBeInTheDocument();
  });

  it("does not dual-mount hero and compass on a scored fold", () => {
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
    expect(fold?.getAttribute("data-home-instrument")).toBe("hero");
    expect(container.querySelector("[data-home-hero]")).not.toBeNull();
    expect(fold?.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
  });
});
