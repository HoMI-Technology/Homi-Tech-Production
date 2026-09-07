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
  const keyhole = svg.querySelector('circle[r="5"]');
  expect(keyhole).not.toBeNull();
  expect(keyhole).toHaveAttribute("stroke", COLORS.yellow);
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

  it("keeps CSS glow and SVG hc-glow on the rings when glow is on", () => {
    const svg = renderCompass({ size: 28, glow: true, animated: false });

    expect(svg.getAttribute("class") ?? "").toMatch(/compass-glow/);
    expect(svg.querySelector("#hc-glow")).not.toBeNull();
    expect(svg.querySelectorAll('[filter="url(#hc-glow)"]')).toHaveLength(4);
    assertCanonGeometry(svg);
  });
});
