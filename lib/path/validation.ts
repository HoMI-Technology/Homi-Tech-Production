/**
 * Path to Ready v1 — Zod schemas for the /api/path routes.
 * Status transitions only: users can never edit amounts or dates —
 * targets come from recorded data or stay null.
 */

import { z } from "zod";

export const generatePathBodySchema = z
  .object({
    /** Optionally anchor the plan to a finance savings goal. */
    goal_id: z.string().uuid().nullish(),
  })
  .strict();

export const patchMilestoneBodySchema = z
  .object({
    status: z.enum(["pending", "active", "done", "skipped"]),
  })
  .strict();

export const partnerStateBodySchema = z
  .object({
    plan_id: z.string().uuid(),
    partner_user_id: z.string().uuid(),
    state: z.enum(["aligned", "diverged", "pending"]),
    partner_snapshot: z.record(z.string(), z.unknown()).nullish(),
  })
  .strict();

export type GeneratePathBody = z.infer<typeof generatePathBodySchema>;
export type PatchMilestoneBody = z.infer<typeof patchMilestoneBodySchema>;
export type PartnerStateBody = z.infer<typeof partnerStateBodySchema>;
