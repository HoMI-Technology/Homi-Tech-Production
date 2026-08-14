import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import {
  isScoreShapedShadow,
  isShadowAssessmentKind,
  loadLocalResult,
  saveLocalResult,
  type StoredAssessment,
} from "@/lib/assessment/storage";
import { discardScoreShapedShadow, pickResult } from "@/lib/assessment/resolveResult";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import type { AssessmentRow } from "@/types/database";

const BASE_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};

function makeStored(
  kind: StoredAssessment["kind"],
  completedAt = "2026-08-14T12:00:00.000Z",
): StoredAssessment {
  return {
    inputs: BASE_INPUTS,
    result: computeScore(BASE_INPUTS),
    completedAt,
    kind,
  };
}

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

describe("kind:shadow cannot become a HōMI-Score", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      localStorage: createMockStorage(),
    } as unknown as Window;
  });

  afterEach(() => {
    delete (globalThis as { window?: Window }).window;
  });

  it("refuses to persist a score-shaped shadow payload", () => {
    saveLocalResult(makeStored("shadow"));
    expect(window.localStorage.getItem("homi:last-assessment")).toBeNull();
    expect(loadLocalResult()).toBeNull();
  });

  it("discards leftover kind:shadow local results so /results stays empty", () => {
    const leftover = makeStored("shadow");
    window.localStorage.setItem("homi:last-assessment", JSON.stringify(leftover));
    window.localStorage.setItem(
      "homi-latest-verdict",
      JSON.stringify({ verdict: leftover.result.verdict, score: leftover.result.score, heldDays: 0 }),
    );
    expect(isShadowAssessmentKind("shadow")).toBe(true);
    expect(isShadowAssessmentKind("full")).toBe(false);
    expect(isScoreShapedShadow(leftover)).toBe(true);
    expect(loadLocalResult()).toBeNull();
    expect(window.localStorage.getItem("homi:last-assessment")).toBeNull();
    expect(window.localStorage.getItem("homi-latest-verdict")).toBeNull();
  });

  it("still loads a real 45-q result", () => {
    const full = makeStored("full");
    saveLocalResult(full);
    expect(loadLocalResult()?.kind).toBe("full");
    expect(loadLocalResult()?.result.score).toBe(full.result.score);
  });
});

describe("pickResult discards score-shaped shadow", () => {
  it("returns null when both sides are shadow", () => {
    expect(pickResult(makeStored("shadow"), makeStored("shadow"))).toBeNull();
  });

  it("returns the full result when the other side is shadow", () => {
    const full = makeStored("full", "2026-07-01T00:00:00.000Z");
    const shadow = makeStored("shadow", "2026-08-14T00:00:00.000Z");
    expect(pickResult(full, shadow)).toBe(full);
    expect(pickResult(shadow, full)).toBe(full);
    expect(discardScoreShapedShadow(shadow)).toBeNull();
    expect(discardScoreShapedShadow(full)).toBe(full);
  });
});

describe("mapAssessmentRowToStored discards is_shadow rows", () => {
  const baseRow = {
    id: "00000000-0000-4000-8000-000000000001",
    overall_score: 84,
    verdict: "READY" as const,
    is_shadow: false,
    completed_at: "2026-08-05T00:00:00.000Z",
    created_at: "2026-08-05T00:00:00.000Z",
    inputs: BASE_INPUTS,
    sub_scores: {
      financial: {
        debtToIncome: 8,
        downPayment: 8,
        emergencyFund: 8,
        creditHealth: 7,
        total: 31,
      },
      emotional: {
        lifeStability: 8,
        confidenceLevel: 7,
        partnerAlignment: 7,
        fomoCheck: 6,
        total: 28,
        singleRedistribution: false,
      },
      timing: { timeHorizon: 8, savingsRate: 8, downPaymentProgress: 8, total: 24 },
    },
    hard_stops: [],
    insights: null,
  } as unknown as AssessmentRow;

  it("returns null for is_shadow so leftover rows cannot print a HōMI-Score", () => {
    const mapped = mapAssessmentRowToStored({ ...baseRow, is_shadow: true } as AssessmentRow);
    expect(mapped).toBeNull();
  });

  it("still maps a full assessment row", () => {
    const mapped = mapAssessmentRowToStored(baseRow);
    expect(mapped?.kind).toBe("full");
    expect(mapped?.result.score).toBe(84);
  });
});

describe("assessments APIs reject or skip shadow as a score", () => {
  it("POST /api/assessments refuses kind:shadow before insert", () => {
    const route = readFileSync(join(process.cwd(), "app/api/assessments/route.ts"), "utf8");
    expect(route).toContain("isShadowAssessmentKind");
    expect(route).toMatch(/Shadow reads are not assessments/);
    expect(route).toMatch(/status:\s*400/);
    expect(route).toContain("is_shadow: isShadowRead");
  });

  it("GET /api/assessments/latest excludes is_shadow rows", () => {
    const route = readFileSync(join(process.cwd(), "app/api/assessments/latest/route.ts"), "utf8");
    expect(route).toMatch(/\.eq\(["']is_shadow["'],\s*false\)/);
  });
});

describe("/results does not paint leftover shadow as a HōMI-Score", () => {
  it("empty state sends guests to Assess, not a shadow score", () => {
    const page = readFileSync(join(process.cwd(), "app/(product)/results/page.tsx"), "utf8");
    expect(page).toContain("discardScoreShapedShadow");
    expect(page).toContain('href="/assessment"');
    expect(page).toMatch(/>\s*Assess\s*</);
    expect(page).not.toContain("Get your Shadow Score");
    expect(page).not.toContain('href="/shadow-score"');
  });

  it("ResultsVerdictView refuses to print a score for kind:shadow", () => {
    const view = readFileSync(join(process.cwd(), "components/results/ResultsVerdictView.tsx"), "utf8");
    expect(view).toContain("isShadowAssessmentKind");
    expect(view).toContain('href="/assessment"');
    const guardStart = view.indexOf("if (isShadowRead)");
    const guardEnd = view.indexOf("const meta = VERDICT_META");
    const shadowGuard = view.slice(guardStart, guardEnd);
    expect(shadowGuard).toContain('href="/assessment"');
    expect(shadowGuard).toMatch(/>\s*Assess\s*</);
    expect(shadowGuard).not.toContain("CountUpScore");
    expect(shadowGuard).not.toContain("HōMI-Score");
    expect(shadowGuard).not.toContain("VerdictBadge");
  });
});
