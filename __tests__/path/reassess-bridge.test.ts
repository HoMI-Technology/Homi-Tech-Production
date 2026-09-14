import { describe, expect, it } from "vitest";
import { computeReassessment } from "@/lib/path/reassess";
import {
  milestoneToCalendarEntry,
  planToCalendarEntries,
  parsePathPlanMarker,
} from "@/lib/path/calendar-bridge";
import { buildPathSummary } from "@/lib/path/path-summary";
import { canTransitionPartnerState, partnerStateLabel } from "@/lib/path/partner";
import { patchMilestoneBodySchema, partnerStateBodySchema } from "@/lib/path/validation";
import { generatePath } from "@/lib/path/generator";
import type { PathMetricsInput } from "@/lib/path/types";
import type { ReassessPlanInput } from "@/lib/path/reassess";

const METRICS: PathMetricsInput = {
  asOf: "2026-09-01",
  completeness: "medium",
  monthsWithData: 2,
  monthlyIncomeCents: 500_000,
  monthlyOutflowCents: 400_000,
  monthlyDebtPaymentsCents: 300_000,
  liquidSavingsCents: 100_000,
  runwayMonths: 0.3,
  dtiPct: 60,
  surplusCents: -100_000,
};

describe("reassessment", () => {
  const plan: ReassessPlanInput = {
    milestones: [
      {
        id: "m1",
        kind: "hard_stop",
        status: "pending",
        targetAmountCents: 50_000,
        reasonCode: "DTI_OVER_50",
        fundingSourceMetric: "dti",
      },
      {
        id: "m2",
        kind: "hard_stop",
        status: "pending",
        targetAmountCents: 300_000,
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        fundingSourceMetric: "runway",
      },
      {
        id: "m3",
        kind: "evidence",
        status: "pending",
        targetAmountCents: null,
        reasonCode: null,
        fundingSourceMetric: null,
      },
    ],
  };

  it("marks hard stops done only when recorded data meets the line", () => {
    const notYet = computeReassessment(
      plan,
      { metrics: { ...METRICS, dtiPct: 55, runwayMonths: 0.5 }, goals: [] },
      "2026-10-01",
    );
    expect(notYet.updates.find((u) => u.id === "m1")?.status).toBe("pending");
    expect(notYet.readyToReassess).toBe(false);

    const met = computeReassessment(
      plan,
      { metrics: { ...METRICS, dtiPct: 48, runwayMonths: 1.2 }, goals: [] },
      "2026-10-01",
    );
    expect(met.updates.find((u) => u.id === "m1")?.status).toBe("done");
    expect(met.updates.find((u) => u.id === "m2")?.status).toBe("done");
    expect(met.readyToReassess).toBe(true);
  });

  it("never overrides manual skipped/done states", () => {
    const p: ReassessPlanInput = {
      milestones: [{ ...plan.milestones[0], status: "skipped" }],
    };
    const r = computeReassessment(p, { metrics: { ...METRICS, dtiPct: 20 }, goals: [] }, "2026-10-01");
    expect(r.updates[0].status).toBe("skipped");
  });

  it("missing metrics → no invented progress", () => {
    const r = computeReassessment(plan, { metrics: null, goals: [] }, "2026-10-01");
    expect(r.updates.find((u) => u.id === "m1")?.progressPct).toBeNull();
    expect(r.readyToReassess).toBe(false);
  });

  it("evidence milestone completes at 3 months of data", () => {
    const r = computeReassessment(
      plan,
      { metrics: { ...METRICS, monthsWithData: 3 }, goals: [] },
      "2026-10-01",
    );
    expect(r.updates.find((u) => u.id === "m3")?.status).toBe("done");
  });

  it("goal savings milestones track recorded goal balances", () => {
    const p: ReassessPlanInput = {
      milestones: [
        {
          id: "g",
          kind: "savings",
          status: "active",
          targetAmountCents: 400_000,
          reasonCode: null,
          fundingSourceMetric: "savings_goal",
          fundingSourceGoalId: "g1",
        },
      ],
    };
    const r = computeReassessment(
      p,
      {
        metrics: METRICS,
        goals: [
          {
            id: "g1",
            name: "House",
            goalType: "home",
            targetAmountCents: 500_000,
            currentAmountCents: 500_000,
            targetDate: null,
          },
        ],
      },
      "2026-10-01",
    );
    expect(r.updates[0].status).toBe("done");
    expect(r.updates[0].progressPct).toBe(100);
  });

  it("readyToReassess is false when a plan has no hard-stop milestones", () => {
    const p: ReassessPlanInput = {
      milestones: [{ ...plan.milestones[2] }],
    };
    const r = computeReassessment(
      p,
      { metrics: { ...METRICS, monthsWithData: 6 }, goals: [] },
      "2026-10-01",
    );
    expect(r.readyToReassess).toBe(false);
  });
});

describe("calendar bridge", () => {
  const input = {
    verdict: "NOT_YET" as const,
    hardStops: [{ code: "DTI_OVER_50" as const, message: "m" }],
    pillars: {
      financial: { total: 10, max: 35 },
      emotional: { total: 30, max: 35 },
      timing: { total: 25, max: 30 },
    },
    metrics: METRICS,
    goals: [],
    asOfDate: "2026-09-14",
  };

  it("maps milestones to calendar-event shapes with provenance notes + marker", () => {
    const path = generatePath(input);
    const entries = planToCalendarEntries(path.milestones, "plan-1");
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.eventDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["milestone", "deadline", "review", "payment"]).toContain(e.kind);
      expect(parsePathPlanMarker(e.notes)).toEqual({
        planId: "plan-1",
        milestoneId: e.milestoneId,
      });
      expect(e.notes).toContain("HōMI Path");
    }
    // hard_stop → deadline
    expect(entries[0].kind).toBe("deadline");
  });

  it("skips milestones with no target date — never fabricates a pin", () => {
    const path = generatePath(input);
    const undated = { ...path.milestones[0], targetDate: null };
    expect(milestoneToCalendarEntry(undated, "plan-1")).toBeNull();
  });

  it("notes never contain banned advisory wording", () => {
    const path = generatePath(input);
    for (const e of planToCalendarEntries(path.milestones, "plan-1")) {
      expect(e.notes).not.toMatch(/you should|we recommend|act now|hurry/i);
    }
  });
});

describe("advisor path summary", () => {
  it("reports constraint, next milestone, and progress counts neutrally", () => {
    const path = generatePath({
      verdict: "NOT_YET",
      hardStops: [{ code: "DTI_OVER_50", message: "m" }],
      pillars: {
        financial: { total: 10, max: 35 },
        emotional: { total: 30, max: 35 },
        timing: { total: 25, max: 30 },
      },
      metrics: METRICS,
      goals: [],
      asOfDate: "2026-09-14",
    });
    const line = buildPathSummary({
      status: "active",
      bindingConstraint: path.bindingConstraint,
      milestones: path.milestones,
      statusById: new Map(path.milestones.map((m) => [m.id, "pending" as const])),
    });
    expect(line).toContain("Active path:");
    expect(line).toContain("Current constraint:");
    expect(line).toContain("Next milestone:");
    expect(line).not.toMatch(/you should|recommend|buy/i);
  });

  it("returns null for archived/completed plans", () => {
    const line = buildPathSummary({
      status: "archived",
      bindingConstraint: { code: "x", label: "x", rationale: "x", evidenceRefs: [] },
      milestones: [],
      statusById: new Map(),
    });
    expect(line).toBeNull();
  });
});

describe("partner state", () => {
  it("allows explicit transitions between all states, including diverged", () => {
    for (const from of ["aligned", "diverged", "pending"] as const) {
      for (const to of ["aligned", "diverged", "pending"] as const) {
        expect(canTransitionPartnerState(from, to)).toBe(true);
      }
    }
  });

  it("labels disagreement neutrally", () => {
    expect(partnerStateLabel("diverged")).not.toMatch(/conflict|problem|fail/i);
  });

  it("validation rejects unknown states and non-uuid partners", () => {
    expect(
      partnerStateBodySchema.safeParse({
        plan_id: "not-a-uuid",
        partner_user_id: "also-not",
        state: "fighting",
      }).success,
    ).toBe(false);
    expect(
      partnerStateBodySchema.safeParse({
        plan_id: "123e4567-e89b-42d3-a456-426614174000",
        partner_user_id: "123e4567-e89b-42d3-a456-426614174001",
        state: "diverged",
      }).success,
    ).toBe(true);
  });

  it("milestone patch schema permits status only — never amounts", () => {
    expect(patchMilestoneBodySchema.safeParse({ status: "done" }).success).toBe(true);
    expect(
      patchMilestoneBodySchema.safeParse({ status: "done", target_amount_cents: 5 }).success,
    ).toBe(false);
    expect(patchMilestoneBodySchema.safeParse({ status: "deleted" }).success).toBe(false);
  });
});
