import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Secrecy guard for the PUBLIC /share/[token] page (2026-08 audit, round 3).
 *
 * The page is token-gated but anonymous-readable, so it must render pillar
 * strength as normalized percentages only. Rendering raw points against
 * PILLAR_MAX_POINTS would publish the exact pillar maxima: the pair is
 * recoverable from the numeral plus the ring's arc geometry (the SVG
 * stroke-dasharray sits in the DOM). The shadow-share pages already speak
 * percentages; this keeps the full-assessment share page on the same rule.
 */
const PAGE = fs.readFileSync(
  path.join(process.cwd(), "app", "share", "[token]", "page.tsx"),
  "utf8",
);

describe("public share page secrecy", () => {
  it("never renders raw pillar points against PILLAR_MAX_POINTS", () => {
    expect(PAGE).not.toMatch(/max=\{PILLAR_MAX_POINTS\./);
    expect(PAGE).not.toMatch(/value=\{row\.(?:financial|emotional|timing)_score\}/);
  });

  it("renders pillar strength as normalized percentages", () => {
    expect(PAGE).toMatch(/pillarPct\(/);
    expect(PAGE).toMatch(/max=\{100\}/);
  });
});
