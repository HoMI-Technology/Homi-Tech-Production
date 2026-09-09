// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomeV4 } from "@/components/v4/HomeV4";
import { buildHomeV4View } from "@/lib/v4/home-state";
import { homeV4VisualReading } from "@/lib/v4/visual-fixture";

afterEach(() => {
  cleanup();
});

function follows(earlier: Element, later: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("HomeV4 Ultra Premium fold", () => {
  it("paints State A hierarchy without % ready or invent-chrome grid", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/% ready/i);
    expect(text).not.toContain("/ 100");
    expect(text).toContain("61");
    expect(text).toContain("DO NOT PROCEED");
    expect(container.querySelector(".workspace-grid")).toBeNull();
    expect(container.querySelector(".v4-home-grid")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-pillar]")?.className).not.toMatch(/rounded/);

    const context = container.querySelector("[data-home-v4-context]");
    const readiness = container.querySelector("[data-home-v4-readiness]");
    const evidence = container.querySelector("[data-home-v4-evidence]");
    const path = container.querySelector("[data-home-v4-path-step]");
    const money = container.querySelector("[data-home-v4-money]");
    const changed = container.querySelector("[data-home-v4-changed]");
    const tools = container.querySelector("[data-home-v4-tools]");
    const homi = container.querySelector("[data-home-v4-homi]");

    expect(context).not.toBeNull();
    expect(readiness).not.toBeNull();
    expect(evidence).not.toBeNull();
    expect(path).not.toBeNull();
    expect(money).not.toBeNull();
    expect(changed).not.toBeNull();
    expect(tools).not.toBeNull();
    expect(homi).not.toBeNull();
    expect(follows(context!, readiness!)).toBe(true);
    expect(follows(readiness!, evidence!)).toBe(true);
    expect(follows(evidence!, path!)).toBe(true);
    expect(follows(path!, money!)).toBe(true);
    expect(follows(money!, changed!)).toBe(true);
    expect(follows(changed!, tools!)).toBe(true);

    expect(homi?.textContent).toContain("HōMI");
    expect(homi?.textContent).not.toContain("Ask HōMI");
  });
});
