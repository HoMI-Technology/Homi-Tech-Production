/**
 * Budget & Runway — Zod validation for ledger mutations (PR 1).
 *
 * These schemas validate request shape only. Server routes must still
 * independently verify ownership (category, parent transaction, account
 * belong to the caller), derive userId from the authenticated session,
 * and refuse imported-source values from ordinary clients — none of that
 * is expressible in a body schema.
 */

import { z } from "zod";
import { MAX_MONEY_CENTS } from "@/lib/finance/money";

/** Positive integer cents within the storage ceiling. */
export const moneyCentsSchema = z.number().int().positive().max(MAX_MONEY_CENTS);

const dateOnlySchema = z.iso.date();

export const transactionCreateSchema = z
  .object({
    id: z.uuid(),
    idempotencyKey: z.string().min(16).max(200),

    type: z.enum(["income", "expense", "transfer", "refund", "adjustment"]),
    amountCents: moneyCentsSchema,

    description: z.string().trim().min(1).max(160),
    merchantName: z.string().trim().max(160).nullable().optional(),
    categoryId: z.uuid().nullable(),
    accountId: z.uuid().nullable().optional(),

    transactionDate: dateOnlySchema,
    parentTransactionId: z.uuid().nullable().optional(),
    transferGroupId: z.uuid().nullable().optional(),

    isExcludedFromBudget: z.boolean().default(false),
    userNote: z.string().trim().max(500).nullable().optional(),

    // Clients may only author manual rows; plaid/recurring_rule/migration
    // sources are server-assigned.
    source: z.literal("manual").default("manual"),
  })
  .superRefine((value, ctx) => {
    if (value.type === "expense" && value.categoryId === null) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Expense transactions require a category.",
      });
    }
    if (value.type === "transfer" && value.categoryId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryId"],
        message: "Transfers are not categorized spending.",
      });
    }
  });

export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

/** PATCH body — optimistic concurrency via expectedUpdatedAt (409 on stale). */
export const transactionUpdateSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),

    amountCents: moneyCentsSchema.optional(),
    description: z.string().trim().min(1).max(160).optional(),
    merchantName: z.string().trim().max(160).nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    transactionDate: dateOnlySchema.optional(),
    isExcludedFromBudget: z.boolean().optional(),
    userNote: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "Update must change at least one field.",
  });

export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;

export const budgetAllocationSchema = z.object({
  categoryId: z.uuid(),
  plannedCents: z.number().int().min(0).max(MAX_MONEY_CENTS),
  rolloverMode: z.enum(["none", "positive_only", "full"]).default("none"),
});

export const budgetPeriodUpsertSchema = z
  .object({
    periodStart: dateOnlySchema,
    periodEnd: dateOnlySchema,
    expectedIncomeCents: moneyCentsSchema.nullable(),
    goalReserveCents: z.number().int().min(0).max(MAX_MONEY_CENTS),
    allocations: z.array(budgetAllocationSchema).max(100),
  })
  .refine((value) => value.periodStart <= value.periodEnd, {
    path: ["periodEnd"],
    message: "Period end must not precede its start.",
  });

export type BudgetPeriodUpsertInput = z.infer<typeof budgetPeriodUpsertSchema>;

/** POST body — client-chosen id + idempotency key, same as transactions. */
export const budgetPeriodCreateSchema = budgetPeriodUpsertSchema.extend({
  id: z.uuid(),
  idempotencyKey: z.string().min(16).max(200),
});

export type BudgetPeriodCreateInput = z.infer<typeof budgetPeriodCreateSchema>;

/** PATCH body — expectedUpdatedAt guards the period row; providing
 *  `allocations` replaces the period's allocation set (move-money is just
 *  two changed plannedCents in that set). */
export const budgetPeriodPatchSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),

    expectedIncomeCents: moneyCentsSchema.nullable().optional(),
    goalReserveCents: z.number().int().min(0).max(MAX_MONEY_CENTS).optional(),
    status: z.enum(["open", "closed"]).optional(),
    allocations: z.array(budgetAllocationSchema).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "Update must change at least one field.",
  });

export type BudgetPeriodPatchInput = z.infer<typeof budgetPeriodPatchSchema>;

export const savingsGoalUpsertSchema = z.object({
  name: z.string().trim().min(1).max(80),
  goalType: z.enum([
    "emergency_reserve",
    "home",
    "vehicle",
    "education",
    "family",
    "travel",
    "custom",
  ]),
  targetAmountCents: moneyCentsSchema,
  currentAmountCents: z.number().int().min(0).max(MAX_MONEY_CENTS),
  targetDate: dateOnlySchema.nullable(),
  plannedMonthlyContributionCents: z.number().int().min(0).max(MAX_MONEY_CENTS),
  linkedDecisionId: z.uuid().nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]),
});

export type SavingsGoalUpsertInput = z.infer<typeof savingsGoalUpsertSchema>;

const recurringCadenceSchema = z.enum([
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "annual",
]);

/** Clients author manual rules only; plaid_detected rows are server-owned. */
export const recurringRuleCreateSchema = z
  .object({
    id: z.uuid(),
    idempotencyKey: z.string().min(16).max(200),

    type: z.enum(["income", "expense"]),
    amountCents: moneyCentsSchema,
    description: z.string().trim().min(1).max(160),
    categoryId: z.uuid().nullable(),

    cadence: recurringCadenceSchema,
    startDate: dateOnlySchema,
    nextOccurrenceDate: dateOnlySchema,
    endDate: dateOnlySchema.nullable().optional(),

    generationMode: z.enum(["forecast_only", "create_pending"]).default("forecast_only"),
    isActive: z.boolean().default(true),

    detectionSource: z.literal("manual").default("manual"),
  })
  .refine((value) => value.endDate == null || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: "End date must not precede the start date.",
  });

export type RecurringRuleCreateInput = z.infer<typeof recurringRuleCreateSchema>;

/** PATCH body — optimistic concurrency via expectedUpdatedAt (409 on stale). */
export const recurringRuleUpdateSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),

    amountCents: moneyCentsSchema.optional(),
    description: z.string().trim().min(1).max(160).optional(),
    categoryId: z.uuid().nullable().optional(),
    cadence: recurringCadenceSchema.optional(),
    nextOccurrenceDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.nullable().optional(),
    generationMode: z.enum(["forecast_only", "create_pending"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "Update must change at least one field.",
  });

export type RecurringRuleUpdateInput = z.infer<typeof recurringRuleUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Category rules (Phase 2)                                            */
/* ------------------------------------------------------------------ */

export const categoryRuleCreateSchema = z.object({
  matchType: z.enum(["payee_exact", "payee_contains"]),
  /** Normalized server-side (normalizePayee) before storage. */
  pattern: z.string().trim().min(1).max(160),
  categoryId: z.uuid(),
  /** Lower number = evaluated first. */
  priority: z.number().int().min(0).max(10000).default(100),
});

export type CategoryRuleCreateInput = z.infer<typeof categoryRuleCreateSchema>;

/** PATCH body — optimistic concurrency via expectedUpdatedAt (409 on stale). */
export const categoryRuleUpdateSchema = z
  .object({
    expectedUpdatedAt: z.iso.datetime(),

    matchType: z.enum(["payee_exact", "payee_contains"]).optional(),
    pattern: z.string().trim().min(1).max(160).optional(),
    categoryId: z.uuid().optional(),
    priority: z.number().int().min(0).max(10000).optional(),
  })
  .refine((value) => Object.keys(value).length > 1, {
    message: "Update must change at least one field.",
  });

export type CategoryRuleUpdateInput = z.infer<typeof categoryRuleUpdateSchema>;
