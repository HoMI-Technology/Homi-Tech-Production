import { describe, it, expect } from "vitest";
import {
  transactionCreateSchema,
  transactionUpdateSchema,
  budgetPeriodUpsertSchema,
  savingsGoalUpsertSchema,
  moneyCentsSchema,
} from "@/lib/finance/validation";

const validCreate = {
  id: "3f0b9a4e-8f6d-4a6e-9b2b-1c2d3e4f5a6b",
  idempotencyKey: "transaction-create:user-1:3f0b9a4e-8f6d",
  type: "expense" as const,
  amountCents: 14_632,
  description: "Groceries",
  categoryId: "7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
  transactionDate: "2026-08-02",
};

describe("moneyCentsSchema", () => {
  it("accepts positive integers within the ceiling", () => {
    expect(moneyCentsSchema.safeParse(1).success).toBe(true);
    expect(moneyCentsSchema.safeParse(10_000_000_000).success).toBe(true);
  });

  it("rejects zero, negatives, fractions, and overflow", () => {
    expect(moneyCentsSchema.safeParse(0).success).toBe(false);
    expect(moneyCentsSchema.safeParse(-100).success).toBe(false);
    expect(moneyCentsSchema.safeParse(10.5).success).toBe(false);
    expect(moneyCentsSchema.safeParse(10_000_000_001).success).toBe(false);
  });
});

describe("transactionCreateSchema", () => {
  it("accepts a valid manual expense", () => {
    const result = transactionCreateSchema.safeParse(validCreate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("manual");
      expect(result.data.isExcludedFromBudget).toBe(false);
    }
  });

  it("requires a category on expenses", () => {
    const result = transactionCreateSchema.safeParse({
      ...validCreate,
      categoryId: null,
    });
    expect(result.success).toBe(false);
  });

  it("allows uncategorized income", () => {
    const result = transactionCreateSchema.safeParse({
      ...validCreate,
      type: "income",
      categoryId: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a categorized transfer", () => {
    const result = transactionCreateSchema.safeParse({
      ...validCreate,
      type: "transfer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects forged imported sources from clients", () => {
    const result = transactionCreateSchema.safeParse({
      ...validCreate,
      source: "plaid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short idempotency keys and malformed dates", () => {
    expect(
      transactionCreateSchema.safeParse({ ...validCreate, idempotencyKey: "short" }).success,
    ).toBe(false);
    expect(
      transactionCreateSchema.safeParse({
        ...validCreate,
        transactionDate: "2026-08-02T10:00:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("transactionUpdateSchema", () => {
  it("requires expectedUpdatedAt plus at least one changed field", () => {
    const stampOnly = transactionUpdateSchema.safeParse({
      expectedUpdatedAt: "2026-08-02T19:12:00.000Z",
    });
    expect(stampOnly.success).toBe(false);

    const withField = transactionUpdateSchema.safeParse({
      expectedUpdatedAt: "2026-08-02T19:12:00.000Z",
      amountCents: 15_210,
    });
    expect(withField.success).toBe(true);
  });

  it("rejects a missing concurrency stamp", () => {
    expect(transactionUpdateSchema.safeParse({ amountCents: 15_210 }).success).toBe(false);
  });
});

describe("budgetPeriodUpsertSchema", () => {
  const validPeriod = {
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    expectedIncomeCents: 650_000,
    goalReserveCents: 150_000,
    allocations: [
      {
        categoryId: "7a1b2c3d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
        plannedCents: 65_000,
      },
    ],
  };

  it("accepts a valid period with allocations", () => {
    const result = budgetPeriodUpsertSchema.safeParse(validPeriod);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allocations[0].rolloverMode).toBe("none");
    }
  });

  it("allows a zero-planned allocation but not a negative one", () => {
    const zero = budgetPeriodUpsertSchema.safeParse({
      ...validPeriod,
      allocations: [{ ...validPeriod.allocations[0], plannedCents: 0 }],
    });
    expect(zero.success).toBe(true);
    const negative = budgetPeriodUpsertSchema.safeParse({
      ...validPeriod,
      allocations: [{ ...validPeriod.allocations[0], plannedCents: -1 }],
    });
    expect(negative.success).toBe(false);
  });

  it("rejects an inverted period", () => {
    const result = budgetPeriodUpsertSchema.safeParse({
      ...validPeriod,
      periodStart: "2026-08-31",
      periodEnd: "2026-08-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("savingsGoalUpsertSchema", () => {
  it("accepts the v1 single-goal shape", () => {
    const result = savingsGoalUpsertSchema.safeParse({
      name: "Emergency fund",
      goalType: "emergency_reserve",
      targetAmountCents: 1_000_000,
      currentAmountCents: 250_000,
      targetDate: "2027-06-01",
      plannedMonthlyContributionCents: 100_000,
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("allows a paused goal with zero contribution but rejects a zero target", () => {
    const paused = savingsGoalUpsertSchema.safeParse({
      name: "Trip",
      goalType: "travel",
      targetAmountCents: 200_000,
      currentAmountCents: 0,
      targetDate: null,
      plannedMonthlyContributionCents: 0,
      status: "paused",
    });
    expect(paused.success).toBe(true);

    const zeroTarget = savingsGoalUpsertSchema.safeParse({
      name: "Broken",
      goalType: "custom",
      targetAmountCents: 0,
      currentAmountCents: 0,
      targetDate: null,
      plannedMonthlyContributionCents: 0,
      status: "active",
    });
    expect(zeroTarget.success).toBe(false);
  });
});
