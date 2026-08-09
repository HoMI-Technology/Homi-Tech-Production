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
