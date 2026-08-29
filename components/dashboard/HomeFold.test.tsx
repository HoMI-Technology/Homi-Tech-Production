// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
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

const base = {
  assessmentsFailed: false,
  suppressBuildPercent: false,
  improved: false,
  instrumentTint: COLORS.amber,
  dueSurvey: null,
  hasPath: false,
  bankLinked: false as boolean | null,
};

const pillars = { emotional: 24, financial: 20, timing: 19 };

describe("HomeFold", () => {
  it("empty-account is one Assess close — no score rail, no fake 76", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={null}
        verdict={null}
        stopMessages={[]}
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
    expect(container.querySelector("[data-last-read-chrome]")).toBeNull();
    expect(screen.queryByText(/from March/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("Your build")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /see results/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).not.toBeNull();
    expect(container.querySelector("[data-home-money-surplus]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")?.textContent).not.toMatch(/76/);
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).not.toBeNull();
    expect(companion).toHaveTextContent(/One measurement and this page has a build to show/);
    expect(companion?.getAttribute("data-companion-escalate-href")).toBe("/advisor");
    expect(container.querySelector("[data-companion-chat]")).toBeNull();
    expect(container.querySelector("#homi-companion-panel")).toBeNull();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeTruthy();
  });

  it("live 61 / DO NOT PROCEED / runway hard stop is honest Path evidence", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "live-61", overallScore: 61, pillars }}
        verdict="NOT_YET"
        lastReadAt={new Date().toISOString()}
        lastMoney={{
          debtToIncomeRatio: 0.42,
          emergencyFundMonths: 0.4,
          savingsRate: 0.03,
          liquidDollars: 800,
        }}
        stopMessages={["Emergency runway is under 1 month."]}
        suppressBuildPercent
        hasPath
        instrumentTint={COLORS.crimson}
      />,
    );

    expect(container.querySelector("[data-home-hard-stop]")).toHaveTextContent(
      /Hard stop · Emergency runway is under 1 month/,
    );
    expect(screen.getByLabelText("Overall Decision Readiness Score 61 out of 100")).toHaveStyle({
      color: COLORS.crimson,
    });
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
    expect(container.querySelectorAll("[data-score-pillar]")).toHaveLength(0);
    expect(container.querySelector("[data-home-money-runway]")).toHaveTextContent("0.4 mo");
    expect(container.querySelector("[data-home-money-surplus]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")?.className).not.toMatch(/text-4xl/);
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("850")).not.toBeInTheDocument();
    expect(screen.queryByText("720")).not.toBeInTheDocument();
    expect(screen.queryByText(/80–100|80-100/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-last-read-chrome]")).toBeNull();
    expect(screen.queryByText(/from August/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(foldCelebrate(container)).toBeNull();
  });

  it("has-verdict leads with Path, then compact ScoreRail without PillarRings", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64, pillars }}
        verdict="BUILD_FIRST"
        lastReadAt={new Date().toISOString()}
        lastMoney={{
          debtToIncomeRatio: 0.3,
          emergencyFundMonths: 2,
          savingsRate: 0.08,
          liquidDollars: null,
        }}
        stopMessages={[]}
        hasPath
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold?.getAttribute("data-home-instrument")).toBe("build");
    expect(fold?.getAttribute("data-hard-stop")).toBe("0");
    expect(screen.queryByText("Your build")).not.toBeInTheDocument();
    expect(container.querySelector(".dash-hero-meta")).toBeNull();
    expect(container.querySelector("[data-home-build-hero]")).not.toBeNull();

    const scoreRail = container.querySelector("[data-home-score-rail]");
    expect(scoreRail).not.toBeNull();
    expect(scoreRail?.getAttribute("data-home-score-role")).toBe("context");
    expect(scoreRail?.querySelector('[data-score-rail="compact"]')).not.toBeNull();
    expect(scoreRail?.querySelector('[data-score-rail="hero"]')).toBeNull();
    expect(screen.getByLabelText("Overall Decision Readiness Score 64 out of 100")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(screen.getByText(/Warm\+/)).toBeInTheDocument();
    expect(scoreRail?.querySelectorAll("[data-score-pillar]")).toHaveLength(0);
    expect(scoreRail?.querySelector("a")?.getAttribute("href")).toBe("/results");

    const build = container.querySelector("[data-home-build-hero]");
    const money = container.querySelector("[data-home-money-standing]");
    if (!scoreRail || !build || !money) {
      throw new Error("expected path, score rail, and money strip");
    }
    expect(build.compareDocumentPosition(scoreRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(scoreRail.compareDocumentPosition(money) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(container.querySelector("[data-last-read-chrome]")).toBeNull();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-liquid]")).toHaveTextContent("—");
    expect(money.querySelectorAll(".btn-primary")).toHaveLength(0);
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
  });

  it("stale ≥30d shows one age line and does not reprint the verdict", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64, pillars }}
        verdict="BUILD_FIRST"
        lastReadAt="2026-03-15T12:00:00.000Z"
        stopMessages={[]}
      />,
    );

    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent("from March 15.");
    expect(container.querySelector("[data-last-read-chrome]")).not.toHaveTextContent("BUILD FIRST");
    expect(screen.queryByText(/45 days since your last assessment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
  });

  it("hard-stop eyebrow outranks the score reading and the build", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 61, pillars }}
        verdict="NOT_YET"
        stopMessages={["Emergency runway is under 1 month."]}
        suppressBuildPercent
        lastMoney={{
          debtToIncomeRatio: 0.5,
          emergencyFundMonths: 0.4,
          savingsRate: 0.01,
          liquidDollars: 400,
        }}
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    const banner = container.querySelector("[data-home-hard-stop]");
    const build = container.querySelector("[data-home-build-hero]");
    const scoreRail = container.querySelector("[data-home-score-rail]");
    expect(fold?.getAttribute("data-hard-stop")).toBe("1");
    expect(banner).not.toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Emergency runway is under 1 month.");
    expect(banner?.className).toMatch(/eyebrow/);
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(container.querySelector("[data-home-build-progress]")).toBeNull();
    if (!banner || !build || !scoreRail) {
      throw new Error("expected hard-stop eyebrow, score rail, and build hero");
    }
    expect(banner.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(build.compareDocumentPosition(scoreRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(scoreRail.querySelector('[data-score-rail="compact"]')).not.toBeNull();
    expect(scoreRail.querySelectorAll("[data-score-pillar]")).toHaveLength(0);
    expect(screen.getByLabelText("Overall Decision Readiness Score 61 out of 100")).toHaveStyle({
      color: COLORS.crimson,
    });
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(container.querySelector(".dash-spectrum")).toBeNull();
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).toHaveTextContent(
      "A hard stop is the read right now. The path names what has to move first.",
    );
  });

  it("does not dual-mount giant hero numeral and compass on a scored fold", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a3", overallScore: 82, pillars }}
        verdict="READY"
        stopMessages={[]}
      />,
    );

    const fold = container.querySelector("[data-home-fold]");
    expect(fold?.getAttribute("data-home-instrument")).toBe("build");
    expect(container.querySelector("[data-home-build-hero]")).not.toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).not.toBeNull();
    expect(fold?.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
  });
});

function foldCelebrate(container: HTMLElement) {
  return container.querySelector("[data-celebrate], .pointer-events-none.absolute");
}
