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

/** Users room — live profiles directory. Never a score column. */
export const ADMIN_V4_USERS_CONSOLE_EMPTY =
  "No live users in this console." as const;
export const ADMIN_V4_USERS_TITLE = "Users." as const;
export const ADMIN_V4_USERS_COLUMNS = [
  "id",
  "created_at",
  "role",
  "subscription_tier",
] as const;

export type AdminUsersV4Column = (typeof ADMIN_V4_USERS_COLUMNS)[number];

export type AdminUsersV4SourceRow = {
  id: string;
  created_at: string | null;
  role: string | null;
  subscription_tier: string | null;
};

export type AdminUsersV4Row = {
  id: string;
  createdLabel: string;
  roleLabel: string;
  tierLabel: string;
};

export type AdminUsersV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminUsersV4Column[];
  rows: readonly AdminUsersV4Row[];
  shown: number;
  paidCount: number;
  adminCount: number;
  partnerCount: number;
};

export type AdminUsersV4Input = {
  rows: readonly AdminUsersV4SourceRow[];
  loadError?: boolean;
};

export function adminUsersV4DateLabel(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function adminUsersV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function buildAdminUsersV4View({
  rows,
  loadError,
}: AdminUsersV4Input): AdminUsersV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_USERS_CONSOLE_EMPTY,
      columns: ADMIN_V4_USERS_COLUMNS,
      rows: [],
      shown: 0,
      paidCount: 0,
      adminCount: 0,
      partnerCount: 0,
    };
  }
  return {
    kind: "normal",
    title: ADMIN_V4_USERS_TITLE,
    columns: ADMIN_V4_USERS_COLUMNS,
    rows: rows.map((row) => ({
      id: row.id,
      createdLabel: adminUsersV4DateLabel(row.created_at),
      roleLabel: adminUsersV4Label(row.role),
      tierLabel: adminUsersV4Label(row.subscription_tier),
    })),
    shown: rows.length,
    paidCount: rows.filter(
      (row) => Boolean(row.subscription_tier) && row.subscription_tier !== "free",
    ).length,
    adminCount: rows.filter((row) => row.role === "admin").length,
    partnerCount: rows.filter((row) => row.role === "partner").length,
  };
}

/** Organizations room — live orgs + members + family count. Never a score column. */
export const ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY =
  "No live organizations in this console." as const;
export const ADMIN_V4_ORGANIZATIONS_TITLE = "Organizations." as const;
export const ADMIN_V4_ORGANIZATIONS_COLUMNS = [
  "id",
  "name",
  "slug",
  "kind",
  "plan",
  "created_at",
] as const;

export type AdminOrganizationsV4Column =
  (typeof ADMIN_V4_ORGANIZATIONS_COLUMNS)[number];

export type AdminOrganizationsV4SourceRow = {
  id: string;
  name: string | null;
  slug: string | null;
  kind: string | null;
  plan: string | null;
  created_at: string | null;
};

export type AdminOrganizationsV4MemberRow = {
  organization_id: string;
};

export type AdminOrganizationsV4Row = {
  id: string;
  nameLabel: string;
  slugLabel: string;
  kindLabel: string;
  planLabel: string;
  createdLabel: string;
  memberCount: number;
};

export type AdminOrganizationsV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminOrganizationsV4Column[];
  rows: readonly AdminOrganizationsV4Row[];
  shown: number;
  memberCount: number;
  familyCount: number;
  employerCount: number;
  partnerCount: number;
};

export type AdminOrganizationsV4Input = {
  rows: readonly AdminOrganizationsV4SourceRow[];
  members: readonly AdminOrganizationsV4MemberRow[];
  familyCount: number;
  loadError?: boolean;
};

function adminOrganizationsV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function adminOrganizationsV4MemberCounts(
  members: readonly AdminOrganizationsV4MemberRow[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const member of members) {
    const id = member.organization_id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function buildAdminOrganizationsV4View({
  rows,
  members,
  familyCount,
  loadError,
}: AdminOrganizationsV4Input): AdminOrganizationsV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_ORGANIZATIONS_CONSOLE_EMPTY,
      columns: ADMIN_V4_ORGANIZATIONS_COLUMNS,
      rows: [],
      shown: 0,
      memberCount: 0,
      familyCount: 0,
      employerCount: 0,
      partnerCount: 0,
    };
  }
  const counts = adminOrganizationsV4MemberCounts(members);
  return {
    kind: "normal",
    title: ADMIN_V4_ORGANIZATIONS_TITLE,
    columns: ADMIN_V4_ORGANIZATIONS_COLUMNS,
    rows: rows.map((row) => ({
      id: row.id,
      nameLabel: adminOrganizationsV4Label(row.name),
      slugLabel: adminOrganizationsV4Label(row.slug),
      kindLabel: adminOrganizationsV4Label(row.kind),
      planLabel: adminOrganizationsV4Label(row.plan),
      createdLabel: adminUsersV4DateLabel(row.created_at),
      memberCount: counts.get(row.id) ?? 0,
    })),
    shown: rows.length,
    memberCount: members.length,
    familyCount,
    employerCount: rows.filter((row) => row.kind === "employer").length,
    partnerCount: rows.filter((row) => row.kind === "partner").length,
  };
}

/** Email room — live campaigns + send statuses. Never a score column or recipient PII. */
export const ADMIN_V4_EMAIL_CONSOLE_EMPTY =
  "No live email campaigns in this console." as const;
export const ADMIN_V4_EMAIL_TITLE = "Email campaigns." as const;
export const ADMIN_V4_EMAIL_COLUMNS = [
  "id",
  "name",
  "audience",
  "status",
  "sent_at",
] as const;

export type AdminEmailV4Column = (typeof ADMIN_V4_EMAIL_COLUMNS)[number];

export type AdminEmailV4SourceRow = {
  id: string;
  name: string | null;
  audience: string | null;
  status: string | null;
  sent_at: string | null;
};

export type AdminEmailV4SendRow = {
  campaign_id: string;
  status: string | null;
};

export type AdminEmailV4Row = {
  id: string;
  nameLabel: string;
  audienceLabel: string;
  statusLabel: string;
  sentLabel: string;
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
};

export type AdminEmailV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminEmailV4Column[];
  rows: readonly AdminEmailV4Row[];
  shown: number;
  draftCount: number;
  sentCount: number;
  failedCount: number;
};

export type AdminEmailV4Input = {
  rows: readonly AdminEmailV4SourceRow[];
  sends: readonly AdminEmailV4SendRow[];
  loadError?: boolean;
};

function adminEmailV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

type AdminEmailV4SendBucket = {
  sent: number;
  failed: number;
  suppressed: number;
};

function adminEmailV4SendBuckets(
  sends: readonly AdminEmailV4SendRow[],
): Map<string, AdminEmailV4SendBucket> {
  const buckets = new Map<string, AdminEmailV4SendBucket>();
  for (const send of sends) {
    const status = send.status;
    if (status !== "sent" && status !== "failed" && status !== "suppressed") {
      continue;
    }
    const current = buckets.get(send.campaign_id) ?? {
      sent: 0,
      failed: 0,
      suppressed: 0,
    };
    current[status] += 1;
    buckets.set(send.campaign_id, current);
  }
  return buckets;
}

export function buildAdminEmailV4View({
  rows,
  sends,
  loadError,
}: AdminEmailV4Input): AdminEmailV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_EMAIL_CONSOLE_EMPTY,
      columns: ADMIN_V4_EMAIL_COLUMNS,
      rows: [],
      shown: 0,
      draftCount: 0,
      sentCount: 0,
      failedCount: 0,
    };
  }
  const buckets = adminEmailV4SendBuckets(sends);
  return {
    kind: "normal",
    title: ADMIN_V4_EMAIL_TITLE,
    columns: ADMIN_V4_EMAIL_COLUMNS,
    rows: rows.map((row) => {
      const bucket = buckets.get(row.id) ?? {
        sent: 0,
        failed: 0,
        suppressed: 0,
      };
      return {
        id: row.id,
        nameLabel: adminEmailV4Label(row.name),
        audienceLabel: adminEmailV4Label(row.audience),
        statusLabel: adminEmailV4Label(row.status),
        sentLabel: adminUsersV4DateLabel(row.sent_at),
        sentCount: bucket.sent,
        failedCount: bucket.failed,
        suppressedCount: bucket.suppressed,
      };
    }),
    shown: rows.length,
    draftCount: rows.filter((row) => row.status === "draft").length,
    sentCount: sends.filter((send) => send.status === "sent").length,
    failedCount: sends.filter((send) => send.status === "failed").length,
  };
}

/** Waitlist room — live signups. Never a score column or email field. */
export const ADMIN_V4_WAITLIST_CONSOLE_EMPTY =
  "No live waitlist signups in this console." as const;
export const ADMIN_V4_WAITLIST_TITLE = "Waitlist." as const;
export const ADMIN_V4_WAITLIST_COLUMNS = [
  "id",
  "created_at",
  "status",
  "source",
] as const;

export type AdminWaitlistV4Column = (typeof ADMIN_V4_WAITLIST_COLUMNS)[number];

export type AdminWaitlistV4SourceRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  source: string | null;
  interested_in: readonly string[] | null;
};

export type AdminWaitlistV4Row = {
  id: string;
  createdLabel: string;
  statusLabel: string;
  sourceLabel: string;
  interestsLabel: string;
};

export type AdminWaitlistV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminWaitlistV4Column[];
  rows: readonly AdminWaitlistV4Row[];
  shown: number;
  taggedCount: number;
};

export type AdminWaitlistV4Input = {
  rows: readonly AdminWaitlistV4SourceRow[];
  loadError?: boolean;
};

function adminWaitlistV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function adminWaitlistV4InterestsLabel(
  interestedIn: readonly string[] | null | undefined,
): string {
  if (!interestedIn || interestedIn.length === 0) return "—";
  const labels = interestedIn.map((item) => item.trim()).filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "—";
}

export function buildAdminWaitlistV4View({
  rows,
  loadError,
}: AdminWaitlistV4Input): AdminWaitlistV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_WAITLIST_CONSOLE_EMPTY,
      columns: ADMIN_V4_WAITLIST_COLUMNS,
      rows: [],
      shown: 0,
      taggedCount: 0,
    };
  }
  return {
    kind: "normal",
    title: ADMIN_V4_WAITLIST_TITLE,
    columns: ADMIN_V4_WAITLIST_COLUMNS,
    rows: rows.map((row) => ({
      id: row.id,
      createdLabel: adminUsersV4DateLabel(row.created_at),
      statusLabel: adminWaitlistV4Label(row.status),
      sourceLabel: adminWaitlistV4Label(row.source),
      interestsLabel: adminWaitlistV4InterestsLabel(row.interested_in),
    })),
    shown: rows.length,
    taggedCount: rows.filter(
      (row) =>
        Array.isArray(row.interested_in) &&
        row.interested_in.some((item) => item.trim().length > 0),
    ).length,
  };
}

/** Analytics room — live PostHog bundle only. Never invent $ or a score column. */
export const ADMIN_V4_ANALYTICS_CONSOLE_EMPTY =
  "No live analytics in this console." as const;
export const ADMIN_V4_ANALYTICS_TITLE = "Analytics." as const;
export const ADMIN_V4_ANALYTICS_COLUMNS = [
  "visits",
  "uniques",
  "views",
] as const;

export type AdminAnalyticsV4Column = (typeof ADMIN_V4_ANALYTICS_COLUMNS)[number];

export type AdminAnalyticsV4Daily = {
  day: string;
  views: number;
  uniques: number;
};

export type AdminAnalyticsV4FunnelRow = {
  event: string;
  users: number;
  occurrences: number;
};

export type AdminAnalyticsV4Bundle = {
  overview: {
    visits: number;
    uniques: number;
    views: number;
    avgSessionSeconds: number | null;
    bounceRatePct: number | null;
  };
  daily: readonly AdminAnalyticsV4Daily[];
  funnel: readonly AdminAnalyticsV4FunnelRow[];
  pathHabitFunnel: readonly AdminAnalyticsV4FunnelRow[];
};

export type AdminAnalyticsV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminAnalyticsV4Column[];
  rows: readonly AdminAnalyticsV4FunnelRow[];
  daily: readonly AdminAnalyticsV4Daily[];
  visits: number;
  uniques: number;
  views: number;
};

export type AdminAnalyticsV4Input = {
  bundle: AdminAnalyticsV4Bundle | null;
  loadError?: boolean;
};

export function buildAdminAnalyticsV4View({
  bundle,
  loadError,
}: AdminAnalyticsV4Input): AdminAnalyticsV4View {
  if (loadError || !bundle) {
    return {
      kind: "empty",
      title: ADMIN_V4_ANALYTICS_CONSOLE_EMPTY,
      columns: ADMIN_V4_ANALYTICS_COLUMNS,
      rows: [],
      daily: [],
      visits: 0,
      uniques: 0,
      views: 0,
    };
  }
  return {
    kind: "normal",
    title: ADMIN_V4_ANALYTICS_TITLE,
    columns: ADMIN_V4_ANALYTICS_COLUMNS,
    rows: [...bundle.funnel, ...bundle.pathHabitFunnel],
    daily: [...bundle.daily],
    visits: bundle.overview.visits,
    uniques: bundle.overview.uniques,
    views: bundle.overview.views,
  };
}

/** Ad spend room — live ledger + paid counts. Never invent $ or a score column. */
export const ADMIN_V4_AD_SPEND_CONSOLE_EMPTY =
  "No live ad spend in this console." as const;
export const ADMIN_V4_AD_SPEND_TITLE = "Ad spend." as const;
export const ADMIN_V4_AD_SPEND_COLUMNS = [
  "id",
  "spend_date",
  "channel",
  "campaign",
  "spend_cents",
  "impressions",
  "clicks",
] as const;

export type AdminAdSpendV4Column = (typeof ADMIN_V4_AD_SPEND_COLUMNS)[number];

export type AdminAdSpendV4SourceRow = {
  id: string;
  spend_date: string | null;
  channel: string | null;
  campaign: string | null;
  spend_cents: number | null;
  impressions: number | null;
  clicks: number | null;
};

export type AdminAdSpendV4ProfileRow = {
  id: string;
  subscription_tier: string | null;
};

export type AdminAdSpendV4PaymentRow = {
  user_id: string | null;
  amount: number | null;
  status: string | null;
};

export type AdminAdSpendV4Row = {
  id: string;
  dateLabel: string;
  channelLabel: string;
  campaignLabel: string;
  spendCents: number;
  impressions: number;
  clicks: number;
};

export type AdminAdSpendV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminAdSpendV4Column[];
  rows: readonly AdminAdSpendV4Row[];
  shown: number;
  spendCents: number;
  paidCount: number;
  paymentCount: number;
};

export type AdminAdSpendV4Input = {
  rows: readonly AdminAdSpendV4SourceRow[];
  profiles: readonly AdminAdSpendV4ProfileRow[];
  payments: readonly AdminAdSpendV4PaymentRow[];
  loadError?: boolean;
};

function adminAdSpendV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function adminAdSpendV4Count(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function buildAdminAdSpendV4View({
  rows,
  profiles,
  payments,
  loadError,
}: AdminAdSpendV4Input): AdminAdSpendV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_AD_SPEND_CONSOLE_EMPTY,
      columns: ADMIN_V4_AD_SPEND_COLUMNS,
      rows: [],
      shown: 0,
      spendCents: 0,
      paidCount: 0,
      paymentCount: 0,
    };
  }
  const mapped = rows.map((row) => ({
    id: row.id,
    dateLabel: adminAdSpendV4Label(row.spend_date),
    channelLabel: adminAdSpendV4Label(row.channel),
    campaignLabel: adminAdSpendV4Label(row.campaign),
    spendCents: adminAdSpendV4Count(row.spend_cents),
    impressions: adminAdSpendV4Count(row.impressions),
    clicks: adminAdSpendV4Count(row.clicks),
  }));
  return {
    kind: "normal",
    title: ADMIN_V4_AD_SPEND_TITLE,
    columns: ADMIN_V4_AD_SPEND_COLUMNS,
    rows: mapped,
    shown: mapped.length,
    spendCents: mapped.reduce((sum, row) => sum + row.spendCents, 0),
    paidCount: profiles.filter(
      (row) => Boolean(row.subscription_tier) && row.subscription_tier !== "free",
    ).length,
    paymentCount: payments.filter((row) => row.status === "succeeded").length,
  };
}

/** Attribution room — first-touch snapshots only. Never a score column or invented $. */
export const ADMIN_V4_ATTRIBUTION_CONSOLE_EMPTY =
  "No live attribution in this console." as const;
export const ADMIN_V4_ATTRIBUTION_TITLE = "Attribution." as const;
export const ADMIN_V4_ATTRIBUTION_COLUMNS = [
  "channel",
  "signups",
  "paid",
  "attributed",
] as const;

export type AdminAttributionV4Column =
  (typeof ADMIN_V4_ATTRIBUTION_COLUMNS)[number];

export type AdminAttributionV4Snapshot = {
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export type AdminAttributionV4ProfileRow = {
  attribution: AdminAttributionV4Snapshot | Record<string, unknown> | null;
  subscription_tier: string | null;
};

export type AdminAttributionV4AssessmentRow = {
  attribution: AdminAttributionV4Snapshot | Record<string, unknown> | null;
};

export type AdminAttributionV4Row = {
  channelLabel: string;
  signups: number;
  paidCount: number;
  attributed: boolean;
};

export type AdminAttributionV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminAttributionV4Column[];
  rows: readonly AdminAttributionV4Row[];
  shown: number;
  attributedCount: number;
  assessmentCount: number;
};

export type AdminAttributionV4Input = {
  profiles: readonly AdminAttributionV4ProfileRow[];
  assessments: readonly AdminAttributionV4AssessmentRow[];
  loadError?: boolean;
};

function adminAttributionV4Field(
  value: unknown,
  key: "ref" | "utm_source" | "utm_medium" | "utm_campaign",
): string {
  if (!value || typeof value !== "object") return "";
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function adminAttributionV4Channel(value: unknown): string {
  const source = adminAttributionV4Field(value, "utm_source").toLowerCase();
  if (source) return source;
  const ref = adminAttributionV4Field(value, "ref");
  if (ref.startsWith("ptr_")) return "partner";
  if (ref) return "referral";
  return "direct";
}

function adminAttributionV4IsAttributed(value: unknown): boolean {
  return Boolean(
    adminAttributionV4Field(value, "utm_source") ||
      adminAttributionV4Field(value, "utm_medium") ||
      adminAttributionV4Field(value, "utm_campaign") ||
      adminAttributionV4Field(value, "ref"),
  );
}

export function buildAdminAttributionV4View({
  profiles,
  assessments,
  loadError,
}: AdminAttributionV4Input): AdminAttributionV4View {
  if (loadError || profiles.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_ATTRIBUTION_CONSOLE_EMPTY,
      columns: ADMIN_V4_ATTRIBUTION_COLUMNS,
      rows: [],
      shown: 0,
      attributedCount: 0,
      assessmentCount: 0,
    };
  }
  const buckets = new Map<string, AdminAttributionV4Row>();
  for (const profile of profiles) {
    const channelLabel = adminAttributionV4Channel(profile.attribution);
    const current = buckets.get(channelLabel) ?? {
      channelLabel,
      signups: 0,
      paidCount: 0,
      attributed: channelLabel !== "direct",
    };
    current.signups += 1;
    if (
      Boolean(profile.subscription_tier) &&
      profile.subscription_tier !== "free"
    ) {
      current.paidCount += 1;
    }
    buckets.set(channelLabel, current);
  }
  const rows = [...buckets.values()].sort((a, b) => {
    if (b.signups !== a.signups) return b.signups - a.signups;
    return a.channelLabel.localeCompare(b.channelLabel);
  });
  return {
    kind: "normal",
    title: ADMIN_V4_ATTRIBUTION_TITLE,
    columns: ADMIN_V4_ATTRIBUTION_COLUMNS,
    rows,
    shown: profiles.length,
    attributedCount: profiles.filter((row) =>
      adminAttributionV4IsAttributed(row.attribution),
    ).length,
    assessmentCount: assessments.filter((row) =>
      adminAttributionV4IsAttributed(row.attribution),
    ).length,
  };
}

/** Activity room — live audit_log rows. Never a score column or invented $. */
export const ADMIN_V4_ACTIVITY_CONSOLE_EMPTY =
  "No live activity in this console." as const;
export const ADMIN_V4_ACTIVITY_TITLE = "Activity." as const;
export const ADMIN_V4_ACTIVITY_COLUMNS = [
  "id",
  "created_at",
  "action_type",
  "resource_type",
] as const;

export type AdminActivityV4Column = (typeof ADMIN_V4_ACTIVITY_COLUMNS)[number];

export type AdminActivityV4SourceRow = {
  id: string;
  created_at: string | null;
  action_type: string | null;
  resource_type: string | null;
};

export type AdminActivityV4Row = {
  id: string;
  createdLabel: string;
  actionLabel: string;
  resourceLabel: string;
};

export type AdminActivityV4View = {
  kind: "empty" | "normal";
  title: string;
  columns: readonly AdminActivityV4Column[];
  rows: readonly AdminActivityV4Row[];
  shown: number;
  actionCount: number;
};

export type AdminActivityV4Input = {
  rows: readonly AdminActivityV4SourceRow[];
  loadError?: boolean;
};

function adminActivityV4Label(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export function buildAdminActivityV4View({
  rows,
  loadError,
}: AdminActivityV4Input): AdminActivityV4View {
  if (loadError || rows.length === 0) {
    return {
      kind: "empty",
      title: ADMIN_V4_ACTIVITY_CONSOLE_EMPTY,
      columns: ADMIN_V4_ACTIVITY_COLUMNS,
      rows: [],
      shown: 0,
      actionCount: 0,
    };
  }
  const mapped = rows.map((row) => ({
    id: row.id,
    createdLabel: adminUsersV4DateLabel(row.created_at),
    actionLabel: adminActivityV4Label(row.action_type),
    resourceLabel: adminActivityV4Label(row.resource_type),
  }));
  return {
    kind: "normal",
    title: ADMIN_V4_ACTIVITY_TITLE,
    columns: ADMIN_V4_ACTIVITY_COLUMNS,
    rows: mapped,
    shown: mapped.length,
    actionCount: new Set(mapped.map((row) => row.actionLabel)).size,
  };
}
