// @vitest-environment jsdom

/**
 * Verdict fold renders the server integer with no ticker; badge a11y names
 * the verdict. Motion tokens and naming-law live in T3 policy; computed
 * reduced-motion style is T4.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

afterEach(cleanup);

describe("HeroScore — static server value, no ticker", () => {
  it("renders the returned integer with the Decision Readiness Score name", () => {
    const { container } = render(<HeroScore value={71} color={COLORS.yellow} />);
    expect(screen.getByText("71")).toBeInTheDocument();
    expect(
      screen.getByText("Overall Decision Readiness Score 71 out of 100"),
    ).toBeInTheDocument();
    expect(container.querySelector(".score-reveal")).not.toBeNull();
  });
});

describe("VerdictBadge — accessible name without a live region", () => {
  it("announces label + temperature, never role=status on a static reading", () => {
    const { container } = render(<VerdictBadge verdict="ALMOST_THERE" />);
    const badge = container.querySelector("[data-verdict]");
    expect(badge).toHaveAttribute("aria-label", "ALMOST THERE, Warm");
    expect(badge?.getAttribute("role")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("compact hideTemperature form names the label alone", () => {
    const { container } = render(<VerdictBadge verdict="READY" hideTemperature />);
    expect(container.querySelector("[data-verdict]")).toHaveAttribute("aria-label", "READY");
  });
});
