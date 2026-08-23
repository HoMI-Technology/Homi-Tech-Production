import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REPORT = readFileSync(
  resolve(process.cwd(), "app/(product)/report/[id]/page.tsx"),
  "utf8",
);
const HOW = readFileSync(
  resolve(process.cwd(), "app/(marketing)/how-it-works/page.tsx"),
  "utf8",
);

const LOCKED = [
  "The Decision Readiness Score is not a credit score.",
  "Lenders will still pull a credit report.",
] as const;

describe("Ticket 4 copy lock", () => {
  it("puts the locked sentences on the record and how-it-works", () => {
    for (const line of LOCKED) {
      expect(REPORT).toContain(line);
      expect(HOW).toContain(line);
    }
    expect(REPORT).toContain("Fannie&apos;s manual floor is still 620.");
    expect(HOW).toContain("gates are their gates, not a HōMI verdict.");
  });

  it("does not mount the finance ThresholdCompass on the record", () => {
    expect(REPORT).not.toContain("@/components/finance/ThresholdCompass");
  });

  it("never ships replacement claims", () => {
    const blob = `${REPORT}\n${HOW}`;
    expect(blob).not.toContain("replace your credit score");
    expect(blob).not.toContain("HōMI-approved");
    expect(blob).not.toContain("share with your lender");
    expect(blob).not.toContain("UltraFICO");
    expect(blob).not.toContain("FICO alternative");
  });
});
