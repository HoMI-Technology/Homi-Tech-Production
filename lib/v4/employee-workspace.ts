/**
 * Employee v4 — Shell v4 operate home. One shell · different jobs.
 * Empty or live operate SSOT only. Never invent teammate lists, scores, or $.
 * Never write AssessmentResult. Hard stop outranks — never On track / READY.
 * Partner / Admin / Team stay closed (K2–K4). PR K2 opens Partner separately.
 */

import { VERDICT_META } from "@/lib/brand";
import {
  V4_SHELL_EMPLOYEE_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";
import { V4_ASK_PLACEHOLDER_WORKSPACE } from "@/lib/v4/assessment-walk";
import {
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_FIXTURE_NOW_MS,
  SYSTEM_V4_FIXTURE_SYNCED_12M,
  SYSTEM_V4_PROMPTS_MAX,
  parseV4VisualState,
  systemV4AgeLabel,
  systemV4ForbidsInventedDollars,
  systemV4ForbidsOnTrackCopy,
  systemV4ForbidsReadyCopy,
  systemV4Hold,
  type SystemV4Cta,
  type SystemV4HomiPrompt,
  type SystemV4LastRead,
} from "@/lib/v4/system-surfaces";

export const V4_EMPLOYEE_HREF = V4_SHELL_EMPLOYEE_HREF;
export const V4_ASK_PLACEHOLDER_EMPLOYEE = V4_ASK_PLACEHOLDER_WORKSPACE;
export const EMPLOYEE_V4_CONTEXT = "Employee" as const;

export const EMPLOYEE_V4_EMPTY_TITLE =
  "Connect or wait for live workspace data — never invent teammate lists or scores." as const;
export const EMPLOYEE_V4_EMPTY_BODY = "Open connections" as const;
export const EMPLOYEE_V4_EMPTY_CTA = "What can I operate here?" as const;

export const EMPLOYEE_V4_LIVE_TITLE = "Your operate home." as const;
export const EMPLOYEE_V4_LIVE_BODY =
  "Live SSOT only — privacy chrome · never a peer-score wall." as const;
export const EMPLOYEE_V4_LIVE_CTA = "Open work" as const;

export const EMPLOYEE_V4_HOLD_LEAD = "Runway hold — operate stays explain-only." as const;
export const EMPLOYEE_V4_HOLD_META =
  "Hard stop · never On track · no role score override" as const;
export const EMPLOYEE_V4_HARD_STOP_BODY =
  "Employee operate does not clear a personal hard stop." as const;
export const EMPLOYEE_V4_OPEN_PATH = "Open Path" as const;

export const EMPLOYEE_V4_ATTENTION_TITLE = "Attention" as const;
export const EMPLOYEE_V4_ATTENTION_FOLLOW = "Live items only · empty if none" as const;
export const EMPLOYEE_V4_PRIVACY_TITLE = "Privacy" as const;
export const EMPLOYEE_V4_PRIVACY_FOLLOW = "No peer-score listing" as const;

export const V4_EMPLOYEE_VISUAL_STATES = ["empty", "hard-stop", "normal"] as const;
export type V4EmployeeVisualState = (typeof V4_EMPLOYEE_VISUAL_STATES)[number];
export type EmployeeV4Kind = V4EmployeeVisualState;

export type EmployeeV4Job = {
  id: "attention" | "privacy";
  title: string;
  follow: string;
};

export type EmployeeV4View = {
  kind: EmployeeV4Kind;
  hasLiveWorkspace: boolean;
  hardStopActive: boolean;
  decisionContext: typeof EMPLOYEE_V4_CONTEXT;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  ageLabel: string | null;
  cta: SystemV4Cta;
  jobs: readonly EmployeeV4Job[];
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_WORKSPACE;
};

export const EMPLOYEE_V4_JOBS: readonly EmployeeV4Job[] = [
  {
    id: "attention",
    title: EMPLOYEE_V4_ATTENTION_TITLE,
    follow: EMPLOYEE_V4_ATTENTION_FOLLOW,
  },
  {
    id: "privacy",
    title: EMPLOYEE_V4_PRIVACY_TITLE,
    follow: EMPLOYEE_V4_PRIVACY_FOLLOW,
  },
] as const;

/** Same-route hashes keep Preview `?visual=` and avoid a login bounce. */
const EMPLOYEE_V4_ATTENTION_HASH = "#attention" as const;
const EMPLOYEE_V4_PRIVACY_HASH = "#privacy" as const;

export const EMPLOYEE_V4_PROMPTS = {
  empty: [
    { label: "Why no peer scores?", href: EMPLOYEE_V4_PRIVACY_HASH },
    { label: "Privacy on this workspace", href: EMPLOYEE_V4_PRIVACY_HASH },
  ],
  "hard-stop": [
    { label: "What does this hold mean here?", href: V4_SHELL_PATH_HREF },
    { label: "Open personal Path", href: V4_SHELL_PATH_HREF },
    { label: "Why no READY theater", href: V4_SHELL_PATH_HREF },
  ],
  normal: [
    { label: "What is live here?", href: EMPLOYEE_V4_ATTENTION_HASH },
    { label: "When does age go stale?", href: EMPLOYEE_V4_ATTENTION_HASH },
    { label: "Why no HeroScore", href: EMPLOYEE_V4_PRIVACY_HASH },
  ],
} as const satisfies Record<EmployeeV4Kind, readonly SystemV4HomiPrompt[]>;

export type EmployeeV4Source = {
  reading: SystemV4LastRead | null;
  hasLiveWorkspace: boolean;
  nowMs?: number;
};

export function parseV4EmployeeVisualState(
  raw: string | null | undefined,
): V4EmployeeVisualState | null {
  return parseV4VisualState(raw, V4_EMPLOYEE_VISUAL_STATES);
}

export function buildEmployeeV4View(source: EmployeeV4Source): EmployeeV4View {
  const hold = systemV4Hold(source.reading);
  const hardStopActive = hold.hardStopActive;
  const kind: EmployeeV4Kind = hardStopActive
    ? "hard-stop"
    : source.hasLiveWorkspace
      ? "normal"
      : "empty";
  const ageLabel =
    kind === "normal"
      ? systemV4AgeLabel(source.reading?.scoredAt, source.nowMs)
      : null;
  return {
    kind,
    hasLiveWorkspace: kind === "normal",
    hardStopActive,
    decisionContext: EMPLOYEE_V4_CONTEXT,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? EMPLOYEE_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? EMPLOYEE_V4_HOLD_META : null,
    title: employeeV4Title(kind),
    body: employeeV4Body(kind),
    ageLabel,
    cta: employeeV4Cta(kind),
    jobs: kind === "normal" ? EMPLOYEE_V4_JOBS : [],
    prompts: EMPLOYEE_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_WORKSPACE,
  };
}

function employeeV4Title(kind: EmployeeV4Kind): string {
  switch (kind) {
    case "empty":
      return EMPLOYEE_V4_EMPTY_TITLE;
    case "hard-stop":
      return EMPLOYEE_V4_HOLD_LEAD;
    case "normal":
      return EMPLOYEE_V4_LIVE_TITLE;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function employeeV4Body(kind: EmployeeV4Kind): string {
  switch (kind) {
    case "empty":
      return EMPLOYEE_V4_EMPTY_BODY;
    case "hard-stop":
      return EMPLOYEE_V4_HARD_STOP_BODY;
    case "normal":
      return EMPLOYEE_V4_LIVE_BODY;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function employeeV4Cta(kind: EmployeeV4Kind): SystemV4Cta {
  switch (kind) {
    case "empty":
      return {
        label: EMPLOYEE_V4_EMPTY_CTA,
        href: EMPLOYEE_V4_ATTENTION_HASH,
      };
    case "hard-stop":
      return { label: EMPLOYEE_V4_OPEN_PATH, href: V4_SHELL_PATH_HREF };
    case "normal":
      return {
        label: EMPLOYEE_V4_LIVE_CTA,
        href: EMPLOYEE_V4_ATTENTION_HASH,
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function employeeV4VisualReading(
  state: V4EmployeeVisualState,
): EmployeeV4Source {
  switch (state) {
    case "empty":
      return { reading: null, hasLiveWorkspace: false };
    case "hard-stop":
      return {
        reading: {
          decisionType: SYSTEM_V4_FIXTURE_DECISION,
          verdict: "NOT_YET",
          stopCode: "RUNWAY_UNDER_1_MONTH",
          lastMoneyMonths: 0.4,
        },
        hasLiveWorkspace: false,
      };
    case "normal":
      return {
        reading: {
          decisionType: SYSTEM_V4_FIXTURE_DECISION,
          verdict: "ALMOST_THERE",
          stopCode: null,
          scoredAt: SYSTEM_V4_FIXTURE_SYNCED_12M,
        },
        hasLiveWorkspace: true,
        nowMs: SYSTEM_V4_FIXTURE_NOW_MS,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function employeeV4VisualView(state: V4EmployeeVisualState): EmployeeV4View {
  return buildEmployeeV4View(employeeV4VisualReading(state));
}

export function employeeV4ForbidsOnTrackCopy(view: EmployeeV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function employeeV4ForbidsReadyCopy(view: EmployeeV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function employeeV4ForbidsInventedDollars(view: EmployeeV4View): boolean {
  return systemV4ForbidsInventedDollars(view);
}

export function employeeV4ForbidsHeroScore(view: EmployeeV4View): boolean {
  if ("score" in view || "overallScore" in view || "heroScore" in view) return false;
  const blob = JSON.stringify(view);
  return !/\b\d{1,3}\s*\/\s*100\b/.test(blob);
}
