/**
 * Pure fold-truth helpers for the signed-in Home.
 * Keep this module free of Next, scoring internals, and lab routes.
 */

import { foldHardStopDisplay } from "@/lib/assessment/hard-stop-copy";

export const ONBOARDING_SKIP_HREF = "/dashboard" as const;

export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function shouldSuppressBuildPercent(hardStopCount: number): boolean {
  return hardStopCount > 0;
}

/** 4-band dash-spectrum is a verdict-band claim. Hard stops hide it. */
export function shouldPaintDashSpectrum(hardStopCount: number): boolean {
  return !shouldSuppressBuildPercent(hardStopCount);
}

export function hardStopMessages(hardStops: unknown): string[] {
  if (!Array.isArray(hardStops)) return [];
  const messages: string[] = [];
  for (const row of hardStops) {
    if (!row || typeof row !== "object") continue;
    const message = (row as { message?: unknown }).message;
    if (typeof message !== "string") continue;
    const trimmed = message.trim();
    if (trimmed) messages.push(trimmed);
  }
  return messages;
}

export function buildProgressLabel(args: {
  done: number;
  total: number;
  hardStopCount: number;
}): string | null {
  if (shouldSuppressBuildPercent(args.hardStopCount)) return null;
  if (args.total <= 0) return null;
  return `${args.done} of ${args.total}`;
}

export function resumeDraftCopy(
  draft: { index: number; decisionType: string } | null,
): { href: "/assessment"; label: string; body: string } | null {
  if (!draft) return null;
  return {
    href: "/assessment",
    label: "Resume your assessment",
    body: "Your answers are still here. The build is where you left it — not a new start.",
  };
}

/**
 * Locked Home-fold Companion lines — SSOT for docs/COMPANION-PRESENCE.md.
 * One sentence only. Companion never calculates; Path owns the fold hero.
 */
export const COMPANION_FOLD_LINES = {
  hardStop: "A hard stop is the read right now. The path names what has to move first.",
  pathGuide: "Your next honest move is the binding step on Path to Ready.",
  assessmentOnly: "You have a read. Path to Ready is the map from here.",
  firstRun: "One measurement and this page has a build to show.",
} as const;

export type CompanionFoldLineKey = keyof typeof COMPANION_FOLD_LINES;

/**
 * Where Escalation (presence state 5) opens full conversation.
 * Stub only — do not mount chat UI on the Home fold; deep-link here later.
 */
export const COMPANION_ESCALATION_HREF = "/advisor" as const;

/** Presence states that drive the Home fold line (Silent Witness = no extra chrome). */
export type CompanionPresenceState =
  | "silent_witness"
  | "hard_stop_guardian"
  | "path_guide"
  | "score_rail"
  | "escalation";

export function companionPresenceState(args: {
  hasHardStops: boolean;
  hasPath: boolean;
  hasAssessment: boolean;
}): Exclude<CompanionPresenceState, "score_rail" | "escalation"> {
  if (args.hasHardStops) return "hard_stop_guardian";
  if (args.hasAssessment && args.hasPath) return "path_guide";
  // Assessment-only and first-run still speak the locked line; chat stays Silent Witness.
  if (args.hasAssessment) return "silent_witness";
  return "silent_witness";
}

export function companionFoldLine(args: {
  hasHardStops: boolean;
  hasPath: boolean;
  hasAssessment: boolean;
}): string {
  if (args.hasHardStops) {
    return COMPANION_FOLD_LINES.hardStop;
  }
  if (args.hasAssessment && args.hasPath) {
    return COMPANION_FOLD_LINES.pathGuide;
  }
  if (args.hasAssessment) {
    return COMPANION_FOLD_LINES.assessmentOnly;
  }
  return COMPANION_FOLD_LINES.firstRun;
}

/**
 * First-viewport instrument on signed-in HōMI. Compass lives in the v3
 * shell bar only. Score is last AssessmentResult only. Money waits below
 * the fold until real accounts. This module does not write the ledger or a score.
 */
export const HOME_FOLD_INSTRUMENT = "threshold" as const;

/**
 * Empty Home is blank above — until an API verdict exists.
 * No Fraunces heading, no marketing whisper, no invented age.
 * The fold itself is — + Assess primary only (HOME_CRAFT / CEO lock).
 */

/** Below-fold money line until connected accounts exist. Honest empty — no invented cash. */
export const MONEY_WAIT_LINE = "Accounts aren't connected yet." as const;

/** Live Connections route. Never invent a URL. */
export const FOLD_CONNECTIONS_HREF = "/connections" as const;

/** Live Money picture route. Depth, not a fold hero. */
export const FOLD_MONEY_HREF = "/money" as const;

export const FOLD_CONNECT_ACCOUNTS_LABEL = "Connect accounts" as const;
export const FOLD_MONEY_EMPTY_HEADING = "Money" as const;
export const FOLD_MONEY_CONNECTED_HEADING = "Money · Path evidence" as const;
export const FOLD_LIQUID_CONNECTED_LABEL = "Connected · ledger" as const;
export const FOLD_FLAGS_NONE_INVENTED = "None invented" as const;
export const FOLD_MONEY_DEPTH_LABEL = "Money depth" as const;

/** HOME_DENSITY_CRAFT — below-fold column, not the PR7 fold. */
export const HOME_DENSITY_MAX_PATH_STEPS = 3 as const;
export const HOME_DENSITY_OPEN_PATH_LABEL = "Open Path" as const;
export const HOME_DENSITY_OPEN_PATH_HREF = "/path" as const;
export const HOME_DENSITY_VIEW_ALL_TOOLS_LABEL = "View all tools" as const;
export const HOME_DENSITY_VIEW_ALL_TOOLS_HREF = "/tools" as const;
export const HOME_DENSITY_WHATS_NEXT_HEADING = "What's next" as const;
export const HOME_DENSITY_TOOLS_HEADING = "Tools" as const;

/**
 * State A hub-lens cards. Live `/tools/*` hub routes only.
 * Dim lines are locked craft (≤8 words). Never invent simulation-count theater or dollar chrome.
 */
export const HOME_DENSITY_LENSES = [
  {
    id: "affordability",
    href: "/tools/affordability",
    title: "Affordability",
    line: "Housing tiers for your ledger",
  },
  {
    id: "debt-payoff",
    href: "/tools/debt-payoff",
    title: "Debt Payoff",
    line: "Avalanche vs snowball paths",
  },
  {
    id: "blind-budget",
    href: "/tools/blind-budget",
    title: "Blind Budget",
    line: "Empty-ledger spending lens",
  },
  {
    id: "monte-carlo",
    href: "/tools/monte-carlo",
    title: "Monte Carlo",
    line: "Simulated paths — educational",
  },
] as const;

/** HOME_CRAFT / HOME_FIRST_VIEWPORT month crop. Short English, UTC, no period. */
const FOLD_AGE_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Age fragment: "from Aug 29". Null when the timestamp is unusable — never invent a date. */
export function foldScoreAgeCrop(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return null;
  const month = FOLD_AGE_SHORT_MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (!month || !Number.isFinite(day) || day < 1) return null;
  return `from ${month} ${day}`;
}

/**
 * Age fragment for the one score line: "from Aug 29".
 * The JetBrains numeral is rendered once beside this — never concatenate
 * the score here or the fold prints it twice.
 * Omit entirely when score or date is missing — no age theater on empty Home.
 */
export function foldScoreAgeLine(
  scorePct: number | null,
  iso: string | null | undefined,
): string | null {
  if (scorePct == null || !Number.isFinite(scorePct)) return null;
  return foldScoreAgeCrop(iso);
}

export type FoldPathPrimary = {
  href: string;
  title: string;
};

/**
 * Fold hard-stop codes. Same four Path already ranks.
 * Do not import the engine; this is display copy only.
 */
export const FOLD_HARD_STOP_CODES = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

export type FoldHardStopCode = (typeof FOLD_HARD_STOP_CODES)[number];

/**
 * Path + hard stops lead. Same precedence as Path HARD_STOP_ORDER.
 * Do not invent a new ranking.
 */
export const FOLD_HARD_STOP_PRECEDENCE: readonly FoldHardStopCode[] = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

/** Baseline 001 hard-stop kicker — sentence case, once. Not an ALL-CAPS wall. */
export const hardStopEyebrow = "Hard stop · runway." as const;

/** Baseline 001 hold line. Path owns the move; this names why. */
export const homeHoldSentence =
  "Runway is the hold. Build the fund before anything else." as const;

type FoldHardStopCopy = {
  eyebrow: string;
  hold: string;
  override: (scorePct: number) => string;
};

function foldHardStopCopy(
  code: FoldHardStopCode,
  decisionType: string = "home_buying",
): FoldHardStopCopy {
  return foldHardStopDisplay(code, decisionType);
}

export function isFoldHardStopCode(value: unknown): value is FoldHardStopCode {
  return (
    value === "RUNWAY_UNDER_1_MONTH" ||
    value === "DTI_OVER_50" ||
    value === "HOUSING_RATIO_OVER_45" ||
    value === "CREDIT_UNDER_620"
  );
}

/**
 * Neutral fold copy when the stop code is unknown or missing.
 * Must not invent RUNWAY_UNDER_1_MONTH. See docs/design/baseline/VERIFIER-NOTE-F1.md.
 */
export const NEUTRAL_HARD_STOP_EYEBROW = "Hard stop." as const;

export function foldNeutralHardStopOverrideLine(scorePct: number): string {
  return `${scorePct} — hard stop.`;
}

/**
 * Resolve a stored or Path code. Unknown / missing stays null — never invent runway.
 * Same posture as resolveFoldPathPrimary (unknown = no swap).
 */
export function resolveFoldHardStopCode(
  code: FoldHardStopCode | null | undefined,
): FoldHardStopCode | null {
  return isFoldHardStopCode(code) ? code : null;
}

/** Codes from the same hard_stops rows that carry a human message. */
export function hardStopCodes(hardStops: unknown): FoldHardStopCode[] {
  if (!Array.isArray(hardStops)) return [];
  const codes: FoldHardStopCode[] = [];
  for (const row of hardStops) {
    if (!row || typeof row !== "object") continue;
    const message = (row as { message?: unknown }).message;
    if (typeof message !== "string" || !message.trim()) continue;
    const code = (row as { code?: unknown }).code;
    if (isFoldHardStopCode(code)) codes.push(code);
  }
  return codes;
}

/** First active stop in Path order. Null when no known code is present. */
export function leadingFoldHardStopCode(
  codes: readonly unknown[],
): FoldHardStopCode | null {
  const present = new Set<FoldHardStopCode>();
  for (const code of codes) {
    if (isFoldHardStopCode(code)) present.add(code);
  }
  if (present.size === 0) return null;
  for (const code of FOLD_HARD_STOP_PRECEDENCE) {
    if (present.has(code)) return code;
  }
  return null;
}

export function foldHardStopEyebrow(
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string {
  const resolved = resolveFoldHardStopCode(code);
  if (!resolved) return NEUTRAL_HARD_STOP_EYEBROW;
  return foldHardStopCopy(resolved, decisionType).eyebrow;
}

/**
 * Split "Hard stop · runway." so only the cause token can take crimson.
 * Neutral "Hard stop." has no accent — never invent a runway word.
 */
export function foldHardStopEyebrowParts(eyebrow: string): {
  lead: string;
  accent: string | null;
} {
  const sep = " · ";
  const idx = eyebrow.indexOf(sep);
  if (idx === -1) return { lead: eyebrow, accent: null };
  return {
    lead: eyebrow.slice(0, idx + sep.length),
    accent: eyebrow.slice(idx + sep.length),
  };
}

/** Hold sentence for a known stop. Null when the code is unknown — omit the line. */
export function foldHomeHoldSentence(
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string | null {
  const resolved = resolveFoldHardStopCode(code);
  if (!resolved) return null;
  return foldHardStopCopy(resolved, decisionType).hold;
}

/** Honest empty for last-read cash. Never a bare em dash next to a hard stop. */
export const CASH_EMPTY_LABEL = "Connect accounts to see cash." as const;

/**
 * Path SSOT for a runway hard stop. Never the 3–6 month grow-fund title on this fold.
 * DTI / housing / credit Path titles stay in lib/readiness/path.ts — do not rewrite them here.
 */
export const RUNWAY_HARD_STOP_PATH_TITLE =
  "Stabilize emergency runway to at least 1 month" as const;

/**
 * Fold CTA — Companion voice. Path step title stays the Path SSOT above.
 * Kill "emergency" ops tone on the Home fold only.
 */
export const RUNWAY_HARD_STOP_FOLD_TITLE = "Build runway to 1 month" as const;

const GROW_EMERGENCY_FUND_TITLE = "Grow emergency fund toward 3–6 months";

/** Quiet override line: score is real; a hard stop still holds. No 35/35/30, no cutoffs. */
export function foldHardStopOverrideLine(
  scorePct: number,
  code?: FoldHardStopCode | null,
  decisionType: string = "home_buying",
): string {
  const resolved = resolveFoldHardStopCode(code);
  if (!resolved) return foldNeutralHardStopOverrideLine(scorePct);
  return foldHardStopCopy(resolved, decisionType).override(scorePct);
}

/**
 * Fold Path primary. A stored 3–6 month grow-fund title or Path SSOT
 * stabilize title is the wrong close only while RUNWAY_UNDER_1_MONTH is
 * the resolved stop — swap to Companion fold voice. DTI / housing / credit
 * keep the live Path title.
 */
export function resolveFoldPathPrimary(
  pathPrimary: FoldPathPrimary | null,
  stopCode?: FoldHardStopCode | null,
): FoldPathPrimary | null {
  if (!pathPrimary) return null;
  if (stopCode === "RUNWAY_UNDER_1_MONTH") {
    if (
      pathPrimary.title === GROW_EMERGENCY_FUND_TITLE ||
      pathPrimary.title === RUNWAY_HARD_STOP_PATH_TITLE ||
      pathPrimary.title === RUNWAY_HARD_STOP_FOLD_TITLE
    ) {
      return { ...pathPrimary, title: RUNWAY_HARD_STOP_FOLD_TITLE };
    }
  }
  return pathPrimary;
}

/**
 * Quiet What’s next titles below the fold. Path SSOT titles only — no fold
 * companion remap, no $ invent, no +points. Cap at three pending steps.
 */
export function foldDensityPathTitles(
  steps: unknown,
  limit: number = HOME_DENSITY_MAX_PATH_STEPS,
): string[] {
  if (!Array.isArray(steps)) return [];
  const titles: string[] = [];
  for (const step of steps) {
    if (titles.length >= limit) break;
    if (!step || typeof step !== "object") continue;
    const row = step as { title?: unknown; status?: unknown };
    const status = row.status ?? "pending";
    if (status !== "pending") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    titles.push(title);
  }
  return titles;
}

/** Next pending Path step for the fold — one primary, never REASSESS as the hero. */
export function foldPathPrimary(steps: unknown): FoldPathPrimary | null {
  if (!Array.isArray(steps)) return null;
  let firstPending: FoldPathPrimary | null = null;
  let runwayPending: FoldPathPrimary | null = null;
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const row = step as { title?: unknown; href?: unknown; status?: unknown; reasonCode?: unknown };
    if (row.reasonCode === "REASSESS") continue;
    const status = row.status ?? "pending";
    if (status !== "pending") continue;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!title || !href) continue;
    const item: FoldPathPrimary = { title, href };
    if (!firstPending) firstPending = item;
    if (row.reasonCode === "RUNWAY_UNDER_1_MONTH") {
      runwayPending = { title: RUNWAY_HARD_STOP_PATH_TITLE, href };
    }
  }
  return runwayPending ?? firstPending;
}

/** Last AssessmentResult emergency-fund months. Under 1 month is named, never 0.5 mo. */
export function foldRunwayLabel(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return "\u2014";
  if (months < 1) return "Under 1 month";
  const shown = months >= 10 ? months.toFixed(0) : months.toFixed(1);
  return `${shown} mo`;
}

/** Count actionable Path steps from a stored path payload (server or local). */
export function pathStepCounts(steps: unknown): { done: number; total: number } {
  if (!Array.isArray(steps)) return { done: 0, total: 0 };
  let done = 0;
  let total = 0;
  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const reason = (step as { reasonCode?: unknown }).reasonCode;
    if (reason === "REASSESS") continue;
    total += 1;
    const status = (step as { status?: unknown }).status ?? "pending";
    if (status !== "pending") done += 1;
  }
  return { done, total };
}

export type HomeFoldPillar = "financial" | "emotional" | "timing";

function pillarDisplayName(key: HomeFoldPillar): string {
  switch (key) {
    case "financial":
      return "Financial Reality";
    case "emotional":
      return "Emotional Truth";
    case "timing":
      return "Perfect Timing";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

/** Softest measured pillar. Null scores (skipped ET) are not treated as zero. */
export function weakestMeasuredPillar(scores: {
  financial: number | null;
  emotional: number | null;
  timing: number | null;
}): HomeFoldPillar | null {
  const measured: Array<{ key: HomeFoldPillar; value: number }> = [];
  const entries: Array<[HomeFoldPillar, number | null]> = [
    ["financial", scores.financial],
    ["emotional", scores.emotional],
    ["timing", scores.timing],
  ];
  for (const [key, value] of entries) {
    if (value !== null) measured.push({ key, value });
  }
  if (measured.length === 0) return null;
  measured.sort((a, b) => a.value - b.value);
  return measured[0].key;
}

/** One fold sentence: hard stop outranks the weak-pillar line. */
export function homeFoldSentence(args: {
  hardStopCount: number;
  weakestPillar: HomeFoldPillar | null;
  hasPath: boolean;
  hasAssessment: boolean;
}): string {
  if (args.hardStopCount > 0) {
    return companionFoldLine({
      hasHardStops: true,
      hasPath: args.hasPath,
      hasAssessment: args.hasAssessment,
    });
  }
  if (args.weakestPillar) {
    return `${pillarDisplayName(args.weakestPillar)} is the softest pillar on this read.`;
  }
  return companionFoldLine({
    hasHardStops: false,
    hasPath: args.hasPath,
    hasAssessment: args.hasAssessment,
  });
}
