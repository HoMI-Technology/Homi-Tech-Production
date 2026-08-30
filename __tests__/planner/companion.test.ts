/**
 * Planner companion voice never gives buy advice and never renders a raw verdict key.
 */
import { describe, it, expect } from "vitest";
import { VERDICT_META } from "@/lib/brand";
import {
  buildCompanionReply,
  greeting,
  type CompanionFinanceContext,
} from "@/lib/planner/companion";

const healthyCtx: CompanionFinanceContext = {
  monthlyIncome: 6650,
  netCashFlow: 3033,
  savingsRate: 46,
  runwayMonths: 5.2,
  dti: 3,
  liquidSavings: 18720.6,
  netWorth: 72098.56,
  portfolioValue: 57077.95,
  pathVerdict: "ALMOST_THERE",
  pathBinding: null,
  pathNextStep: "Top up the emergency fund to 6 months",
  pathCompletionPct: 40,
};

describe("planner companion voice", () => {
  it("greeting voice is character-exact with macron brand spelling", () => {
    const g = greeting();
    expect(g).toContain("your HōMI for this decision, not your banker and not a hype man");
    expect(g).not.toContain("homie"); // spelling law: user-visible copy says HōMI
    expect(g).toContain("HōMI");
  });

  it("hard-stop context gets a protection reply with zero advice language", () => {
    const hardStopCtx: CompanionFinanceContext = {
      ...healthyCtx,
      netCashFlow: -180,
      runwayMonths: 0.4,
      dti: 55,
      pathVerdict: "NOT_YET",
      pathBinding: null,
    };
    const reply = buildCompanionReply("am i ready to buy?", hardStopCtx);
    expect(reply).toContain("Straight answer: not yet");
    expect(reply).toContain("protective gate");
    expect(reply).not.toMatch(/recommend|you should buy|go for it/i);
  });

  it("FOMO keyword gets urgency deflection", () => {
    const reply = buildCompanionReply("everyone else is buying and the fomo is real", healthyCtx);
    expect(reply).toContain("Manufactured urgency");
    expect(reply).toContain("30 quiet days");
  });

  it("'should I buy' hits the not-advice guardrail with finance context", () => {
    const reply = buildCompanionReply("should I buy this house?", healthyCtx);
    expect(reply).toContain("crosses into advice");
    expect(reply).toContain("YOUR cash flow, runway, and debt load");
  });

  it("'should I buy' hits the not-advice guardrail even without finance context", () => {
    const reply = buildCompanionReply("should i buy?", null);
    expect(reply).toContain("crosses into advice");
  });

  it("verdict label resolves through canon VERDICT_META — the raw key is never rendered", () => {
    const reply = buildCompanionReply("where am I on the path?", healthyCtx);
    expect(reply).toContain(`Path verdict: ${VERDICT_META.ALMOST_THERE.label}.`);
    expect(reply).toContain("Path verdict: ALMOST THERE.");
    expect(reply).not.toContain("ALMOST_THERE");
  });
});
