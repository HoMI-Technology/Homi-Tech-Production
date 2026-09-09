// @vitest-environment jsdom

/**
 * Verdict fold renders the server integer with no ticker; badge a11y names
 * the verdict. Motion tokens and naming-law live in T3 policy; computed
 * reduced-motion style is T4.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

afterEach(cleanup);

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
