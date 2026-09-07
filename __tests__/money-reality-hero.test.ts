/**
 * Reality surface — Stand job on /money (JOBS_CRAFT v3).
 * Quiet picture under the Home verdict. No surplus hero, no score rail.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

const stand = read("components/money/MoneyStand.tsx");
const page = read("app/(product)/money/page.tsx");

describe("Money picture — quiet Stand depth", () => {
  it("page mounts MoneyStand without a second score hero", () => {
    expect(page).toContain("<MoneyStand");
    expect(page).not.toContain("ScoreRail");
    expect(page).not.toContain("getCachedUser");
  });

  it("empty honesty and data facts stay on the live /money route", () => {
    expect(stand).toContain("Connect accounts to see money reality");
    expect(stand).toContain("Your money picture");
    expect(stand).toContain("Liquid cash");
    expect(stand).toContain("Emergency runway");
    expect(stand).toContain("Under 1 month · Path evidence");
  });

  it("does not mount compass, Fraunces, or crimson surplus glow", () => {
    expect(stand).not.toContain("ThresholdCompass");
    expect(stand).not.toContain("font-display");
    expect(stand).not.toContain("score-numeral");
    expect(stand).not.toContain("text-6xl");
  });
});

describe("Money picture — honesty contract", () => {
  it("unknown runway stays Unknown, never an invented number", () => {
    expect(stand).toContain("Unknown · Path evidence");
  });

  it("flags stay ledger-only", () => {
    expect(stand).toContain("None invented · ledger only");
  });

  it("loading skeleton is preserved and busies the surface", () => {
    expect(stand).toContain("animate-pulse");
    expect(stand).toContain('aria-busy="true"');
  });

  it("educational posture stays on the money surface", () => {
    expect(stand).toMatch(/educational/i);
    expect(stand).toMatch(/not provide financial, tax, mortgage, or investment/i);
  });
});
