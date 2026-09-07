import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUESTION_BANK } from "@/lib/questions/bank";
import { getQuestionById } from "@/lib/questions/flow";
import {
  allAdaptiveIdsAreLiveBankIds,
  buildAdaptiveHomeBuyingFlow,
  HOME_EMOTIONAL_CORE_IDS,
  HOME_EMOTIONAL_ENRICHMENT_IDS,
  HOME_FINANCIAL_CORE_IDS,
  HOME_FINANCIAL_ENRICHMENT_IDS,
  HOME_PATH_ESTIMATE,
  HOME_TIMING_CORE_IDS,
  HOME_TIMING_ENRICHMENT_IDS,
  hasRealBankAnswer,
  isSkipEligibleEnrichmentId,
  offeredEmotionalCoreIds,
  offeredFinancialCoreIds,
  pathProgressLabel,
  shouldSkipDtiRatio,
  stripEmotionalResponses,
} from "@/lib/questions/adaptive-home";

const liveIds = new Set(QUESTION_BANK.map((q) => q.id));

describe("adaptive home_buying path — Option 1", () => {
  it("only references live bank ids — no invented scoring questions", () => {
    expect(allAdaptiveIdsAreLiveBankIds()).toBe(true);
    for (const id of [
      ...HOME_FINANCIAL_CORE_IDS,
      ...HOME_EMOTIONAL_CORE_IDS,
      ...HOME_TIMING_CORE_IDS,
      ...HOME_FINANCIAL_ENRICHMENT_IDS,
      ...HOME_EMOTIONAL_ENRICHMENT_IDS,
      ...HOME_TIMING_ENRICHMENT_IDS,
    ]) {
      expect(liveIds.has(id)).toBe(true);
      expect(getQuestionById(id)?.decision_types).toContain("home_buying");
    }
  });

  it("does not touch WEIGHTS or invent choice values", () => {
    const src = readFileSync(join(process.cwd(), "lib/questions/adaptive-home.ts"), "utf8");
    expect(src).not.toMatch(/\bWEIGHTS\b/);
    expect(src).not.toMatch(/lib\/scoring/);
  });

  it("offers financial core in live order_index and skips enrichment", () => {
    const flow = buildAdaptiveHomeBuyingFlow({
      responses: {},
      emotionalSkipped: false,
    });
    const questionIds = flow.filter((s) => s.kind === "question").map((s) => s.questionId);
    for (const id of HOME_FINANCIAL_ENRICHMENT_IDS) {
      expect(questionIds).not.toContain(id);
    }
    const financial = questionIds.filter((id) => id.startsWith("fin_"));
    const ordered = [...financial].sort(
      (a, b) => (getQuestionById(a)?.order_index ?? 0) - (getQuestionById(b)?.order_index ?? 0),
    );
    expect(financial).toEqual(ordered);
    expect(financial).toContain("fin_dti_ratio");
  });

  it("skips fin_dti_ratio when income > 0 and debt is answered — DTI is computed", () => {
    const responses = { fin_income: 8000, fin_debt_payments: 1200 };
    expect(shouldSkipDtiRatio(responses)).toBe(true);
    expect(offeredFinancialCoreIds(responses)).not.toContain("fin_dti_ratio");
    const flow = buildAdaptiveHomeBuyingFlow({ responses, emotionalSkipped: false });
    const ids = flow.filter((s) => s.kind === "question").map((s) => s.questionId);
    expect(ids).not.toContain("fin_dti_ratio");
  });

  it("must ask fin_dti_ratio when income is 0 or missing", () => {
    expect(shouldSkipDtiRatio({ fin_income: 0, fin_debt_payments: 200 })).toBe(false);
    expect(offeredFinancialCoreIds({ fin_income: 0, fin_debt_payments: 200 })).toContain(
      "fin_dti_ratio",
    );
    expect(offeredFinancialCoreIds({ fin_debt_payments: 200 })).toContain("fin_dti_ratio");
  });

  it("omits every emo_* step when the whole ET pillar is skipped", () => {
    const flow = buildAdaptiveHomeBuyingFlow({
      responses: { emo_confidence: 8, emo_fomo: "mixed" },
      emotionalSkipped: true,
    });
    expect(flow.some((s) => s.kind === "intro" && s.dimension === "emotional")).toBe(false);
    const ids = flow.filter((s) => s.kind === "question").map((s) => s.questionId);
    expect(ids.some((id) => id.startsWith("emo_"))).toBe(false);
    expect(stripEmotionalResponses({ emo_confidence: 8, fin_income: 1 })).toEqual({
      fin_income: 1,
    });
  });

  it("does not confuse ET skip with partner solo or credit skipped band", () => {
    const soloFlow = buildAdaptiveHomeBuyingFlow({
      responses: { emo_partner_alignment: "solo" },
      emotionalSkipped: false,
    });
    const soloIds = soloFlow.filter((s) => s.kind === "question").map((s) => s.questionId);
    expect(soloIds).toContain("emo_partner_alignment");
    expect(soloIds).toContain("emo_confidence");

    const creditFlow = buildAdaptiveHomeBuyingFlow({
      responses: { fin_credit_score: "unknown" },
      emotionalSkipped: false,
    });
    const creditIds = creditFlow.filter((s) => s.kind === "question").map((s) => s.questionId);
    expect(creditIds).toContain("fin_credit_score");
    expect(creditIds.some((id) => id.startsWith("emo_"))).toBe(true);
  });

  it("does not offer emo_clarity while lifestyle_ready is still on the path", () => {
    expect(offeredEmotionalCoreIds({}, false)).toEqual([
      "emo_confidence",
      "emo_partner_alignment",
      "emo_fomo",
      "emo_lifestyle_ready",
    ]);
    expect(offeredEmotionalCoreIds({}, false)).not.toContain("emo_clarity");
  });

  it("never offers skip-eligible enrichment on the adaptive home path", () => {
    const flow = buildAdaptiveHomeBuyingFlow({
      responses: {
        fin_income: 9000,
        fin_debt_payments: 1000,
        emo_lifestyle_ready: 7,
      },
      emotionalSkipped: false,
    });
    const ids = flow.filter((s) => s.kind === "question").map((s) => s.questionId);
    for (const id of ids) {
      expect(isSkipEligibleEnrichmentId(id)).toBe(false);
    }
    expect(ids).toEqual(expect.arrayContaining([...HOME_TIMING_CORE_IDS]));
    expect(ids.length).toBeLessThan(45);
  });

  it("always offers conflict steps and review after cores", () => {
    const flow = buildAdaptiveHomeBuyingFlow({ responses: {}, emotionalSkipped: true });
    const kinds = flow.map((s) => s.kind);
    expect(kinds.slice(-3)).toEqual(["conflict-referral", "conflict-deadline", "review"]);
  });

  it("progress chrome is path-true — never N of 45", () => {
    const label = pathProgressLabel("financial", 4);
    expect(label).toBe("Financial Reality · 4 of ~8 this path");
    expect(label).not.toMatch(/45/);
    expect(HOME_PATH_ESTIMATE.financial).toBe(HOME_FINANCIAL_CORE_IDS.length);
    expect(HOME_PATH_ESTIMATE.financial).toBeGreaterThanOrEqual(7);
    expect(HOME_PATH_ESTIMATE.financial).toBeLessThanOrEqual(8);
    expect(offeredFinancialCoreIds({}).length).toBe(HOME_PATH_ESTIMATE.financial);
    expect(
      offeredFinancialCoreIds({ fin_income: 8000, fin_debt_payments: 1200 }).length,
    ).toBe(HOME_PATH_ESTIMATE.financial - 1);
    expect(hasRealBankAnswer({}, "fin_income")).toBe(false);
  });
});
