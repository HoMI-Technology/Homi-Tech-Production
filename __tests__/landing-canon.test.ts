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
// Decision Readiness Score as the visitor's score at all. Temperature illustrations are
// allowed. The engine boundary cases below stay locked.

describe("landing canon — homepage theater is not a fake score", () => {
  it("does not hardcode visitor-facing (score, verdict) pairs", () => {
    // ThresholdPreview and VerdictShift were deleted as dead code; the
    // homepage is the remaining surface this guard covers.
    const home = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");
    expect(home).not.toMatch(/score-numeral[^>]*>\s*(52|61|72|76)\s*</);
    expect(home).not.toContain("DO NOT PROCEED");
    expect(home).not.toContain("ALMOST THERE");
    expect(home).not.toContain("BUILD FIRST");
    expect(home).not.toContain("80–100");
    expect(home).not.toContain('verdict="READY"');
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
  it("does not render a waitlist form on the homepage", () => {
    const source = readFileSync(join(process.cwd(), "app/(marketing)/page.tsx"), "utf8");
    expect(source).not.toContain('id="waitlist"');
    expect(source).not.toContain("WaitlistForm");
    expect(source).not.toContain('source="landing"');
    expect(source).not.toContain('idPrefix="landing-waitlist"');
    expect(source).not.toContain("Get notified");
    expect(source).not.toContain("Packet 2");
    expect(source).not.toContain("Rehearse");
    expect(source).not.toContain("HōMI Companion");
    expect(source).not.toContain("vendor list");
  });

  it("keeps WaitlistForm on /waitlist", () => {
    const waitlist = readFileSync(join(process.cwd(), "app/(marketing)/waitlist/page.tsx"), "utf8");
    expect(waitlist).toContain("WaitlistForm");
    expect(waitlist).toContain('source="waitlist"');
  });
});
