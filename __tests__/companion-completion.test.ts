// @vitest-environment jsdom
/**
 * The final ladder rungs: credit context (defaults-leak gate + freshness),
 * the share preview's confidence honesty, and the tool hand-off allowlist
 * (only known product routes ever become links).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { buildCreditContext, type CompanionContext } from "@/lib/advisor/context";
import { saveCreditState, DEFAULT_CREDIT_STATE, hasSavedCreditState } from "@/lib/credit/store";
import { buildSharePreview } from "@/lib/advisor/share-preview";

beforeEach(() => {
  window.localStorage.clear();
});

describe("credit context", () => {
  it("returns undefined until the user has saved credit data", () => {
    expect(hasSavedCreditState()).toBe(false);
    expect(buildCreditContext()).toBeUndefined();
  });

  it("derives the credit picture with freshness after a save", () => {
    saveCreditState({ ...DEFAULT_CREDIT_STATE, score: 705, utilization: 22 });
    const ctx = buildCreditContext();
    expect(ctx?.score).toBe(705);
    expect(ctx?.utilization).toBe(22);
    expect(ctx?.ageDays).toBe(0);
  });

  it("reports ageDays null for pre-feature saves", () => {
    window.localStorage.setItem("homi:credit", JSON.stringify(DEFAULT_CREDIT_STATE));
    expect(buildCreditContext()?.ageDays).toBeNull();
  });
});

describe("share preview", () => {
  function context(overrides: Partial<CompanionContext>): CompanionContext {
    return {
      assessment: undefined,
      finance: undefined,
      credit: undefined,
      surface: undefined,
      whatChanged: undefined,
      path: undefined,
      ...overrides,
    };
  }

  const assessment = {
    score: 71,
    verdict: "ALMOST_THERE" as const,
    pillars: { financial: 80, emotional: 69, timing: 63 },
    hardStops: [],
    ageDays: 5,
    previousScore: null,
  };

  it("returns null without an assessment — nothing truthful to preview", () => {
    expect(buildSharePreview(context({}))).toBeNull();
  });

  it("is high confidence only when the assessment is fresh and a money picture exists", () => {
    const preview = buildSharePreview(
      context({
        assessment,
        finance: {
          monthlyIncome: 8000,
          netCashFlow: 2000,
          savingsRate: 25,
          runwayMonths: 4,
          dti: 12.5,
          liquidSavings: 24000,
          totalDebt: 30000,
          netWorth: 20000,
          ageDays: 3,
        },
      }),
    );
    expect(preview?.confidence).toBe("high");
    expect(preview?.dataQuality.some((l) => l.includes("self-reported"))).toBe(true);
    expect(preview?.disclaimer).toContain("Not a credit decision");
  });

  it("drops confidence for each degradation and says why", () => {
    const stale = buildSharePreview(context({ assessment: { ...assessment, ageDays: 120 } }));
    // Two degradations: stale assessment + no money picture.
    expect(stale?.confidence).toBe("low");
    expect(stale?.confidenceReasons.some((r) => r.includes("90 days"))).toBe(true);
    expect(stale?.confidenceReasons.some((r) => r.includes("no money picture"))).toBe(true);

    const noFinance = buildSharePreview(context({ assessment }));
    expect(noFinance?.confidence).toBe("medium");
  });

  it("carries hard stops verbatim — never hidden from a would-be viewer", () => {
    const preview = buildSharePreview(
      context({ assessment: { ...assessment, hardStops: ["DTI above 50%"] } }),
    );
    expect(preview?.hardStops).toEqual(["DTI above 50%"]);
  });
});

describe("tool hand-off link allowlist", () => {
  const INTERNAL_PATH =
    /(\/(?:tools\/[a-z-]+|assessment|shadow-score|finance|credit|results|plan|simulator|advisor|connections|dashboard))(?=[\s.,;:!?)]|$)/g;

  function linkedPaths(text: string): string[] {
    return Array.from(text.matchAll(INTERNAL_PATH), (m) => m[1]);
  }

  it("links known product routes", () => {
    expect(linkedPaths("Run your numbers at /tools/debt-payoff.")).toEqual(["/tools/debt-payoff"]);
    expect(linkedPaths("Start at /shadow-score, then /finance.")).toEqual([
      "/shadow-score",
      "/finance",
    ]);
  });

  it("never links unknown or external-looking paths", () => {
    expect(linkedPaths("Check /admin/users or /etc/passwd or https://evil.example/x")).toEqual([]);
    expect(linkedPaths("A /tools/UNKNOWN path stays plain")).toEqual([]);
  });
});
