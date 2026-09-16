// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

afterEach(() => {
  cleanup();
});

function renderCompass(props: Parameters<typeof ThresholdCompass>[0] = {}) {
  const { container } = render(<ThresholdCompass {...props} />);
  const svg = container.querySelector("svg[aria-label*='Threshold Compass']");
  if (!svg) throw new Error("expected brand Threshold Compass svg");
  return svg;
}

function assertCanonGeometry(svg: Element): void {
  expect(svg.getAttribute("viewBox")).toBe("0 0 200 200");
  expect(svg.querySelector('circle[r="85"]')).not.toBeNull();
  expect(svg.querySelector('circle[r="60"]')).not.toBeNull();
  expect(svg.querySelector('circle[r="35"]')).not.toBeNull();

  const ring = svg.querySelector('circle[r="9"]');
  expect(ring).not.toBeNull();
  expect(ring).toHaveAttribute("stroke", COLORS.yellow);

  const head = svg.querySelector('circle[cx="100"][cy="96.8"]');
  const stem = svg.querySelector("rect");
  expect(head).not.toBeNull();
  expect(head).toHaveAttribute("fill", COLORS.yellow);
  expect(stem).not.toBeNull();
  expect(stem).toHaveAttribute("fill", COLORS.yellow);

  const headDiameter = Number(head?.getAttribute("r")) * 2;
  const stemWidth = Number(stem?.getAttribute("width"));
  expect(stemWidth).toBeLessThan(headDiameter);
}

describe("brand ThresholdCompass glow filter", () => {
  it("omits CSS glow and SVG hc-glow when glow={false} — geometry stays", () => {
    const svg = renderCompass({ size: 28, glow: false, animated: false });

    expect(svg.getAttribute("width")).toBe("28");
    expect(svg.getAttribute("height")).toBe("28");
    expect(svg.getAttribute("class") ?? "").not.toMatch(/compass-glow/);
    expect(svg.innerHTML).not.toContain("url(#hc-glow)");
    expect(svg.querySelector("#hc-glow")).toBeNull();
    expect(svg.querySelectorAll("[filter]")).toHaveLength(0);
    assertCanonGeometry(svg);
  });

  it("keeps SVG hc-glow on the three orbits when glow is on", () => {
    const svg = renderCompass({ size: 28, glow: true, animated: false });

    expect(svg.getAttribute("class") ?? "").toMatch(/tc-compass/);
    expect(svg.getAttribute("class") ?? "").not.toMatch(/compass-glow/);
    expect(svg.querySelector("#hc-glow")).not.toBeNull();
    expect(svg.querySelectorAll('[filter="url(#hc-glow)"]')).toHaveLength(3);
    expect(svg.querySelectorAll('[filter="url(#tc-keyhole-glow)"]')).toHaveLength(1);
    assertCanonGeometry(svg);
  });
});
