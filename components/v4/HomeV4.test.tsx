// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeV4 } from "@/components/v4/HomeV4";
import { buildHomeV4View } from "@/lib/v4/home-state";
import { homeV4VisualReading } from "@/lib/v4/visual-fixture";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/home",
}));

afterEach(() => {
  cleanup();
});

function follows(earlier: Element, later: Element): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function homiAskPlaceholder(container: HTMLElement): string {
  const input = container.querySelector("[data-home-v4-homi-ask]");
  return input instanceof HTMLInputElement ? input.placeholder : "";
}

describe("HomeV4 Ultra Premium fold", () => {
  it("paints State A anatomy: gauge, evidence band, support pair, Homi rail", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/% ready/i);
    expect(text).toContain("61");
    expect(text).toContain("/100");
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("Build runway to 1 month");
    expect(text).toContain("View full assessment");
    expect(container.querySelector("[data-home-v4-assess]")?.getAttribute("href")).toBe(
      "/assessment",
    );
    expect(text).toContain("A hard stop takes priority over the number.");
    expect(text).toContain("Hard stop still holds on this read.");
    expect(text).toContain("Open");
    expect(text).toContain("Accounts aren't connected yet.");
    expect(text).toContain("Connect accounts for a fuller picture.");
    expect(text).toContain("Addresses the current hold.");
    expect(container.querySelector("[data-home-v4-path-cta]")?.getAttribute("href")).toBe("/path");
    expect(text).toContain("What HōMI is seeing");
    expect(text).not.toContain("Educational prompts. Not a second score.");
    expect(text).not.toContain("AssessmentResult");
    expect(text).not.toContain("Ledger stays empty");
    expect(text).not.toMatch(/% ready/i);
    expect(text).not.toMatch(/\$\d/);
    expect(homiAskPlaceholder(container)).toContain("Ask HōMI about this readiness");
    expect(container.querySelector(".workspace-grid")).toBeNull();
    expect(container.querySelector(".v4-home-main")).toBeNull();
    expect(container.querySelector(".v4-home-rail")).toBeNull();
    expect(container.querySelector(".v4-home-grid")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-gauge]")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-verdict]")?.className).toContain("v4-hero-verdict");
    expect(container.querySelector("[data-home-v4-verdict]")?.className).not.toMatch(/type-fold-verdict/);
    expect(container.querySelector(".v4-hero-priority")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-tool]")?.className).toContain("v4-tool-cell");
    expect(container.querySelector(".v4-tool-open")).not.toBeNull();

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
    expect(follows(evidence!, money!)).toBe(true);
    expect(follows(money!, path!)).toBe(true);
    expect(follows(path!, tools!)).toBe(true);
    expect(follows(tools!, homi!)).toBe(true);
    expect(follows(homi!, changed!)).toBe(true);

    expect(homi?.textContent).toContain("HōMI");
    expect(homi?.textContent).toContain("Clarity");
    expect(homi?.textContent).toContain("Ask HōMI");
    expect(homi?.querySelector("[data-home-v4-homi-ask]")).not.toBeNull();
  });

  it("empty state is a finished first screen, not a report stub", () => {
    const view = buildHomeV4View(homeV4VisualReading("empty"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-home-v4-empty]")).not.toBeNull();
    expect(text).toContain("No assessment yet");
    expect(text).toContain("Assess");
    expect(container.querySelector("[data-home-v4-assess]")?.getAttribute("href")).toBe(
      "/assessment",
    );
    expect(text).not.toContain("DO NOT PROCEED");
    expect(text).not.toContain("AssessmentResult");
  });

  it("money-disconnected keeps the connect path honest", () => {
    const view = buildHomeV4View(homeV4VisualReading("money-disconnected"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Accounts aren't connected yet.");
    expect(container.querySelector("[data-home-v4-connect]")).not.toBeNull();
    expect(text).not.toMatch(/\$\d/);
  });
});

describe("Home v4 shipped CSS named areas", () => {
  it("keeps evidence in the 768/390/320 template so the band cannot auto-place after tools", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.v4-evidence\s*\{[^}]*grid-area:\s*evidence/s);

    const mobile = css.match(
      /@media \(max-width: 767\.98px\)\s*\{[\s\S]*?\.v4-home-grid\s*\{[\s\S]*?grid-template-areas:\s*([^;]+);/,
    );
    expect(mobile).not.toBeNull();
    const areas = mobile![1];
    const names = [...areas.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(names).toContain("evidence");
    expect(names).toEqual([
      "context",
      "hero",
      "evidence",
      "homi",
      "support",
      "changed",
      "tools",
    ]);
    expect(names.indexOf("evidence")).toBeLessThan(names.indexOf("tools"));
    expect(names.indexOf("evidence")).toBeLessThan(names.indexOf("homi"));
  });
});
