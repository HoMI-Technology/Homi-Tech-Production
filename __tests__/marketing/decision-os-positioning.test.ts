import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const HOME = src("app", "(marketing)", "page.tsx");
const FRONT = src("components", "home", "FrontDoor.tsx");
const B2B = src("app", "(marketing)", "b2b", "page.tsx");

describe("public Decision Intelligence OS positioning", () => {
  it("mounts the operating-system story after the core method", () => {
    expect(HOME).toContain("<DecisionOS />");
    expect(HOME.indexOf("<Steps />")).toBeLessThan(HOME.indexOf("<DecisionOS />"));
    expect(HOME.indexOf("<DecisionOS />")).toBeLessThan(HOME.indexOf("<Clarity />"));
    expect(FRONT).toContain('data-decision-os=""');
    expect(FRONT).toContain("Decision Readiness Intelligence™");
    expect(FRONT).not.toContain("Decision Intelligence OS");
  });

  it("connects only to real, canonical product destinations", () => {
    for (const href of ["/assessment", "/tools", "/agents", "/dashboard"]) {
      expect(FRONT).toContain(`href: "${href}"`);
    }
    expect(FRONT).toContain('href="/b2b"');
    expect(FRONT).not.toContain("/scanner");
    expect(FRONT).not.toContain("/command-center");
  });

  it("uses the canonical public score name", () => {
    expect(FRONT).toContain("Decision Readiness Score");
    expect(`${FRONT}\n${B2B}`).not.toContain("HōMI Score");
  });
});

describe("B2B2C and developer positioning", () => {
  it("preserves privacy boundaries while naming all three delivery models", () => {
    expect(B2B).toContain('data-b2b2c-model=""');
    expect(B2B).toContain("Employers");
    expect(B2B).toContain("Partners");
    expect(B2B).toContain("Developers + agents");
    expect(B2B).toContain("aggregate");
    expect(B2B).toContain('href="/architecture.json"');
  });
});
