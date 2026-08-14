import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scoreToVerdict } from "@/lib/scoring/engine";

// ---------------------------------------------------------------------------
// Landing canon guard (audit T2.4) + Wave 1 chrome honesty
// ---------------------------------------------------------------------------
//
// HōMI's moat is verdict integrity: a rendered (score, verdict) pair on any
// marketing surface must agree with scoreToVerdict() in lib/scoring/engine.ts.
// Wave 1 goes further: homepage theater must not present a fake 0–100
// HōMI-Score as the visitor's score at all. Temperature illustrations are
// allowed. The engine boundary cases below stay locked.

describe("landing canon — homepage theater is not a fake score", () => {
  it("does not hardcode visitor-facing (score, verdict) pairs", () => {
    const home = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");
    const preview = readFileSync(
      join(process.cwd(), "components/home/ThresholdPreview.tsx"),
      "utf8",
    );
    const shift = readFileSync(join(process.cwd(), "components/home/VerdictShift.tsx"), "utf8");

    for (const [source, text] of [
      ["homepage", home],
      ["ThresholdPreview", preview],
      ["VerdictShift", shift],
    ] as const) {
      expect(text, source).not.toMatch(/score-numeral[^>]*>\s*(52|61|72|76)\s*</);
    }
  });
});

describe("landing canon — scoreToVerdict boundary cases", () => {
  it.each([
    [80, "READY"],
    [79, "ALMOST_THERE"],
    [65, "ALMOST_THERE"],
    [64, "BUILD_FIRST"],
    [50, "BUILD_FIRST"],
    [49, "NOT_YET"],
  ] as const)("maps score %s to %s", (score, expected) => {
    expect(scoreToVerdict(score)).toBe(expected);
  });
});

describe("landing canon — waitlist capture", () => {
  it("renders a waitlist form on the homepage, not only /waitlist", () => {
    const source = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");
    expect(source).toContain('id="waitlist"');
    expect(source).toContain("WaitlistForm");
    expect(source).toContain('source="landing"');
    expect(source).toContain('idPrefix="landing-waitlist"');
  });
});
