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

function areaNames(block: string): string[] {
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe("HomeV4 Ultra Premium fold", () => {
  it("paints State A as one verdict, one next move, honest empty money", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";

    expect(text).toContain("61");
    expect(text).not.toMatch(/\s*\/\s*100\b/);
    expect(text).not.toMatch(/% ready/i);
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("Build runway to 1 month");
    expect(text).not.toContain("View full assessment");
    expect(text).not.toContain("Open Path");
    expect(text).not.toContain("A hard stop takes priority over the number.");
    expect(container.querySelector(".v4-hero-priority")).toBeNull();
    expect(container.querySelector(".v4-hero-secondary")).toBeNull();
    expect(container.querySelector("[data-home-v4-assess]")).toBeNull();

    const pathCtas = [...container.querySelectorAll("[data-home-v4-path-cta]")];
    expect(pathCtas).toHaveLength(1);
    expect(pathCtas[0]?.textContent).toContain("Build runway to 1 month");
    expect(pathCtas[0]?.getAttribute("href")).toBe("/path");

    expect(text).toContain("Accounts aren't connected yet.");
    expect(container.querySelector("[data-home-v4-connect]")).not.toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).toContain("What HōMI is seeing");
    expect(text).not.toContain("AssessmentResult");
    expect(text).not.toContain("Educational prompts. Not a second score.");

    expect(container.querySelector(".workspace-grid")).toBeNull();
    expect(container.querySelector(".v4-home-main")).toBeNull();
    expect(container.querySelector(".v4-home-rail")).toBeNull();
    expect(container.querySelector(".v4-home-grid")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-gauge]")).not.toBeNull();
    expect(container.querySelector("[data-home-v4-verdict]")?.className).toContain("v4-hero-verdict");
    expect(container.querySelector("[data-home-v4-verdict]")?.className).not.toMatch(/type-fold-verdict/);

    const context = container.querySelector("[data-home-v4-context]");
    const readiness = container.querySelector("[data-home-v4-readiness]");
    const evidence = container.querySelector("[data-home-v4-evidence]");
    const money = container.querySelector("[data-home-v4-money]");
    const homi = container.querySelector("[data-home-v4-homi]");

    expect(context).not.toBeNull();
    expect(readiness).not.toBeNull();
    expect(evidence).not.toBeNull();
    expect(money).not.toBeNull();
    expect(homi).not.toBeNull();
    expect(container.querySelector("[data-home-v4-path-step]")).toBeNull();
    expect(container.querySelector("[data-home-v4-changed]")).toBeNull();
    expect(container.querySelector("[data-home-v4-tools]")).toBeNull();
    expect(container.querySelector("[data-home-v4-tool]")).toBeNull();
    expect(follows(context!, readiness!)).toBe(true);
    expect(follows(readiness!, evidence!)).toBe(true);
    expect(follows(evidence!, money!)).toBe(true);
    expect(follows(money!, homi!)).toBe(true);

    expect(homi?.textContent).toContain("HōMI");
    expect(homi?.textContent).toContain("Clarity");
    expect(homi?.textContent).toContain("What does this hard stop mean?");
    expect(homi?.querySelector("[data-home-v4-homi-ask]")).toBeNull();
    expect(container.querySelector("[data-home-v4-homi-ask]")).toBeNull();
  });

  it("empty state is a finished first screen, not a report stub", () => {
    const view = buildHomeV4View(homeV4VisualReading("empty"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-home-v4-empty]")).not.toBeNull();
    expect(text).toContain("Nothing to judge yet.");
    expect(text).toContain("Take the assessment. This page becomes the verdict and the one next move.");
    expect(text).toContain("Assess");
    expect(container.querySelector("[data-home-v4-assess]")?.getAttribute("href")).toBe(
      "/assessment",
    );
    expect(container.querySelector("[data-home-v4-path-cta]")).toBeNull();
    expect(container.querySelector("[data-home-v4-money]")).toBeNull();
    expect(container.querySelector("[data-home-v4-evidence]")).toBeNull();
    expect(container.querySelector("[data-home-v4-path-step]")).toBeNull();
    expect(container.querySelector("[data-home-v4-tools]")).toBeNull();
    expect(text).not.toContain("DO NOT PROCEED");
    expect(text).not.toContain("AssessmentResult");
    expect(text).not.toMatch(/\s*\/\s*100\b/);
  });

  it("money-disconnected keeps the connect path honest", () => {
    const view = buildHomeV4View(homeV4VisualReading("money-disconnected"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Accounts aren't connected yet.");
    expect(container.querySelector("[data-home-v4-connect]")).not.toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(container.querySelector("[data-home-v4-tools]")).toBeNull();
  });

  it("normal read still leads with one Path CTA and no ghost tools", () => {
    const view = buildHomeV4View(homeV4VisualReading("normal"));
    const { container } = render(<HomeV4 view={view} />);
    const text = container.textContent ?? "";
    expect(text).toContain("ALMOST THERE");
    expect(text).toContain("72");
    expect(text).not.toMatch(/\s*\/\s*100\b/);
    expect(container.querySelector("[data-home-v4-hard-stop]")).toBeNull();
    const pathCtas = [...container.querySelectorAll("[data-home-v4-path-cta]")];
    expect(pathCtas).toHaveLength(1);
    expect(pathCtas[0]?.getAttribute("href")).toBe("/path");
    expect(container.querySelector("[data-home-v4-tools]")).toBeNull();
    expect(container.querySelector("[data-home-v4-homi-ask]")).toBeNull();
  });
});

describe("Home v4 shipped CSS named areas", () => {
  it("keeps evidence in the mobile template and drops leftover changed/tools areas", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.v4-evidence\s*\{[^}]*grid-area:\s*evidence/s);

    const mobile = css.match(
      /@media \(max-width: 767\.98px\)\s*\{[\s\S]*?\.v4-home-grid\s*\{[\s\S]*?grid-template-areas:\s*([^;]+);/,
    );
    expect(mobile).not.toBeNull();
    const names = areaNames(mobile![1]);
    expect(names).toEqual(["context", "hero", "evidence", "support", "homi"]);
    expect(names).not.toContain("changed");
    expect(names).not.toContain("tools");
    expect(names.indexOf("evidence")).toBeLessThan(names.indexOf("homi"));
  });
});
