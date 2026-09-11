/**
 * Partner v4 — Shell v4 operate home. One shell · different jobs.
 * Book pulse from live referral_source / SSOT only. Never invent a client list or $.
 * Never write AssessmentResult. Never override a client score.
 * Invite stays `/first-moment?ref=` — shadow-score invite stays dead.
 * SITE_URL fail-loud — never a silent production default.
 * Admin / Team stay closed (K3–K4).
 */

import { V4_ASK_PLACEHOLDER_PARTNER } from "@/lib/v4/assessment-walk";
import {
  V4_SHELL_PARTNER_HREF,
  V4_SHELL_SETTINGS_HREF,
} from "@/lib/layout/v4-shell";
import {
  SYSTEM_V4_FIXTURE_NOW_MS,
  SYSTEM_V4_FIXTURE_SYNCED_12M,
  SYSTEM_V4_PROMPTS_MAX,
  parseV4VisualState,
  systemV4AgeLabel,
  systemV4ForbidsInventedDollars,
  type SystemV4Cta,
  type SystemV4HomiPrompt,
} from "@/lib/v4/system-surfaces";

export const V4_PARTNER_HREF = V4_SHELL_PARTNER_HREF;
export const V4_ASK_PLACEHOLDER_PARTNER_BOOK = V4_ASK_PLACEHOLDER_PARTNER;
export const PARTNER_V4_CONTEXT = "Partner" as const;
export const PARTNER_V4_PULSE_LIVE = "SSOT" as const;
export const PARTNER_V4_PULSE_TITLE = "Referral · live" as const;
export const PARTNER_V4_INVITE_BLOCKED = "INVITE BLOCKED" as const;

export const PARTNER_V4_EMPTY_TITLE = "No clients in your book yet." as const;
export const PARTNER_V4_EMPTY_BODY =
  "Invite when you're ready — never invent a client list or scores." as const;
export const PARTNER_V4_EMPTY_CTA = "Invite" as const;

export const PARTNER_V4_LIVE_TITLE = "Your book." as const;
export const PARTNER_V4_LIVE_BODY =
  "Live referral pulse only — never invent clients or $." as const;
export const PARTNER_V4_LIVE_CTA = "Invite again" as const;

export const PARTNER_V4_ORIGIN_TITLE = "Origin missing." as const;
export const PARTNER_V4_ORIGIN_BODY =
  "SITE_URL fail-loud — fix origin before inviting. Never a silent bad link." as const;
export const PARTNER_V4_ORIGIN_CTA = "Retry invite" as const;
export const PARTNER_V4_MINT_FAIL =
  "Could not mint an invite code. Refresh or contact support." as const;

export const V4_PARTNER_VISUAL_STATES = ["empty", "invite-error", "normal"] as const;
export type V4PartnerVisualState = (typeof V4_PARTNER_VISUAL_STATES)[number];
export type PartnerV4Kind = V4PartnerVisualState;

export type PartnerV4Pulse = {
  id: string;
  title: typeof PARTNER_V4_PULSE_TITLE;
  liveLabel: typeof PARTNER_V4_PULSE_LIVE;
  liveAt: string;
};

export type PartnerV4View = {
  kind: PartnerV4Kind;
  originMissing: boolean;
  hardStopActive: boolean;
  decisionContext: typeof PARTNER_V4_CONTEXT;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  ageLabel: string | null;
  cta: SystemV4Cta;
  inviteUrl: string | null;
  mintFailed: boolean;
  honestyLine: string | null;
  pulse: readonly PartnerV4Pulse[];
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_PARTNER;
};

export type PartnerV4Source = {
  originMissing: boolean;
  inviteUrl: string | null;
  mintFailed?: boolean;
  pulse: readonly PartnerV4Pulse[];
  nowMs?: number;
};

/** Same-route hashes keep Preview `?visual=` and avoid a login bounce. */
export const PARTNER_V4_BOOK_HASH = "#book" as const;
export const PARTNER_V4_INVITE_HASH = "#invite" as const;

export const PARTNER_V4_PROMPTS = {
  empty: [
    { label: "What is the book?", href: PARTNER_V4_BOOK_HASH },
    { label: "How invite works", href: PARTNER_V4_INVITE_HASH },
    { label: "Why no client scores", href: PARTNER_V4_BOOK_HASH },
  ],
  "invite-error": [
    { label: "What is SITE_URL?", href: PARTNER_V4_INVITE_HASH },
    { label: "Why fail-loud?", href: PARTNER_V4_INVITE_HASH },
    { label: "Open settings path", href: V4_SHELL_SETTINGS_HREF },
  ],
  normal: [
    { label: "What is book pulse?", href: PARTNER_V4_BOOK_HASH },
    { label: "When is age stale?", href: PARTNER_V4_BOOK_HASH },
    { label: "Why no HeroScore", href: PARTNER_V4_BOOK_HASH },
  ],
} as const satisfies Record<PartnerV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4PartnerVisualState(
  raw: string | null | undefined,
): V4PartnerVisualState | null {
  return parseV4VisualState(raw, V4_PARTNER_VISUAL_STATES);
}

export function partnerInviteUrl(origin: string | null, partnerCode: string | null): string | null {
  if (!origin || !partnerCode) return null;
  return `${origin}/first-moment?ref=${partnerCode}`;
}

export function partnerV4PulseFromLive(args: {
  id: string;
  liveAt: string;
}): PartnerV4Pulse {
  return {
    id: args.id,
    title: PARTNER_V4_PULSE_TITLE,
    liveLabel: PARTNER_V4_PULSE_LIVE,
    liveAt: args.liveAt,
  };
}

export function buildPartnerV4View(source: PartnerV4Source): PartnerV4View {
  const originMissing = source.originMissing;
  const pulse = originMissing ? [] : source.pulse;
  const kind: PartnerV4Kind = originMissing ? "invite-error" : pulse.length > 0 ? "normal" : "empty";
  const mintFailed = kind === "empty" && source.mintFailed === true;
  const ageLabel =
    kind === "normal" ? systemV4AgeLabel(pulse[0]?.liveAt, source.nowMs) : null;
  return {
    kind,
    originMissing,
    hardStopActive: originMissing,
    decisionContext: PARTNER_V4_CONTEXT,
    verdictLabel: originMissing ? PARTNER_V4_INVITE_BLOCKED : null,
    holdLead: originMissing ? PARTNER_V4_ORIGIN_TITLE : null,
    holdMeta: null,
    title: partnerV4Title(kind),
    body: partnerV4Body(kind),
    ageLabel,
    cta: partnerV4Cta(kind),
    inviteUrl: originMissing ? null : source.inviteUrl,
    mintFailed,
    honestyLine: mintFailed ? PARTNER_V4_MINT_FAIL : null,
    pulse,
    prompts: PARTNER_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_PARTNER,
  };
}

function partnerV4Title(kind: PartnerV4Kind): string {
  switch (kind) {
    case "empty":
      return PARTNER_V4_EMPTY_TITLE;
    case "invite-error":
      return PARTNER_V4_ORIGIN_TITLE;
    case "normal":
      return PARTNER_V4_LIVE_TITLE;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function partnerV4Body(kind: PartnerV4Kind): string {
  switch (kind) {
    case "empty":
      return PARTNER_V4_EMPTY_BODY;
    case "invite-error":
      return PARTNER_V4_ORIGIN_BODY;
    case "normal":
      return PARTNER_V4_LIVE_BODY;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function partnerV4Cta(kind: PartnerV4Kind): SystemV4Cta {
  switch (kind) {
    case "empty":
      return { label: PARTNER_V4_EMPTY_CTA, href: PARTNER_V4_INVITE_HASH };
    case "invite-error":
      return { label: PARTNER_V4_ORIGIN_CTA, href: PARTNER_V4_INVITE_HASH };
    case "normal":
      return { label: PARTNER_V4_LIVE_CTA, href: PARTNER_V4_INVITE_HASH };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function partnerV4VisualReading(state: V4PartnerVisualState): PartnerV4Source {
  switch (state) {
    case "empty":
      return { originMissing: false, inviteUrl: null, pulse: [] };
    case "invite-error":
      return { originMissing: true, inviteUrl: null, pulse: [] };
    case "normal":
      return {
        originMissing: false,
        inviteUrl: null,
        pulse: [
          partnerV4PulseFromLive({ id: "fixture-pulse-1", liveAt: SYSTEM_V4_FIXTURE_SYNCED_12M }),
          partnerV4PulseFromLive({ id: "fixture-pulse-2", liveAt: SYSTEM_V4_FIXTURE_SYNCED_12M }),
        ],
        nowMs: SYSTEM_V4_FIXTURE_NOW_MS,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function partnerV4VisualView(state: V4PartnerVisualState): PartnerV4View {
  return buildPartnerV4View(partnerV4VisualReading(state));
}

export function partnerV4ForbidsOnTrackCopy(view: PartnerV4View): boolean {
  const blob = JSON.stringify(view);
  return !/\bOn track\b/.test(blob);
}

export function partnerV4ForbidsReadyCopy(view: PartnerV4View): boolean {
  return view.verdictLabel !== "READY" && !/\bREADY\b/.test(JSON.stringify(view));
}

export function partnerV4ForbidsInventedDollars(view: PartnerV4View): boolean {
  return systemV4ForbidsInventedDollars(view);
}

export function partnerV4ForbidsHeroScore(view: PartnerV4View): boolean {
  if ("score" in view || "overallScore" in view || "heroScore" in view) return false;
  const blob = JSON.stringify(view);
  return !/\b\d{1,3}\s*\/\s*100\b/.test(blob);
}

export function partnerV4ForbidsShadowScoreInvite(view: PartnerV4View): boolean {
  const blob = JSON.stringify(view);
  if (!view.inviteUrl) return !blob.includes("shadow-score?ref=");
  return view.inviteUrl.includes("/first-moment?ref=") && !view.inviteUrl.includes("shadow-score?ref=");
}
