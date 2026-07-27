// @vitest-environment jsdom
/**
 * The Companion's cross-ecosystem context builders. The contract that
 * matters most: the Companion must never present the finance store's
 * placeholder defaults as the user's own numbers — finance context only
 * exists once the user has actually saved finance data.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCompanionContext,
  buildFinanceContext,
  buildPathContext,
  buildSurfaceContext,
} from "@/lib/advisor/context";
import { DEFAULT_FINANCE_STATE, saveFinanceState } from "@/lib/finance/store";
import { saveReadinessPath, type ReadinessPath } from "@/lib/readiness";

beforeEach(() => {
  window.localStorage.clear();
});

function samplePath(overrides: Partial<ReadinessPath> = {}): ReadinessPath {
  return {
    id: "path-test-1",
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    assessmentCompletedAt: "2026-07-01T00:00:00.000Z",
    verdict: "BUILD_FIRST",
    score: 52,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    mode: "build",
    calendarCommittedAt: null,
    steps: [
      {
        id: "step-1",
        title: "Build emergency runway",
        kind: "milestone",
        daysFromNow: 3,
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        href: "/tools/runway",
        notes: "Protective step — educational only.",
        fundingTarget: 6000,
        fundingLabel: "1-month runway target",
        status: "pending",
        completedAt: null,
      },
      {
        id: "step-reassess",
        title: "Reassess readiness",
        kind: "review",
        daysFromNow: 60,
        reasonCode: "REASSESS",
        href: "/assessment",
        notes: "Re-run when the binding constraint moves.",
        fundingTarget: null,
        fundingLabel: null,
        status: "pending",
        completedAt: null,
      },
    ],
    ...overrides,
  };
}

describe("buildFinanceContext", () => {
  it("returns undefined until the user has saved finance data", () => {
    expect(buildFinanceContext()).toBeUndefined();
  });

  it("derives the money picture from saved state", () => {
    saveFinanceState({
      ...DEFAULT_FINANCE_STATE,
      monthlyIncome: 8000,
      monthlyExpenses: 5000,
      monthlyDebtPayments: 1000,
      liquidSavings: 24000,
      totalDebt: 30000,
      assets: [{ id: "a", name: "Cash", amount: 50000 }],
      liabilities: [{ id: "l", name: "Loans", amount: 30000 }],
    });

    const ctx = buildFinanceContext();
    expect(ctx).toBeDefined();
    expect(ctx?.monthlyIncome).toBe(8000);
    expect(ctx?.netCashFlow).toBe(2000); // 8000 - 5000 - 1000
    expect(ctx?.savingsRate).toBe(25); // 2000 / 8000
    expect(ctx?.runwayMonths).toBe(4); // 24000 / 6000
    expect(ctx?.dti).toBe(12.5); // 1000 / 8000
    expect(ctx?.liquidSavings).toBe(24000);
    expect(ctx?.totalDebt).toBe(30000);
    expect(ctx?.netWorth).toBe(20000); // 50000 - 30000
  });

  it("reports runway as null when there is no outflow", () => {
    saveFinanceState({
      ...DEFAULT_FINANCE_STATE,
      monthlyExpenses: 0,
      monthlyDebtPayments: 0,
    });
    expect(buildFinanceContext()?.runwayMonths).toBeNull();
  });
});

describe("buildSurfaceContext", () => {
  it("maps known routes to human labels, most specific prefix first", () => {
    expect(buildSurfaceContext("/tools/mortgage")).toBe("the mortgage calculator");
    expect(buildSurfaceContext("/tools")).toBe("the financial tools hub");
    expect(buildSurfaceContext("/finance")).toBe("the Finance Command dashboard");
  });

  it("returns undefined for unknown or missing routes", () => {
    expect(buildSurfaceContext("/settings")).toBeUndefined();
    expect(buildSurfaceContext(null)).toBeUndefined();
    expect(buildSurfaceContext(undefined)).toBeUndefined();
  });
});

describe("buildPathContext", () => {
  it("returns undefined when no path is stored", () => {
    expect(buildPathContext()).toBeUndefined();
  });

  it("maps a stored path into a compact companion block", () => {
    saveReadinessPath(samplePath());
    const path = buildPathContext();
    expect(path).toBeDefined();
    expect(path?.verdict).toBe("BUILD_FIRST");
    expect(path?.bindingConstraint).toMatch(/runway/i);
    expect(path?.nextStepTitle).toBe("Build emergency runway");
    expect(path?.nextStepHref).toBe("/tools/runway");
    expect(path?.stepCount).toBe(2);
    expect(path?.mode).toBe("build");
    expect(path?.confidence).toBe("assessment_only");
    expect(path?.pendingCount).toBe(2);
    expect(path?.completionPct).toBeGreaterThanOrEqual(0);
    expect(path?.boardMeetingLine).toMatch(/Path coach|binding|READY/i);
  });

  it("prefers the first non-REASSESS step as next", () => {
    saveReadinessPath(
      samplePath({
        steps: [
          {
            id: "reassess-first",
            title: "Reassess readiness",
            kind: "review",
            daysFromNow: 90,
            reasonCode: "REASSESS",
            href: "/assessment",
            notes: "Review",
            fundingTarget: null,
            fundingLabel: null,
            status: "pending",
            completedAt: null,
          },
          {
            id: "action",
            title: "Stabilize cash flow",
            kind: "milestone",
            daysFromNow: 5,
            reasonCode: "NEGATIVE_CASHFLOW",
            href: "/finance",
            notes: "Educational",
            fundingTarget: null,
            fundingLabel: null,
            status: "pending",
            completedAt: null,
          },
        ],
      }),
    );
    expect(buildPathContext()?.nextStepTitle).toBe("Stabilize cash flow");
    expect(buildPathContext()?.nextStepHref).toBe("/finance");
  });
});

describe("buildCompanionContext", () => {
  it("assembles assessment, finance, and surface without leaking defaults", () => {
    const ctx = buildCompanionContext("/finance");
    // Nothing saved: no assessment, no finance, no path — but the surface is known.
    expect(ctx.assessment).toBeUndefined();
    expect(ctx.finance).toBeUndefined();
    expect(ctx.path).toBeUndefined();
    expect(ctx.surface).toBe("the Finance Command dashboard");
  });

  it("includes path when localStorage has a readiness path", () => {
    saveReadinessPath(samplePath({ confidence: "assessment_plus_finance" }));
    const ctx = buildCompanionContext("/finance");
    expect(ctx.path).toBeDefined();
    expect(ctx.path?.confidence).toBe("assessment_plus_finance");
    expect(ctx.path?.stepCount).toBe(2);
  });
});
