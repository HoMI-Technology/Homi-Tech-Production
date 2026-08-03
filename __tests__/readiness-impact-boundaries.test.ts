import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Source-boundary contract for the Impact Bus (PR #127).
 *
 * The bus is transient Path feedback only. It must never read the scorer or
 * assessment storage (a Path step is not a score event), and the demo surface
 * must be a one-way wall: demo code never touches the bus, the bus never
 * touches demo code. These are static guarantees — cheaper and stricter than
 * runtime spies.
 */

const ROOT = path.resolve(__dirname, "..");

function source(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("impact-bus source boundaries", () => {
  const impactBus = source("lib/readiness/impact-bus.ts");

  it("never imports scoring, assessment storage, finance, signals, or react", () => {
    expect(impactBus).not.toMatch(/from\s+["'][^"']*scoring/);
    expect(impactBus).not.toMatch(/from\s+["'][^"']*assessment/);
    expect(impactBus).not.toMatch(/from\s+["'][^"']*finance/);
    expect(impactBus).not.toMatch(/from\s+["'][^"']*signals/);
    expect(impactBus).not.toMatch(/from\s+["']react["']/);
    // A call or import of the scorer — prose in the honesty comment is fine.
    expect(impactBus).not.toMatch(/computeScore\s*[(,}]/);
  });

  it("never imports demo code, and never imports the readiness barrel (circular)", () => {
    expect(impactBus).not.toMatch(/from\s+["'][^"']*demo/);
    expect(impactBus).not.toMatch(/from\s+["']@\/lib\/readiness["']/);
    expect(impactBus).not.toMatch(/from\s+["']\.\/index["']/);
  });

  it("serializes no score fields", () => {
    expect(impactBus).not.toMatch(/ScoreImpact/);
    expect(impactBus).not.toMatch(/\bdelta\b/);
    expect(impactBus).not.toMatch(/IMPACT_EPSILON/);
  });
});

describe("ImpactToast source boundaries", () => {
  const toast = source("components/readiness/ImpactToast.tsx");

  it("never imports the demo provider/context", () => {
    expect(toast).not.toMatch(/DemoProvider|useDemo/);
    expect(toast).not.toMatch(/from\s+["'][^"']*\/demo\//);
  });

  it("never overstates persistence", () => {
    expect(toast).not.toMatch(/locked in|Saved everywhere|Synced/i);
  });
});

describe("demo source boundaries", () => {
  it("demo page and demo context never import Impact Bus code", () => {
    for (const rel of [
      "app/(product)/demo/page.tsx",
      "lib/demo/context.tsx",
    ]) {
      // Existence guard: if the file moves again (as the demo page did when
      // #125 removed the [locale] segment) this must FAIL loudly instead of
      // silently asserting against nothing.
      expect(
        fs.existsSync(path.join(ROOT, rel)),
        `${rel} does not exist — the file moved; update this boundary test`,
      ).toBe(true);
      const demo = source(rel);
      expect(demo, rel).not.toMatch(/impact-bus|ImpactToast|homi:impact/);
    }
  });
});
