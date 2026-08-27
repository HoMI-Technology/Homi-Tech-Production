import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "app/share/[token]/page.tsx"), "utf8");

describe("anonymous share page — no HōMI-Score, no overall numeral", () => {
  it("does not use the banned HōMI Score name", () => {
    expect(source).not.toMatch(/HōMI-Score|Homi-Score|HōMI Score/);
  });

  it("does not render the overall 0–100 numeral", () => {
    expect(source).not.toContain("{row.overall_score}");
    expect(source).not.toMatch(/score-numeral[\s\S]{0,80}overall_score/);
  });

  it("labels Decision Readiness and keeps educational-guidance / not-for copy", () => {
    expect(source).toContain("Decision Readiness");
    expect(source).toMatch(/not for credit, employment, housing, or insurance/i);
  });

  it("keeps OG/unfurl generic with no READY gate in metadata", () => {
    expect(source).toContain("Private HōMI share");
    expect(source).toContain('robots: { index: false, follow: false }');
    expect(source).not.toMatch(/openGraph:[\s\S]{0,200}READY/);
  });
});
