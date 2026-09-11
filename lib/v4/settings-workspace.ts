/**
 * Settings v4 — Account · Privacy · Billing entry only.
 * Quarantine everything else this pass. Never invent $. Never write AssessmentResult.
 */

import { V4_ASSESS_DECISION_LABEL, V4_ASK_PLACEHOLDER_SETTINGS } from "@/lib/v4/assessment-walk";
import { VERDICT_META } from "@/lib/brand";
import {
  V4_SHELL_HOME_HREF,
  V4_SHELL_SETTINGS_HREF,
} from "@/lib/layout/v4-shell";
import {
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_HOLD_META_LINE,
  SYSTEM_V4_PROMPTS_MAX,
  V4_ASK_PLACEHOLDER_BY_SURFACE,
  parseV4VisualState,
  systemV4ForbidsInventedDollars,
  systemV4ForbidsOnTrackCopy,
  systemV4ForbidsReadyCopy,
  systemV4Hold,
  type SystemV4HomiPrompt,
  type SystemV4LastRead,
} from "@/lib/v4/system-surfaces";

export const V4_SETTINGS_HREF = V4_SHELL_SETTINGS_HREF;
export const V4_SETTINGS_BILLING_HREF = "/settings/subscription" as const;
export const V4_SETTINGS_PRIVACY_HREF = "/legal/privacy" as const;
export const V4_ASK_PLACEHOLDER_SETTINGS_FIELD = V4_ASK_PLACEHOLDER_SETTINGS;
export const SETTINGS_V4_TITLE = "Settings." as const;
export const SETTINGS_V4_BODY =
  "Account · Privacy · Billing only this pass. Quarantine everything else." as const;
export const SETTINGS_V4_HOLD_LEAD = "Hold first — settings stay thin." as const;
export const SETTINGS_V4_HARD_STOP_BODY =
  "Account, privacy, and billing stay available. Path still leads — never On track theater." as const;

export const V4_SETTINGS_VISUAL_STATES = ["empty", "hard-stop"] as const;
export type V4SettingsVisualState = (typeof V4_SETTINGS_VISUAL_STATES)[number];
export type SettingsV4Kind = "empty" | "hard-stop";

export type SettingsV4Entry = {
  id: "account" | "privacy" | "billing";
  title: string;
  follow: string;
  href: string | null;
};

export const SETTINGS_V4_ENTRIES: readonly SettingsV4Entry[] = [
  { id: "account", title: "Account", follow: "email, password, sessions", href: null },
  { id: "privacy", title: "Privacy", follow: "data & consent", href: V4_SETTINGS_PRIVACY_HREF },
  { id: "billing", title: "Billing", follow: "plan entry", href: V4_SETTINGS_BILLING_HREF },
] as const;

export type SettingsV4View = {
  kind: SettingsV4Kind;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  entries: readonly SettingsV4Entry[];
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_SETTINGS;
};

export const SETTINGS_V4_PROMPTS = {
  empty: [
    { label: "Where is billing?", href: V4_SETTINGS_BILLING_HREF },
    { label: "Privacy basics", href: V4_SETTINGS_PRIVACY_HREF },
    { label: "Why settings stay thin", href: V4_SHELL_HOME_HREF },
  ],
  "hard-stop": [
    { label: "Where is billing?", href: V4_SETTINGS_BILLING_HREF },
    { label: "Privacy basics", href: V4_SETTINGS_PRIVACY_HREF },
    { label: "Why settings stay thin", href: V4_SHELL_HOME_HREF },
  ],
} as const satisfies Record<SettingsV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4SettingsVisualState(
  raw: string | null | undefined,
): V4SettingsVisualState | null {
  return parseV4VisualState(raw, V4_SETTINGS_VISUAL_STATES);
}

export function buildSettingsV4View(reading: SystemV4LastRead | null): SettingsV4View {
  const hold = systemV4Hold(reading);
  const hardStopActive = hold.hardStopActive;
  const kind: SettingsV4Kind = hardStopActive ? "hard-stop" : "empty";
  return {
    kind,
    hardStopActive,
    decisionContext: hold.decisionContext,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? SETTINGS_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? SYSTEM_V4_HOLD_META_LINE : null,
    title: SETTINGS_V4_TITLE,
    body: hardStopActive ? SETTINGS_V4_HARD_STOP_BODY : SETTINGS_V4_BODY,
    entries: SETTINGS_V4_ENTRIES,
    prompts: SETTINGS_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_BY_SURFACE.settings,
  };
}

export function settingsV4VisualReading(state: V4SettingsVisualState): SystemV4LastRead | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: SYSTEM_V4_FIXTURE_DECISION,
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function settingsV4VisualView(state: V4SettingsVisualState): SettingsV4View {
  const view = buildSettingsV4View(settingsV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}

export function settingsV4ForbidsOnTrackCopy(view: SettingsV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function settingsV4ForbidsReadyCopy(view: SettingsV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function settingsV4ForbidsInventedDollars(view: SettingsV4View): boolean {
  return systemV4ForbidsInventedDollars(view);
}

export function settingsV4QuarantinesExtras(view: SettingsV4View): boolean {
  const ids = view.entries.map((entry) => entry.id);
  return (
    ids.length === 3 &&
    ids.includes("account") &&
    ids.includes("privacy") &&
    ids.includes("billing") &&
    !ids.includes("notifications" as SettingsV4Entry["id"])
  );
}
