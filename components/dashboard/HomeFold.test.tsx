// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { HomeFold } from "./HomeFold";

// jsdom lacks matchMedia — a reduced-motion match makes PillarRing render its
// finished (static) ring, which is exactly the server/no-JS contract.
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
  staleDays: 2,
  hasPath: false,
  pathDone: 0,
  pathTotal: 0,
};

const pillars = { emotional: 24, financial: 20, timing: 19 };

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
    expect(container.querySelector("[data-last-read-chrome]")).toBeNull();
    expect(screen.queryByText(/from March/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("Your build")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /see results/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).not.toBeNull();
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).not.toBeNull();
    expect(companion).toHaveTextContent(/One measurement and this page has a build to show/);
    expect(companion?.getAttribute("data-companion-escalate-href")).toBe("/advisor");
    expect(container.querySelector("[data-companion-chat]")).toBeNull();
    expect(container.querySelector("#homi-companion-panel")).toBeNull();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeTruthy();
  });

  it("has-verdict leads with the score reading, then the Path action instrument", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64, pillars }}
        verdict="BUILD_FIRST"
        lastReadAt="2026-03-15T12:00:00.000Z"
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

    // Elevated score hero: numeral + verdict + three pillar rings.
    const scoreRail = container.querySelector("[data-home-score-rail]");
    expect(scoreRail).not.toBeNull();
    expect(scoreRail?.querySelector('[data-score-rail="hero"]')).not.toBeNull();
    expect(screen.getByLabelText("Overall Decision Readiness Score 64 out of 100")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(scoreRail?.querySelectorAll("[data-score-pillar]")).toHaveLength(3);
    expect(
      scoreRail?.querySelector('[data-score-pillar="emotional"][data-pillar-state="measured"]'),
    ).not.toBeNull();
    expect(
      scoreRail?.querySelector('[data-score-pillar="financial"][data-pillar-state="measured"]'),
    ).not.toBeNull();
    expect(
      scoreRail?.querySelector('[data-score-pillar="timing"][data-pillar-state="measured"]'),
    ).not.toBeNull();

    // Fold order (spec §D): score reading sits above the Path next-move.
    const build = container.querySelector("[data-home-build-hero]");
    if (!scoreRail || !build) {
      throw new Error("expected score rail and build hero");
    }
    expect(scoreRail.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent(
      "Last read: BUILD FIRST from March 15.",
    );
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/looks stronger/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/looks weaker/i)).not.toBeInTheDocument();
    expect(
      screen.getByText("Financial Reality is the softest pillar on this read."),
    ).toBeInTheDocument();
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).not.toBeNull();
    expect(companion?.classList.contains("panel-focus")).toBe(true);
    expect(companion).toHaveTextContent(/Companion/);
    expect(companion).toHaveTextContent(/binding step on Path to Ready/);
    expect(companion?.getAttribute("data-companion-escalate-href")).toBe("/advisor");
    // Presence only — no chat panel or second primary on the Companion line.
    expect(companion?.querySelector(".btn-primary")).toBeNull();
    expect(container.querySelector("#homi-companion-panel")).toBeNull();
    expect(container.querySelector("[data-companion-chat]")).toBeNull();
    // Score hero: verdict badge is a reading, not a /results deep-link.
    expect(container.querySelector("[data-home-verdict]")).not.toBeNull();
    expect(container.querySelector("[data-home-verdict][href]")).toBeNull();
    expect(screen.queryByRole("link", { name: /last verdict/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^see results$/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-money-standing]")).not.toBeNull();
    // Money strip CTAs stay secondary — never btn-primary on the fold.
    const money = container.querySelector("[data-home-money-standing]");
    expect(money?.querySelectorAll(".btn-primary")).toHaveLength(0);
    expect(screen.queryByRole("link", { name: /money picture/i })).not.toBeInTheDocument();
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
  });

  it("stale >30d does not stack a second age treatment on the fold", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a1", overallScore: 64, pillars }}
        verdict="BUILD_FIRST"
        lastReadAt="2026-03-15T12:00:00.000Z"
        staleDays={45}
        stopMessages={[]}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    expect(screen.getByText(/45 days since your last assessment/i)).toBeInTheDocument();
    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent(
      "Last read: BUILD FIRST",
    );
    expect(screen.queryByText("from March 15.")).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
  });

  it("S4: a clean verdict leads with the score, and the score is the hero", () => {
    // The default doctrine. Only a hard stop inverts it — staleness does not,
    // because a stale score is still the honest headline, just an older one.
    const { container } = render(
      <HomeFold
        {...base}
        foldState="S4"
        latest={{ id: "a1", overallScore: 84, pillars }}
        verdict="READY"
        stopMessages={[]}
        foldSentence="You cleared the readiness line."
      />,
    );
    const build = container.querySelector("[data-home-build-hero]");
    const scoreRail = container.querySelector("[data-home-score-rail]");
    if (!build || !scoreRail) throw new Error("expected score rail and build hero");

    expect(scoreRail.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(scoreRail.getAttribute("data-home-score-role")).toBe("hero");
  });

  it("S6: a stale verdict still leads with the score, marked as stale", () => {
    const { container } = render(
      <HomeFold
        {...base}
        foldState="S6"
        staleDays={94}
        latest={{ id: "a3", overallScore: 78, pillars }}
        verdict="ALMOST_THERE"
        stopMessages={[]}
        foldSentence="Your last read is a while back."
      />,
    );
    const scoreRail = container.querySelector("[data-home-score-rail]");
    expect(scoreRail?.getAttribute("data-home-score-role")).toBe("hero");
    // The retest nudge is what marks it stale — the score is not demoted.
    expect(screen.getByText(/94 days since your last assessment/)).toBeInTheDocument();
  });

  it("hard-stop banner outranks the score reading and the build, and suppresses step progress", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 71, pillars }}
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
    const scoreRail = container.querySelector("[data-home-score-rail]");
    expect(fold?.getAttribute("data-hard-stop")).toBe("1");
    expect(banner).not.toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("DTI is above 50%.");
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(container.querySelector("[data-home-build-progress]")).toBeNull();
    expect(build).not.toBeNull();
    expect(scoreRail).not.toBeNull();
    if (!banner || !build || !scoreRail) {
      throw new Error("expected hard-stop banner, score rail, and build hero");
    }
    // Order: hard-stop alert → Path action instrument → score reading.
    //
    // S5 is the named exception to score-first (design direction §4, phase 04:
    // do not invert the *default*, but a hard stop leads with the situation).
    // Someone who cannot proceed does not need their number first — they need
    // what is blocking them and what to do about it. The score stays on the
    // fold, demoted to context.
    expect(banner.compareDocumentPosition(build) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(build.compareDocumentPosition(scoreRail) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(scoreRail.getAttribute("data-home-score-role")).toBe("context");
    // Hard stop tints the score numeral crimson, never a cheerful verdict tint.
    expect(screen.getByLabelText("Overall Decision Readiness Score 71 out of 100")).toHaveStyle({
      color: COLORS.crimson,
    });
    expect(fold?.querySelector("svg[aria-label*='Threshold Compass']")).toBeNull();
    expect(container.querySelector(".dash-spectrum")).toBeNull();
    expect(screen.queryByText("Almost")).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
    const companion = container.querySelector("[data-companion-fold-line]");
    expect(companion).toHaveTextContent(
      "A hard stop is the read right now. The path names what has to move first.",
    );
    expect(companion?.querySelector(".btn-primary")).toBeNull();
  });

  it("hard stop still shows last verdict + age and never closer-to READY", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a2", overallScore: 71, pillars }}
        verdict="ALMOST_THERE"
        lastReadAt="2026-03-15T12:00:00.000Z"
        stopMessages={["DTI is above 50%."]}
        suppressBuildPercent
        foldSentence="A hard stop is the read right now. The path names what has to move first."
      />,
    );

    expect(container.querySelector("[data-last-read-chrome]")).toHaveTextContent(
      "Last read: ALMOST THERE from March 15.",
    );
    expect(screen.queryByText(/closer to READY/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/closer to/i)).not.toBeInTheDocument();
  });

  it("unmeasured pillar renders an honest Unknown cell, never a zero ring", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{
          id: "a4",
          overallScore: 58,
          pillars: { emotional: null, financial: 20, timing: 19 },
        }}
        verdict="BUILD_FIRST"
        stopMessages={[]}
        foldSentence="Financial Reality is the softest pillar on this read."
      />,
    );

    const unknown = container.querySelector('[data-score-pillar="emotional"]');
    expect(unknown?.getAttribute("data-pillar-state")).toBe("unknown");
    expect(unknown?.getAttribute("aria-label")).toBe("Emotional Truth Unknown");
    expect(unknown?.querySelector("svg")).toBeNull();
  });

  it("does not dual-mount giant hero numeral and compass on a scored fold", () => {
    const { container } = render(
      <HomeFold
        {...base}
        latest={{ id: "a3", overallScore: 82, pillars }}
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
