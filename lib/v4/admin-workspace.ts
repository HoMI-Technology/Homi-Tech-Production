/**
 * Admin v4 — Shell v4 ops console. Attention + live SSOT only.
 * Not personal Home. Not HeroScore. Not invent $ or new rooms.
 * Companion / Ask / Homie stay off `/admin*`. K4 Team stays closed.
 */

import { parseV4VisualState } from "@/lib/v4/system-surfaces";
import { V4_SHELL_ADMIN_HREF } from "@/lib/layout/v4-shell";
import type { AttentionItem } from "@/components/operate/AttentionStrip";
import type { MetricCell } from "@/components/operate/MetricRail";

export const V4_ADMIN_HREF = V4_SHELL_ADMIN_HREF;
export const ADMIN_V4_CONTEXT = "Admin" as const;

export const ADMIN_V4_EMPTY_TITLE = "Nothing needs attention." as const;
export const ADMIN_V4_EMPTY_ATTENTION = "Nothing queued." as const;

export const ADMIN_V4_LIVE_TITLE = "Ops home." as const;

export const ADMIN_V4_USERS_EMPTY = "No users yet." as const;
export const ADMIN_V4_REFRESH_CTA = "Refresh" as const;

export const ADMIN_V4_MARKETING_TITLE = "Marketing." as const;
export const ADMIN_V4_MARKETING_BODY =
  "X + TikTok only · Queue/Approve not Publish · no auto-publish · non-engine peers stay off." as const;

export const V4_ADMIN_VISUAL_STATES = ["empty", "normal"] as const;
export type V4AdminVisualState = (typeof V4_ADMIN_VISUAL_STATES)[number];
export type AdminV4Kind = V4AdminVisualState;

export type AdminV4KpiId = "users" | "orgs" | "assessments7d" | "waitlist";

export type AdminV4Kpi = {
  id: AdminV4KpiId;
  label: string;
  value: string;
  href: string;
};

export type AdminV4Job = {
  id: string;
  title: string;
  href: string;
  cta: string;
};

export type AdminV4Draft = {
  id: string;
  title: string;
  platform: "x" | "tiktok";
  action: "approve" | "queue";
};

export type AdminV4View = {
  kind: AdminV4Kind;
  decisionContext: typeof ADMIN_V4_CONTEXT;
  title: string;
  body: string | null;
  attention: readonly AttentionItem[];
  attentionEmpty: typeof ADMIN_V4_EMPTY_ATTENTION | null;
  kpis: readonly AdminV4Kpi[];
  jobs: readonly AdminV4Job[];
};

export type AdminV4Source = {
  userCount: number;
  orgCount: number;
  assessments7d: number;
  waitlistCount: number;
  emailFailedCount: number;
};

export const ADMIN_V4_EMPTY_SOURCE: AdminV4Source = {
  userCount: 0,
  orgCount: 0,
  assessments7d: 0,
  waitlistCount: 0,
  emailFailedCount: 0,
};

export function adminV4Assessments7dSinceIso(now = new Date()): string {
  const since = new Date(now.getTime());
  since.setUTCDate(since.getUTCDate() - 7);
  since.setUTCHours(0, 0, 0, 0);
  return since.toISOString();
}

export function parseV4AdminVisualState(
  raw: string | null | undefined,
): V4AdminVisualState | null {
  return parseV4VisualState(raw, V4_ADMIN_VISUAL_STATES);
}

export function adminV4ForbidsHeroScore(view: unknown): boolean {
  if (
    view &&
    typeof view === "object" &&
    ("score" in view || "overallScore" in view || "heroScore" in view || "overall_score" in view)
  ) {
    return false;
  }
  const blob = JSON.stringify(view);
  return (
    !blob.includes("HeroScore") &&
    !blob.includes("ThresholdFold") &&
    !blob.includes("overall_score") &&
    !/\b\d{1,3}\s*\/\s*100\b/.test(blob)
  );
}

export function adminV4ForbidsInventedDollars(view: unknown): boolean {
  return !/\$\d/.test(JSON.stringify(view));
}

/** Ops console never paints On track — there is no personal hard-stop theater. */
export function adminV4ForbidsOnTrackCopy(view: unknown): boolean {
  return !/\bOn track\b/.test(JSON.stringify(view));
}

/** Ops console never paints READY as a verdict badge. */
export function adminV4ForbidsReadyCopy(view: unknown): boolean {
  return !/\bREADY\b/.test(JSON.stringify(view));
}

function attentionFromLive(source: AdminV4Source): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (source.waitlistCount > 0) {
    items.push({
      id: "waitlist",
      severity: source.waitlistCount >= 20 ? "warn" : "info",
      title: "Review waitlist spike",
      detail: `${source.waitlistCount.toLocaleString()} live signups`,
      href: "/admin/waitlist",
      cta: "Open waitlist",
    });
  }
  if (source.emailFailedCount > 0) {
    items.push({
      id: "email",
      severity: "warn",
      title: "Email bounce check",
      detail: `${source.emailFailedCount.toLocaleString()} failed sends`,
      href: "/admin/email",
      cta: "Open email",
    });
  }
  return items;
}

function hasLiveHonestyCounts(source: AdminV4Source): boolean {
  return (
    source.userCount > 0 ||
    source.orgCount > 0 ||
    source.assessments7d > 0 ||
    source.waitlistCount > 0
  );
}

function kpisFromLive(source: AdminV4Source): AdminV4Kpi[] {
  if (!hasLiveHonestyCounts(source)) return [];
  return [
    {
      id: "users",
      label: "Users",
      value: source.userCount.toLocaleString(),
      href: "/admin/users",
    },
    {
      id: "orgs",
      label: "Orgs",
      value: source.orgCount.toLocaleString(),
      href: "/admin/organizations",
    },
    {
      id: "assessments7d",
      label: "Assessments 7d",
      value: source.assessments7d.toLocaleString(),
      href: "/admin/assessments",
    },
    {
      id: "waitlist",
      label: "Waitlist",
      value: source.waitlistCount.toLocaleString(),
      href: "/admin/waitlist",
    },
  ];
}

function jobsFromAttention(items: readonly AttentionItem[]): AdminV4Job[] {
  return items
    .filter((item) => item.href && item.cta)
    .map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href as string,
      cta: item.cta as string,
    }));
}

export function buildAdminV4View(source: AdminV4Source): AdminV4View {
  const attention = attentionFromLive(source);
  const kpis = kpisFromLive(source);
  if (attention.length === 0 && kpis.length === 0) {
    return {
      kind: "empty",
      decisionContext: ADMIN_V4_CONTEXT,
      title: ADMIN_V4_EMPTY_TITLE,
      body: null,
      attention: [],
      attentionEmpty: ADMIN_V4_EMPTY_ATTENTION,
      kpis: [],
      jobs: [],
    };
  }
  return {
    kind: "normal",
    decisionContext: ADMIN_V4_CONTEXT,
    title: ADMIN_V4_LIVE_TITLE,
    body: null,
    attention,
    attentionEmpty: attention.length === 0 ? ADMIN_V4_EMPTY_ATTENTION : null,
    kpis,
    jobs: jobsFromAttention(attention),
  };
}

export function adminV4VisualView(state: V4AdminVisualState): AdminV4View {
  if (state === "empty") {
    return buildAdminV4View(ADMIN_V4_EMPTY_SOURCE);
  }
  return buildAdminV4View({
    userCount: 18,
    orgCount: 4,
    assessments7d: 7,
    waitlistCount: 24,
    emailFailedCount: 2,
  });
}

export function adminV4MetricCells(view: AdminV4View): MetricCell[] {
  return view.kpis
    .filter((kpi) => kpi.label.trim().length > 0 && kpi.value.trim().length > 0)
    .map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
    }));
}

export const ADMIN_V4_ENGINE_PLATFORMS = ["x", "tiktok"] as const;

export function adminV4DraftsFromAssets(
  rows: readonly { id: string; title?: string | null; platform?: string | null; status?: string }[],
): AdminV4Draft[] {
  return rows
    .filter((row) => row.platform === "x" || row.platform === "tiktok")
    .map((row) => ({
      id: row.id,
      title: row.title?.trim() || `Draft · ${row.platform === "x" ? "X" : "TikTok"}`,
      platform: row.platform as "x" | "tiktok",
      action: row.status === "in_review" ? "approve" : "queue",
    }));
}

export function adminV4VisualDrafts(state: V4AdminVisualState): AdminV4Draft[] {
  if (state === "empty") return [];
  return [
    { id: "fixture-x", title: "Draft · X", platform: "x", action: "approve" },
    { id: "fixture-tiktok", title: "Draft · TikTok", platform: "tiktok", action: "queue" },
  ];
}

/** Assessments room — live rows only. Never a READY badge or score field. */
export const ADMIN_V4_ASSESSMENTS_EMPTY = "No assessments yet." as const;
export const ADMIN_V4_ASSESSMENTS_TITLE = "Assessments." as const;
export const ADMIN_V4_ASSESSMENTS_HOLD = "DO NOT PROCEED" as const;
export const ADMIN_V4_ASSESSMENTS_IN_PROGRESS = "In progress" as const;
export const ADMIN_V4_ASSESSMENTS_COMPLETE = "Completed read" as const;

export type AdminAssessmentsV4KindLabel = "Shadow" | "Full";
export type AdminAssessmentsV4Status =
  | typeof ADMIN_V4_ASSESSMENTS_HOLD
  | typeof ADMIN_V4_ASSESSMENTS_IN_PROGRESS
  | typeof ADMIN_V4_ASSESSMENTS_COMPLETE;

export type AdminAssessmentsV4Row = {
  id: string;
  dateLabel: string;
  kindLabel: AdminAssessmentsV4KindLabel;
  holdCount: number;
  statusLabel: AdminAssessmentsV4Status;
};

export type AdminAssessmentsV4View = {
  kind: "empty" | "normal";
  title: string;
  rows: readonly AdminAssessmentsV4Row[];
  shown: number;
  completed: number;
  waitCount: number;
  shadowCount: number;
};

export type AdminAssessmentsV4SourceRow = {
  id: string;
  created_at: string | null;
  verdict: string | null;
  is_shadow: boolean;
  hard_stops: unknown;
};

function adminAssessmentsV4HoldCount(hardStops: unknown): number {
  return Array.isArray(hardStops) ? hardStops.length : 0;
}

export function adminAssessmentsV4DateLabel(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function adminAssessmentsV4StatusLabel(
  row: Pick<AdminAssessmentsV4SourceRow, "verdict" | "hard_stops">,
): AdminAssessmentsV4Status {
  if (adminAssessmentsV4HoldCount(row.hard_stops) > 0) return ADMIN_V4_ASSESSMENTS_HOLD;
  if (!row.verdict) return ADMIN_V4_ASSESSMENTS_IN_PROGRESS;
  return ADMIN_V4_ASSESSMENTS_COMPLETE;
}

export function buildAdminAssessmentsV4View(
  rows: readonly AdminAssessmentsV4SourceRow[],
): AdminAssessmentsV4View {
  if (rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_ASSESSMENTS_EMPTY,
      rows: [],
      shown: 0,
      completed: 0,
      waitCount: 0,
      shadowCount: 0,
    };
  }
  return {
    kind: "normal",
    title: ADMIN_V4_ASSESSMENTS_TITLE,
    rows: rows.map((row) => ({
      id: row.id,
      dateLabel: adminAssessmentsV4DateLabel(row.created_at),
      kindLabel: row.is_shadow ? "Shadow" : "Full",
      holdCount: adminAssessmentsV4HoldCount(row.hard_stops),
      statusLabel: adminAssessmentsV4StatusLabel(row),
    })),
    shown: rows.length,
    completed: rows.filter((row) => row.verdict !== null).length,
    waitCount: rows.filter(
      (row) => row.verdict === "BUILD_FIRST" || row.verdict === "NOT_YET",
    ).length,
    shadowCount: rows.filter((row) => row.is_shadow).length,
  };
}
