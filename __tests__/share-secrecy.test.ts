import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Public /share/[token] is token-gated but anonymous-readable (Slack unfurl
 * counts as furnishing). Two-piece coarseness: public HTML must not be richer
 * than the partner receipt — verdict + coarse bands, never a raw 0–100.
 */
const PAGE = fs.readFileSync(
  path.join(process.cwd(), "app", "share", "[token]", "page.tsx"),
  "utf8",
);

describe("public share page coarseness", () => {
  it("never interpolates the raw overall 0–100 into markup or aria", () => {
    expect(PAGE).not.toMatch(/\{row\.overall_score\}/);
    expect(PAGE).not.toMatch(/out of 100/);
    expect(PAGE).not.toMatch(/score-numeral/);
  });

  it("never renders pillar strength as percentages or ScoreRings", () => {
    expect(PAGE).not.toMatch(/pillarPct\(/);
    expect(PAGE).not.toMatch(/ScoreRing/);
    expect(PAGE).not.toMatch(/max=\{PILLAR_MAX_POINTS\./);
    expect(PAGE).not.toMatch(/value=\{row\.(?:financial|emotional|timing)_score\}/);
  });

  it("maps through the SHIPPED receipt band helpers", () => {
    expect(PAGE).toMatch(/scoreBand\(/);
    expect(PAGE).toMatch(/pillarBand\(/);
    expect(PAGE).toContain('from "@/lib/receipts"');
  });

  it("still names the instrument Decision Readiness Score", () => {
    expect(PAGE).toContain("Decision Readiness Score");
  });
});
