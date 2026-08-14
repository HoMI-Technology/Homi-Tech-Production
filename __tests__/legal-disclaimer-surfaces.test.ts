import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LEGAL_DISCLAIMER } from "@/lib/brand";

/**
 * Part G / compliance honesty — score & readiness surfaces that show legal
 * disclaimer chrome must render the verbatim `LEGAL_DISCLAIMER` from
 * `lib/brand`, not an abbreviated hard-coded variant.
 */

const ROOT = process.cwd();

const SCORE_SURFACES_REQUIRING_FULL_DISCLAIMER = [
  "components/results/ResultsVerdictView.tsx",
  "app/(product)/report/[id]/page.tsx",
  "app/(product)/report/[id]/print/page.tsx",
  "app/(product)/report/[id]/credential/page.tsx",
  "app/(product)/report/[id]/path-certificate/page.tsx",
  "app/share/[token]/page.tsx",
] as const;

/** Truncated hero line formerly on /results — must never reappear as copy. */
const ABBREVIATED_RESULTS_DISCLAIMER =
  "Educational guidance only — not financial, legal, tax, mortgage, or investment advice.";

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("LEGAL_DISCLAIMER SSOT", () => {
  it("is the full verbatim canon string", () => {
    expect(LEGAL_DISCLAIMER).toBe(
      "HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage broker, registered investment advisor, credit bureau, real estate agent or brokerage, financial planner, bank or deposit institution, or product recommendation engine. HōMI provides educational guidance only and does not provide financial, legal, tax, mortgage, real estate, or investment advice.",
    );
  });
});

describe("score surfaces render full LEGAL_DISCLAIMER", () => {
  it.each(SCORE_SURFACES_REQUIRING_FULL_DISCLAIMER)(
    "%s imports and renders LEGAL_DISCLAIMER",
    (rel) => {
      const src = readSrc(rel);
      expect(src).toMatch(/import\s*\{[^}]*\bLEGAL_DISCLAIMER\b[^}]*\}\s*from\s*["']@\/lib\/brand["']/);
      expect(src).toMatch(/\{LEGAL_DISCLAIMER\}/);
      expect(src).not.toContain(ABBREVIATED_RESULTS_DISCLAIMER);
    },
  );

  it("/results does not hardcode an abbreviated disclaimer", () => {
    const page = readSrc("app/(product)/results/page.tsx");
    const verdict = readSrc("components/results/ResultsVerdictView.tsx");
    expect(page).not.toContain(ABBREVIATED_RESULTS_DISCLAIMER);
    expect(verdict).not.toContain(ABBREVIATED_RESULTS_DISCLAIMER);
    expect(verdict).toContain("{LEGAL_DISCLAIMER}");
  });
});
