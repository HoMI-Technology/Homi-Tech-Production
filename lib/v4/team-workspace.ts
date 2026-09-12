/**
 * Team v4 — Shell v4 aggregate org viewer. Last role shell.
 * `/team` only. Live SSOT counts. Never invent scores, $, or `/team/dashboard`.
 * Ask / Companion / Homie stay off. No Admin AttentionStrip echo.
 */

import { parseV4VisualState } from "@/lib/v4/system-surfaces";
import { V4_SHELL_TEAM_HREF } from "@/lib/layout/v4-shell";
import type { MetricCell } from "@/components/operate/MetricRail";

export const V4_TEAM_HREF = V4_SHELL_TEAM_HREF;
export const TEAM_V4_CONTEXT = "Team" as const;

export const TEAM_V4_EMPTY_TITLE = "No team yet." as const;
export const TEAM_V4_EMPTY_BODY =
  "Connect an org or refresh when live data is ready." as const;
export const TEAM_V4_REFRESH_CTA = "Refresh" as const;

export const TEAM_V4_LIVE_TITLE = "Team aggregate." as const;
export const TEAM_V4_LIVE_BODY = "Live SSOT counts only — no individual scores." as const;
export const TEAM_V4_HONESTY = "Live aggregate · no individual scores" as const;
export const TEAM_V4_NO_INDIVIDUALS = "Individuals are not listed." as const;

export const TEAM_V4_STALE_TITLE = "Can't refresh team." as const;
export const TEAM_V4_STALE_BODY =
  "Live aggregate unavailable — retry without inventing metrics." as const;
export const TEAM_V4_STALE_EYEBROW = "Stale · reconnect" as const;
export const TEAM_V4_RETRY_CTA = "Retry" as const;

export const TEAM_V4_KPI_MEMBERS = "Members covered" as const;
export const TEAM_V4_KPI_PARTICIPATION = "Participation" as const;
export const TEAM_V4_KPI_PULSE = "Org pulse" as const;
export const TEAM_V4_PULSE_STEADY = "Steady" as const;

export const V4_TEAM_VISUAL_STATES = ["empty", "normal", "stale"] as const;
export type V4TeamVisualState = (typeof V4_TEAM_VISUAL_STATES)[number];
export type TeamV4Kind = V4TeamVisualState;

export type TeamV4Cta = {
  label: typeof TEAM_V4_REFRESH_CTA | typeof TEAM_V4_RETRY_CTA;
  action: "refresh";
};

export type TeamV4KpiId = "members" | "participation" | "pulse";

export type TeamV4Kpi = {
  id: TeamV4KpiId;
  label: typeof TEAM_V4_KPI_MEMBERS | typeof TEAM_V4_KPI_PARTICIPATION | typeof TEAM_V4_KPI_PULSE;
  value: string;
};

export type TeamV4View = {
  kind: TeamV4Kind;
  decisionContext: typeof TEAM_V4_CONTEXT;
  title: string;
  body: string;
  eyebrow: typeof TEAM_V4_STALE_EYEBROW | null;
  honesty: typeof TEAM_V4_HONESTY | null;
  kpis: readonly TeamV4Kpi[];
  cta: TeamV4Cta | null;
};

export type TeamV4Source = {
  orgConnected: boolean;
  memberCount: number;
  assessmentCount: number;
  fetchFailed: boolean;
};

export const TEAM_V4_EMPTY_SOURCE: TeamV4Source = {
  orgConnected: false,
  memberCount: 0,
  assessmentCount: 0,
  fetchFailed: false,
};

export function parseV4TeamVisualState(
  raw: string | null | undefined,
): V4TeamVisualState | null {
  return parseV4VisualState(raw, V4_TEAM_VISUAL_STATES);
}

export function teamV4ForbidsHeroScore(view: TeamV4View): boolean {
  const blob = JSON.stringify(view);
  return !blob.includes("HeroScore") && !blob.includes("ThresholdFold");
}

export function teamV4ForbidsInventedDollars(view: TeamV4View): boolean {
  return !JSON.stringify(view).match(/\$\d/);
}

export function teamV4ParticipationValue(source: TeamV4Source): string | null {
  if (source.memberCount <= 0) return null;
  return `${Math.min(100, Math.round((source.assessmentCount / source.memberCount) * 100))}%`;
}

export function teamV4PulseValue(source: TeamV4Source): string | null {
  return source.assessmentCount > 0 ? TEAM_V4_PULSE_STEADY : null;
}

function kpisFromLive(source: TeamV4Source): TeamV4Kpi[] {
  const kpis: TeamV4Kpi[] = [];
  if (source.memberCount > 0) {
    kpis.push({
      id: "members",
      label: TEAM_V4_KPI_MEMBERS,
      value: source.memberCount.toLocaleString(),
    });
  }
  const participation = teamV4ParticipationValue(source);
  if (participation) {
    kpis.push({
      id: "participation",
      label: TEAM_V4_KPI_PARTICIPATION,
      value: participation,
    });
  }
  const pulse = teamV4PulseValue(source);
  if (pulse) {
    kpis.push({
      id: "pulse",
      label: TEAM_V4_KPI_PULSE,
      value: pulse,
    });
  }
  return kpis;
}

export function buildTeamV4View(source: TeamV4Source): TeamV4View {
  if (source.fetchFailed) {
    return {
      kind: "stale",
      decisionContext: TEAM_V4_CONTEXT,
      title: TEAM_V4_STALE_TITLE,
      body: TEAM_V4_STALE_BODY,
      eyebrow: TEAM_V4_STALE_EYEBROW,
      honesty: null,
      kpis: [],
      cta: { label: TEAM_V4_RETRY_CTA, action: "refresh" },
    };
  }

  const kpis = kpisFromLive(source);
  const empty = !source.orgConnected || kpis.length === 0;
  if (empty) {
    return {
      kind: "empty",
      decisionContext: TEAM_V4_CONTEXT,
      title: TEAM_V4_EMPTY_TITLE,
      body: TEAM_V4_EMPTY_BODY,
      eyebrow: null,
      honesty: null,
      kpis: [],
      cta: { label: TEAM_V4_REFRESH_CTA, action: "refresh" },
    };
  }

  return {
    kind: "normal",
    decisionContext: TEAM_V4_CONTEXT,
    title: TEAM_V4_LIVE_TITLE,
    body: TEAM_V4_LIVE_BODY,
    eyebrow: null,
    honesty: TEAM_V4_HONESTY,
    kpis,
    cta: null,
  };
}

export function teamV4VisualView(state: V4TeamVisualState): TeamV4View {
  switch (state) {
    case "empty":
      return buildTeamV4View(TEAM_V4_EMPTY_SOURCE);
    case "stale":
      return buildTeamV4View({
        orgConnected: true,
        memberCount: 12,
        assessmentCount: 9,
        fetchFailed: true,
      });
    case "normal":
      return buildTeamV4View({
        orgConnected: true,
        memberCount: 12,
        assessmentCount: 9,
        fetchFailed: false,
      });
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function teamV4MetricCells(view: TeamV4View): MetricCell[] {
  return view.kpis
    .filter((kpi) => kpi.label.trim().length > 0 && kpi.value.trim().length > 0)
    .map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
    }));
}
