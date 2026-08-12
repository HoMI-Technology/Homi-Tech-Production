import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scoreToVerdict, type Verdict } from "@/lib/scoring/engine";

// ---------------------------------------------------------------------------
// Landing canon guard (audit T2.4)
// ---------------------------------------------------------------------------
//
// HōMI's moat is verdict integrity: a rendered (score, verdict) pair on any
// marketing surface must agree with the single source of truth,
// scoreToVerdict() in lib/scoring/engine.ts. The audit found the landing
// "Permissioned Readiness Summary" card showing 82 labeled "ALMOST THERE"
// when 82 >= 80 is actually READY — a canon violation, since a real user
// landing on 82 would see READY inside the product.
//
// This test hardcodes every (score, verdict-label) pair currently rendered
// on marketing surfaces and asserts each is consistent with the engine.
// If you add or change a hardcoded score/verdict illustration anywhere in
// app/(marketing)/** or components/home/**, add the pair here too.

/** Marketing-surface verdict label -> canonical Verdict enum value. */
const LABEL_TO_VERDICT: Record<string, Verdict> = {
  READY: "READY",
  "ALMOST THERE": "ALMOST_THERE",
  "BUILD FIRST": "BUILD_FIRST",
  "NOT YET": "NOT_YET",
};

interface RenderedPair {
  /** Where this pair is rendered, for traceability. */
  source: string;
  score: number;
  label: string;
}

/**
 * Every hardcoded (score, verdict-label) pair currently rendered on a
 * marketing surface. Keep this list in sync with the JSX.
 */
const RENDERED_PAIRS: RenderedPair[] = [
  {
    source: "app/(marketing)/page.tsx — Build First sample verdict card",
    score: 52,
    label: "BUILD FIRST",
  },
  {
    source: "app/(marketing)/page.tsx — Permissioned Readiness Summary card",
    score: 76,
    label: "ALMOST THERE",
  },
  {
    source: "components/home/VerdictShift.tsx — pre-shift state",
    score: 72,
    label: "ALMOST THERE",
  },
  {
    source: "components/home/VerdictShift.tsx — post-shift state",
    score: 61,
    label: "BUILD FIRST",
  },
];

describe("landing canon — hardcoded marketing (score, verdict) pairs", () => {
  it.each(RENDERED_PAIRS)(
    "$source renders $score as $label, matching scoreToVerdict",
    ({ score, label, source }) => {
      const expectedVerdict = LABEL_TO_VERDICT[label];
      expect(expectedVerdict, `unknown verdict label "${label}" for ${source}`).toBeDefined();
      expect(scoreToVerdict(score)).toBe(expectedVerdict);
    },
  );
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
  });
});
