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
export const ADMIN_V4_LIVE = "Live" as const;

export const ADMIN_V4_EMPTY_TITLE = "Nothing needs attention." as const;
export const ADMIN_V4_EMPTY_BODY =
  "Live ops only — never invent queues, scores, or $." as const;
export const ADMIN_V4_EMPTY_ATTENTION = "Nothing queued." as const;

export const ADMIN_V4_LIVE_TITLE = "Ops home." as const;
export const ADMIN_V4_LIVE_BODY = "Attention above KPI. No score theater. No Ask." as const;

export const ADMIN_V4_USERS_EMPTY = "No users yet." as const;
export const ADMIN_V4_USERS_EMPTY_BODY = "Calm empty — never invent a table." as const;
export const ADMIN_V4_REFRESH_CTA = "Refresh" as const;

export const ADMIN_V4_MARKETING_TITLE = "Marketing." as const;
export const ADMIN_V4_MARKETING_BODY =
  "X + TikTok only · Queue/Approve not Publish · no auto-publish · non-engine peers stay off." as const;

export const V4_ADMIN_VISUAL_STATES = ["empty", "normal"] as const;
export type V4AdminVisualState = (typeof V4_ADMIN_VISUAL_STATES)[number];
export type AdminV4Kind = V4AdminVisualState;

export type AdminV4Kpi = {
  id: "waitlist" | "activity" | "email";
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
  body: string;
  attention: readonly AttentionItem[];
  attentionEmpty: typeof ADMIN_V4_EMPTY_ATTENTION | null;
  kpis: readonly AdminV4Kpi[];
  jobs: readonly AdminV4Job[];
};

export type AdminV4Pulse = {
  waitlistCount: number;
  activityCount: number;
  emailFailedCount: number;
};

export type AdminV4Source = {
  waitlistCount: number;
  activityCount: number;
  emailFailedCount: number;
};

export function parseV4AdminVisualState(
  raw: string | null | undefined,
): V4AdminVisualState | null {
  return parseV4VisualState(raw, V4_ADMIN_VISUAL_STATES);
}

export function adminV4ForbidsHeroScore(view: AdminV4View): boolean {
  const blob = JSON.stringify(view);
  return !blob.includes("HeroScore") && !blob.includes("ThresholdFold");
}

export function adminV4ForbidsInventedDollars(view: AdminV4View): boolean {
  return !JSON.stringify(view).match(/\$\d/);
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
  if (source.activityCount > 0 && items.length === 0) {
    items.push({
      id: "activity",
      severity: "info",
      title: "Live activity to review",
      detail: `${source.activityCount.toLocaleString()} recent ops rows`,
      href: "/admin/activity",
      cta: "Open activity",
    });
  }
  return items;
}

function kpisFromLive(source: AdminV4Source): AdminV4Kpi[] {
  return [
    {
      id: "waitlist",
      label: "Waitlist",
      value: source.waitlistCount > 0 ? source.waitlistCount.toLocaleString() : ADMIN_V4_LIVE,
      href: "/admin/waitlist",
    },
    {
      id: "activity",
      label: "Activity",
      value: source.activityCount > 0 ? source.activityCount.toLocaleString() : ADMIN_V4_LIVE,
      href: "/admin/activity",
    },
    {
      id: "email",
      label: "Email",
      value: source.emailFailedCount > 0 ? source.emailFailedCount.toLocaleString() : ADMIN_V4_LIVE,
      href: "/admin/email",
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
  if (attention.length === 0) {
    return {
      kind: "empty",
      decisionContext: ADMIN_V4_CONTEXT,
      title: ADMIN_V4_EMPTY_TITLE,
      body: ADMIN_V4_EMPTY_BODY,
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
    body: ADMIN_V4_LIVE_BODY,
    attention,
    attentionEmpty: null,
    kpis: kpisFromLive(source),
    jobs: jobsFromAttention(attention),
  };
}

export function adminV4VisualView(state: V4AdminVisualState): AdminV4View {
  if (state === "empty") {
    return buildAdminV4View({ waitlistCount: 0, activityCount: 0, emailFailedCount: 0 });
  }
  return buildAdminV4View({
    waitlistCount: 24,
    activityCount: 8,
    emailFailedCount: 2,
  });
}

export function adminV4MetricCells(view: AdminV4View): MetricCell[] {
  return view.kpis.map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    footer: ADMIN_V4_LIVE,
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
