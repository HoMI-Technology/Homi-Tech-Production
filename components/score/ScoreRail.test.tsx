// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { ScoreRail } from "./ScoreRail";

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

afterEach(cleanup);

const reading = {
  score: 71,
  verdict: "ALMOST_THERE" as const,
  pillars: { emotional: 24, financial: 28, timing: 19 },
};

describe("ScoreRail", () => {
  it("hero variant renders score, verdict, and the three pillars in spec order", () => {
    const { container } = render(<ScoreRail {...reading} tint={COLORS.yellow} />);

    expect(container.querySelector('[data-score-rail="hero"]')).not.toBeNull();
    expect(screen.getByLabelText("Overall Decision Readiness Score 71 out of 100")).toBeInTheDocument();
    expect(screen.getByText("ALMOST THERE")).toBeInTheDocument();
    expect(container.querySelector("[data-home-verdict]")).not.toBeNull();

    const cells = Array.from(container.querySelectorAll("[data-score-pillar]"));
    expect(cells.map((c) => c.getAttribute("data-score-pillar"))).toEqual([
      "emotional",
      "financial",
      "timing",
    ]);
    // Raw points render as normalized percentages, never raw "n / max".
    expect(
      screen.getByLabelText("Emotional Truth 69 of 100"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Financial Reality 80 of 100"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Perfect Timing 63 of 100")).toBeInTheDocument();
    expect(screen.queryByText(/\/\s*35|\/\s*30/)).not.toBeInTheDocument();
  });

  it("compact variant keeps the same reading in rail form", () => {
    const { container } = render(
      <ScoreRail {...reading} variant="compact" tint={COLORS.yellow} />,
    );

    expect(container.querySelector('[data-score-rail="compact"]')).not.toBeNull();
    expect(screen.getByLabelText("Overall Decision Readiness Score 71 out of 100")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-score-pillar]")).toHaveLength(3);
    expect(container.querySelectorAll("[data-pillar-state='measured']")).toHaveLength(3);
  });

  it("null score and unmeasured pillar render Unknown, never invented numbers", () => {
    const { container } = render(
      <ScoreRail
        score={null}
        verdict={null}
        pillars={{ emotional: null, financial: 28, timing: 19 }}
      />,
    );

    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveTextContent("—");
    expect(container.querySelector("[data-home-verdict]")).toBeNull();
    const emotional = container.querySelector('[data-score-pillar="emotional"]');
    expect(emotional?.getAttribute("data-pillar-state")).toBe("unknown");
    expect(emotional?.getAttribute("aria-label")).toBe("Emotional Truth Unknown");
    // No zero-filled ring for a pillar that was never measured.
    expect(emotional?.querySelector("svg")).toBeNull();
  });

  it("clamps out-of-range pillar points instead of overfilling the ring", () => {
    render(
      <ScoreRail
        score={64}
        verdict="BUILD_FIRST"
        pillars={{ emotional: 35, financial: 40, timing: 0 }}
      />,
    );
    expect(screen.getByLabelText("Emotional Truth 100 of 100")).toBeInTheDocument();
    expect(screen.getByLabelText("Financial Reality 100 of 100")).toBeInTheDocument();
    expect(screen.getByLabelText("Perfect Timing 0 of 100")).toBeInTheDocument();
  });
});
