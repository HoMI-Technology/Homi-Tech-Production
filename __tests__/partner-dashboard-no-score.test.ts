import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/(product)/partner/dashboard/page.tsx"),
  "utf8",
);

describe("partner dashboard — no per-client or average overall score", () => {
  it("does not show Avg score or a Score column", () => {
    expect(source).not.toContain("Avg score");
    expect(source).not.toMatch(/<th>Score<\/th>/);
  });

  it("does not render per-row overall_score", () => {
    expect(source).not.toMatch(/a\.overall_score/);
    expect(source).not.toMatch(/Math\.round\(a\.overall_score/);
  });

  it("still shows verdict mix without averaging the 0–100", () => {
    expect(source).toContain("Verdict mix");
    expect(source).toContain("VerdictBadge");
  });
});
