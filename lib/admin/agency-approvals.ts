/**
 * Pure approval-spine helpers for marketing_assets.
 * Status machine is the load-bearing CEO gate — keep tests green.
 */

export type AssetStatus = "draft" | "in_review" | "approved" | "published" | "rejected";
export type AssetKind =
  | "post"
  | "caption"
  | "image_brief"
  | "drip_step"
  | "brief"
  | "week_slot"
  | "insight"
  | "analytics"
  | "competitor_derived";

export const CLAIM_LAW_REV = "v1";

const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  draft: ["in_review", "approved", "rejected"],
  in_review: ["approved", "rejected", "draft"],
  approved: ["published", "rejected", "draft"],
  published: [],
  rejected: ["draft"],
};

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function requiresSecondConfirm(asset: {
  kind: string;
  flagged?: string[] | null;
}): boolean {
  if (asset.kind === "competitor_derived") return true;
  return Array.isArray(asset.flagged) && asset.flagged.length > 0;
}

export function queueDepth(
  rows: { status: string }[],
  pending: AssetStatus[] = ["draft", "in_review"],
): number {
  return rows.filter((r) => pending.includes(r.status as AssetStatus)).length;
}

export function isPublishable(status: string): boolean {
  return status === "approved";
}

/** Allowed status for cron-created rows (created_by null). */
export function isCronSafeStatus(status: AssetStatus): boolean {
  return status === "draft" || status === "in_review" || status === "rejected";
}

export type MarketingAssetRow = {
  id: string;
  created_at: string;
  updated_at: string;
  kind: AssetKind | string;
  status: AssetStatus | string;
  platform: string | null;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  source: string;
  model: string | null;
  flagged: string[];
  claim_law_rev: string;
  agent_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  published_at: string | null;
  publish_target: string | null;
  publish_status: number | null;
  parent_id: string | null;
};

export function sortQueueNewestFirst(rows: MarketingAssetRow[]): MarketingAssetRow[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
