import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { COLORS } from "@/lib/brand";

import {
  COMPASS_ARIA_LABEL,
  ThresholdCompass,
} from "@/components/brand/ThresholdCompass";

describe("ThresholdCompass (canon)", () => {
  it("renders the canonical accessible image", () => {
    const { getByRole } = render(<ThresholdCompass />);
    const img = getByRole("img");
    expect(img.getAttribute("aria-label")).toBe(COMPASS_ARIA_LABEL);
  });

  it("is an orbit/keyhole system: no text, no needle, no tick marks", () => {
    const { container } = render(<ThresholdCompass />);
    expect(container.querySelectorAll("text").length).toBe(0);
    expect(container.querySelectorAll("line").length).toBe(0);
    expect(container.querySelectorAll("polygon").length).toBe(0);
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("locks the canonical orbit radii (85 / 60 / 35) with pillar colors", () => {
    const { container } = render(<ThresholdCompass />);
    expect(container.querySelector(`circle[r="85"]`)?.getAttribute("stroke")).toBe(
      COLORS.cyan,
    );
    expect(container.querySelector(`circle[r="60"]`)?.getAttribute("stroke")).toBe(
      COLORS.emerald,
    );
    expect(container.querySelector(`circle[r="35"]`)?.getAttribute("stroke")).toBe(
      COLORS.yellow,
    );
  });

  it("places four cardinal nodes on each node-bearing orbit (not diagonals)", () => {
    const { container } = render(<ThresholdCompass />);
    const cyan = Array.from(
      container.querySelectorAll(`circle[fill="${COLORS.cyan}"]`),
    ).map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`);
    expect(cyan).toEqual(["100,15", "185,100", "100,185", "15,100"]);

    const emerald = Array.from(
      container.querySelectorAll(`circle[fill="${COLORS.emerald}"]`),
    ).map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`);
    expect(emerald).toEqual(["100,40", "160,100", "100,160", "40,100"]);
  });

  it("renders the filled keyhole at the center (circle + stem, yellow)", () => {
    const { container } = render(<ThresholdCompass />);
    const keyholeCircle = container.querySelector(
      `circle[cx="100"][cy="97.6"][fill="${COLORS.yellow}"]`,
    );
    const stem = container.querySelector(`rect[fill="${COLORS.yellow}"]`);
    expect(keyholeCircle).not.toBeNull();
    expect(stem).not.toBeNull();
  });

  it("respects the glow prop: filters only exist when glow is on", () => {
    const { container, rerender } = render(<ThresholdCompass glow />);
    expect(container.querySelector("#hc-glow")).not.toBeNull();
    expect(
      container.querySelector(`circle[r="85"]`)?.parentElement?.getAttribute("filter"),
    ).toBe("url(#hc-glow)");

    rerender(<ThresholdCompass glow={false} />);
    expect(container.querySelector("#hc-glow")).toBeNull();
    expect(
      container.querySelector(`circle[r="85"]`)?.parentElement?.getAttribute("filter"),
    ).toBeNull();
  });

  it("freezes all motion under prefers-reduced-motion", () => {
    const { container } = render(<ThresholdCompass />);
    const style = container.querySelector("style");
    expect(style?.textContent).toContain("prefers-reduced-motion");
    expect(style?.textContent).toContain("animation: none");
  });

  it("treats BUILD_FIRST / NOT_YET as halo overlays, never recolored rings", () => {
    const { container, rerender } = render(
      <ThresholdCompass verdict="BUILD_FIRST" />,
    );
    const amberHalo = container.querySelector(`[data-testid="tc-verdict-halo"]`);
    expect(amberHalo?.getAttribute("stroke")).toBe(COLORS.amber);

    rerender(<ThresholdCompass verdict="NOT_YET" />);
    expect(
      container
        .querySelector(`[data-testid="tc-verdict-halo"]`)
        ?.getAttribute("stroke"),
    ).toBe(COLORS.crimson);

    // Core orbits keep their pillar colors regardless of verdict.
    expect(container.querySelector(`circle[r="85"]`)?.getAttribute("stroke")).toBe(
      COLORS.cyan,
    );
  });

  it("respects animated={false} by dropping animation classes", () => {
    const { container } = render(<ThresholdCompass animated={false} />);
    expect(container.querySelector(".tc-outer")).toBeNull();
    expect(container.querySelector(".tc-middle")).toBeNull();
    expect(container.querySelector(".tc-inner")).toBeNull();
  });
});
