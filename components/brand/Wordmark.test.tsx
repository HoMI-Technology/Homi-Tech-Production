// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Wordmark } from "./Wordmark";

/**
 * Proves the component-test harness (jsdom + @testing-library/react) and doubles
 * as a brand-canon guard: the wordmark must always expose the exact "HōMI"
 * spelling and color each letter per canon.
 */
describe("Wordmark", () => {
  it("exposes the exact HōMI brand spelling as its accessible name", () => {
    render(<Wordmark />);
    expect(screen.getByLabelText("HōMI")).toBeInTheDocument();
  });

  it("colors each letter per brand canon (cyan / emerald / yellow / cyan)", () => {
    const { container } = render(<Wordmark />);
    const letters = container.querySelectorAll<HTMLElement>("span[aria-label] > span");
    expect(letters[0]?.getAttribute("data-letter")).toBe("H");
    expect(letters[1]?.getAttribute("data-letter")).toBe("o");
    expect(letters[2]?.getAttribute("data-letter")).toBe("M");
    expect(letters[3]?.getAttribute("data-letter")).toBe("I");
    const colors = Array.from(letters).map((el) => el.style.color);
    expect(colors).toEqual([
      "rgb(34, 211, 238)", // H — cyan  #22d3ee
      "rgb(52, 211, 153)", // ō — emerald #34d399
      "rgb(250, 204, 21)", // M — yellow #facc15
      "rgb(34, 211, 238)", // I — cyan  #22d3ee
    ]);
  });

  it("applies a caller-supplied size and className", () => {
    const { container } = render(<Wordmark size="text-4xl" className="mb-2" />);
    const root = container.querySelector("span[aria-label]");
    expect(root?.className).toContain("text-4xl");
    expect(root?.className).toContain("mb-2");
  });
});
