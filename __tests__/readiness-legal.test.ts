import { describe, expect, it } from "vitest";
import {
  HOUSING_READINESS_DISCLAIMER,
  PATH_LEGAL_SHORT,
  CERTIFICATE_LEGAL,
  HOUSING_COPY_BANNED,
} from "@/lib/readiness/legal";
import { PATH_DISCLAIMER } from "@/lib/readiness";

describe("housing legal copy", () => {
  it("core disclaimers avoid banned approval language", () => {
    const corpus = [
      HOUSING_READINESS_DISCLAIMER,
      PATH_LEGAL_SHORT,
      CERTIFICATE_LEGAL,
      PATH_DISCLAIMER,
    ]
      .join("\n")
      .toLowerCase();
    for (const banned of HOUSING_COPY_BANNED) {
      // Allow "not a commitment…" — only affirmative claims are banned.
      expect(corpus).not.toContain(banned);
    }
    expect(corpus).not.toMatch(/\byou're approved\b/);
    expect(corpus).not.toMatch(/\bpre-approved\b/);
  });

  it("states not a commitment to lend", () => {
    expect(HOUSING_READINESS_DISCLAIMER.toLowerCase()).toMatch(
      /not a commitment to lend|not.*lender/,
    );
    expect(PATH_DISCLAIMER.toLowerCase()).toMatch(/not a commitment to lend/);
  });
});
