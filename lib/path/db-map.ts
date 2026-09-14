/**
 * Snake_case ↔ domain mappers for the Path to Ready tables
 * (migration 20260914000006). Pure — no I/O — so route tests can assert
 * shape without a DB. Row types live in @/types/database.ts.
 */

import type {
  PathMilestoneRow,
  PathPartnerStateRow,
  PathPlanRow,
} from "@/types/database";
import type { MilestoneProvenance } from "./types";

export interface PathPlan {
  id: string;
  userId: string;
  goalId: string | null;
  status: "draft" | "active" | "completed" | "archived";
  diagnosis: Record<string, unknown>;
  bindingConstraint: string | null;
  assessmentResultId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PathMilestone {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description: string;
  kind: "hard_stop" | "savings" | "debt" | "credit" | "timing" | "evidence";
  targetDate: string | null;
  targetAmountCents: number | null;
  fundingSource: MilestoneProvenance | null;
  toolSlug: string | null;
  dependsOn: string | null;
  sortOrder: number;
  status: "pending" | "active" | "done" | "skipped";
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PathPartnerStateRecord {
  id: string;
  planId: string;
  userId: string;
  partnerUserId: string;
  state: "aligned" | "diverged" | "pending";
  partnerSnapshot: Record<string, unknown> | null;
  notedAt: string;
  createdAt: string;
}

function centsOrNull(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

export function rowToPathPlan(row: PathPlanRow): PathPlan {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    status: row.status,
    diagnosis: row.diagnosis,
    bindingConstraint: row.binding_constraint,
    assessmentResultId: row.assessment_result_id,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPathMilestone(row: PathMilestoneRow): PathMilestone {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    kind: row.milestone_kind,
    targetDate: row.target_date,
    targetAmountCents: centsOrNull(row.target_amount_cents),
    fundingSource: (row.funding_source as MilestoneProvenance | null) ?? null,
    toolSlug: row.tool_slug,
    dependsOn: row.depends_on,
    sortOrder: row.sort_order,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPathPartnerState(row: PathPartnerStateRow): PathPartnerStateRecord {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    partnerUserId: row.partner_user_id,
    state: row.state,
    partnerSnapshot: row.partner_snapshot,
    notedAt: row.noted_at,
    createdAt: row.created_at,
  };
}

/** Postgres/PostgREST codes meaning the path migration is not applied yet. */
export const PATH_INFRA_MISSING = new Set([
  "42P01", // undefined_table
  "PGRST205", // table not in schema cache
  "42703", // undefined_column
]);
