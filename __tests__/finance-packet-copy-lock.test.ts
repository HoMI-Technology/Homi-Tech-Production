import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RESULTS = readFileSync(
  resolve(process.cwd(), "components/results/ResultsVerdictView.tsx"),
  "utf8",
);
const HOW = readFileSync(
  resolve(process.cwd(), "app/(marketing)/how-it-works/page.tsx"),
  "utf8",
);

const LOCKED = [
  "HōMI Score is not a credit score.",
  "Lenders will still pull a credit report.",
] as const;

describe("Ticket 4 copy lock", () => {
  it("puts the locked sentences on Results and how-it-works", () => {
    for (const line of LOCKED) {
      expect(RESULTS).toContain(line);
      expect(HOW).toContain(line);
    }
    expect(RESULTS).toContain("Fannie&apos;s manual floor is still 620.");
    expect(HOW).toContain("Fannie&apos;s manual floor is still 620.");
  });

  it("does not mount the finance ThresholdCompass on Results", () => {
    expect(RESULTS).toContain('from "@/components/brand/ThresholdCompass"');
    expect(RESULTS).not.toContain("@/components/finance/ThresholdCompass");
  });

  it("never ships replacement claims", () => {
    const blob = `${RESULTS}\n${HOW}`;
    expect(blob).not.toContain("replace your credit score");
    expect(blob).not.toContain("HōMI-approved");
    expect(blob).not.toContain("share with your lender");
    expect(blob).not.toContain("UltraFICO");
    expect(blob).not.toContain("FICO alternative");
  });
});
