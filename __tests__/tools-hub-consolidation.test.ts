/**
 * TOOL_CONSOLIDATION.md lock — public /tools is ten lenses.
 * Off-hub extras are hidden, redirected, or deep-linked. Engine files stay.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { hubLenses, getLens } from "@/lib/tools/registry";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("tools hub consolidation lock", () => {
  it("hub page renders hubLenses only — no 18-calculators marketing", () => {
    const src = read("app/(product)/tools/page.tsx");
    expect(src).toMatch(/hubLenses/);
    expect(src).not.toMatch(/LENSES\.length/);
    expect(src).not.toMatch(/18 calculators/i);
    expect(src).not.toMatch(/Open calculator/);
    expect(src).toMatch(/Open lens/);
    expect(src).toMatch(/Educational estimates/);
    expect(src).not.toMatch(/href=["']\/simulator["']/);
    expect(src).not.toMatch(/href=["']\/scenarios["']/);
    expect(src).toMatch(/PRIMARY_CLOSE_HREF/);
    expect(src).toMatch(/PRIMARY_CLOSE_LABEL/);
    expect(src).not.toMatch(/href=["']\/assessment["']/);
    expect(src).not.toMatch(/hubLensesByRing/);
  });

  it("mortgage route folds into affordability instead of remaining a peer card", () => {
    const src = read("app/(product)/tools/mortgage/page.tsx");
    expect(src).toMatch(/permanentRedirect\(["']\/tools\/affordability["']\)/);
    expect(getLens("mortgage")?.placement).toBe("redirect");
    expect(hubLenses().some((l) => l.id === "mortgage")).toBe(false);
  });

  it("Path to Ready still exists as Path, not a hub card", () => {
    expect(existsSync(resolve(process.cwd(), "app/(product)/path/page.tsx"))).toBe(true);
    expect(getLens("path-to-ready")).toMatchObject({ path: "/path", placement: "more" });
    expect(hubLenses().some((l) => l.id === "path-to-ready")).toBe(false);
  });

  it("Monte Carlo page marketing description has no run-count copy", () => {
    const src = read("app/(product)/tools/monte-carlo/page.tsx");
    const desc = src.match(/description=\{`([^`]+)`\}/)?.[1] ?? "";
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).not.toMatch(/1,000|10,000/);
    expect(desc).toMatch(/simulated paths/i);
  });

  it("Pre-Flight page does not mount HōMI verdict badges", () => {
    const src = read("app/(product)/tools/preflight/page.tsx");
    expect(src).not.toMatch(/VerdictBadge/);
    expect(src).not.toMatch(/ALMOST THERE|BUILD FIRST/);
    expect(src).not.toMatch(/scoreToVerdict/);
  });
});
