/**
 * Marketing agency suite for /admin/marketing — prompts, platform metadata,
 * the claim-law guardrail, and deterministic copy templates.
 *
 * Pure and dependency-free on purpose: no env access, no side effects, no Node
 * built-ins. The same module loads inside the AI route
 * (app/api/admin/marketing-ai/route.ts), inside the four client studio
 * components, and under vitest without a DOM.
 *
 * The templates are not filler. When ANTHROPIC_API_KEY is unset the endpoint
 * returns them verbatim, so the studio is a working tool at $0 AI cost.
 */

/* ------------------------------------------------------------------ *
 * Platforms, tones, hook styles
 * ------------------------------------------------------------------ */

export type SocialPlatform = "linkedin" | "x" | "instagram" | "threads" | "tiktok";
export type PostTone = "educational" | "story" | "authority" | "hook" | "engagement";
export type HookStyle = "question" | "stat" | "story" | "quote" | "controversial";

/**
 * Hard character ceilings enforced client-side (badge only, never a server gate).
 * TikTok caption ceiling is ~2,200 — documented here so studio + templates share one number.
 */
export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  x: 280,
  tiktok: 2200,
  linkedin: 3000,
  instagram: 2200,
  threads: 500,
};

/** This-week engines. Instagram / Threads stay in the union; they are not peers. */
export const FIRST_CLASS_ENGINES = ["x", "tiktok"] as const satisfies readonly SocialPlatform[];

/** Studio + calendar default. Never LinkedIn — that made the week engine LinkedIn-only. */
export const DEFAULT_SOCIAL_PLATFORM: SocialPlatform = "x";

export type PlatformMeta = {
  key: SocialPlatform;
  label: string;
  limit: number;
  /** utm_source / utm_medium stamped on the post's link. */
  utmSource: string;
  utmMedium: string;
  /** Public handle when this surface is a first-class engine. */
  handle?: string;
  /** Formatting brief handed to the model. */
  brief: string;
  /** How many hashtags the platform actually rewards. */
  hashtagCount: number;
};

export const PLATFORMS: PlatformMeta[] = [
  {
    key: "x",
    label: "X",
    limit: PLATFORM_LIMITS.x,
    utmSource: "x",
    utmMedium: "social",
    handle: "@Homi_Tech",
    brief:
      "One tight post under 280 characters including the link. Declarative, no throat-clearing, " +
      "no hashtag stuffing. Say one true thing well.",
    hashtagCount: 2,
  },
  {
    key: "tiktok",
    label: "TikTok",
    limit: PLATFORM_LIMITS.tiktok,
    utmSource: "tiktok",
    utmMedium: "social",
    handle: "@homi_technology",
    brief:
      "Caption for a short video. Hook in the first line, then a breathable body under the " +
      "2,200-character caption ceiling. One idea. Soft close to the link in bio. No hashtag walls.",
    hashtagCount: 4,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    limit: PLATFORM_LIMITS.linkedin,
    utmSource: "linkedin",
    utmMedium: "social",
    brief:
      "Long-form founder post. Strong first line (it is the only line shown before the fold), " +
      "short paragraphs, one idea per line, a concrete takeaway, and a soft close. No emoji walls.",
    hashtagCount: 3,
  },
  {
    key: "instagram",
    label: "Instagram",
    limit: PLATFORM_LIMITS.instagram,
    utmSource: "instagram",
    utmMedium: "social",
    brief:
      "Caption for a static graphic. Hook line, a short breathable body with line breaks, " +
      "then a clear call to action pointing at the link in bio.",
    hashtagCount: 5,
  },
  {
    key: "threads",
    label: "Threads",
    limit: PLATFORM_LIMITS.threads,
    utmSource: "threads",
    utmMedium: "social",
    brief:
      "Conversational and under 500 characters. Written like a reply someone would want to " +
      "answer. Minimal hashtags.",
    hashtagCount: 2,
  },
];

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && PLATFORMS.some((p) => p.key === value);
}

export function platformMeta(key: SocialPlatform): PlatformMeta {
  return (
    PLATFORMS.find((p) => p.key === key) ??
    PLATFORMS.find((p) => p.key === DEFAULT_SOCIAL_PLATFORM) ??
    PLATFORMS[0]!
  );
}

/** Primary studio toggles: engines first, LinkedIn as a third surface. */
export const STUDIO_PRIMARY_PLATFORMS: SocialPlatform[] = ["x", "tiktok", "linkedin"];

/** Not first-class engines — stay in the type union, hidden behind Advanced. */
export const STUDIO_SECONDARY_PLATFORMS: SocialPlatform[] = ["instagram", "threads"];

/**
 * Repurpose targets. X is a compose target, not caption-only.
 * TikTok is included. LinkedIn is optional third. Instagram / Threads are not peers.
 * Source is whatever is on the canvas — LinkedIn is not required.
 */
export function repurposeTargets(from: SocialPlatform): SocialPlatform[] {
  const engines: SocialPlatform[] = ["x", "tiktok"];
  const third: SocialPlatform[] = ["linkedin"];
  return [...engines, ...third].filter((p) => p !== from);
}

export const TONES: { key: PostTone; label: string; brief: string }[] = [
  {
    key: "educational",
    label: "Educational",
    brief: "Teach one mechanic the reader can use today. Show the reasoning, not the conclusion.",
  },
  {
    key: "story",
    label: "Story",
    brief: "One specific moment, told plainly. Let the lesson land without stating a moral.",
  },
  {
    key: "authority",
    label: "Authority",
    brief: "State a position and back it with the reasoning. Confident, never boastful.",
  },
  {
    key: "hook",
    label: "Hook",
    brief: "Front-load tension in the first line, then resolve it honestly in the body.",
  },
  {
    key: "engagement",
    label: "Engagement",
    brief: "Open a real question the reader has an answer to. End by inviting their answer.",
  },
];

export const HOOK_STYLES: { key: HookStyle; label: string; brief: string }[] = [
  { key: "question", label: "Question", brief: "Open with the question the reader is already asking themselves." },
  { key: "stat", label: "Stat", brief: "Open with a concrete number, and only one the post can stand behind." },
  { key: "story", label: "Story", brief: "Open mid-scene with a specific, ordinary moment." },
  { key: "quote", label: "Quote", brief: "Open with a line someone actually says out loud." },
  { key: "controversial", label: "Controversial", brief: "Open by naming the comfortable assumption you are about to disagree with." },
];

/* ------------------------------------------------------------------ *
 * Claim law
 * ------------------------------------------------------------------ */

/**
 * Prohibition registry — the exact phrases HōMI refuses to publish.
 *
 * Used twice: injected into the model system prompt as a denylist, and matched
 * against every completion (server-side, then again client-side) so a bad
 * generation never reaches the clipboard. Matching is case-insensitive and
 * tolerant of hyphen/space variants — see stripNeverSay.
 *
 * The per-line brand-ok comments below are required because this array holds
 * the banned strings verbatim; that is the whole point of a denylist.
 */
export const NEVER_SAY_PHRASES: string[] = [
  "pre-approved",
  "preapproved",
  "pre-approval", // brand-ok: prohibition registry entry, copy we refuse to publish
  "pre-qualified",
  "prequalified",
  "you qualify",
  "you are approved",
  "guaranteed", // brand-ok: prohibition registry entry, copy we refuse to publish
  "guarantee",
  "risk-free",
  "will buy",
  "replaces your credit score", // brand-ok: prohibition registry entry, copy we refuse to publish
  "credit score replacement",
  "our lenders",
  "best deal",
  "financial advice",
  "bank-level", // brand-ok: prohibition registry entry, copy we refuse to publish
  "military-grade",
  "dream home", // brand-ok: prohibition registry entry, copy we refuse to publish
];

/** Language the copy should reach for instead. */
export const PREFERRED_PHRASES: string[] = [
  "readiness signal",
  "decision ready",
  "afford ≠ ready",
  "not yet is not no",
  "Build First",
  "educational guidance only",
  "not a lender",
  "not a credit score substitute",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary matcher that also catches spacing variants — "pre approved"
 * and "pre-approved" are the same prohibited claim. escapeRegExp leaves "-"
 * alone (it is literal outside a character class), so the separator collapse
 * below sees the raw hyphens.
 */
function phrasePattern(phrase: string): RegExp {
  const body = escapeRegExp(phrase).replace(/[\s-]+/g, "[\\s-]+");
  return new RegExp(`\\b${body}\\b`, "gi");
}

export type ClaimCheck = {
  /** Copy with every prohibited phrase removed and whitespace re-tidied. */
  clean: string;
  /** Which registry entries were found, in registry order. Empty = clean. */
  flagged: string[];
};

/**
 * Strip prohibited phrases from generated copy and report what was removed.
 *
 * Removal rather than substitution is deliberate: a silent synonym swap can
 * invent a claim the model never made, whereas a gap plus a red badge tells the
 * operator to rewrite the line themselves.
 */
export function stripNeverSay(text: string): ClaimCheck {
  const flagged: string[] = [];
  let clean = text;

  for (const phrase of NEVER_SAY_PHRASES) {
    if (!phrasePattern(phrase).test(clean)) continue;
    flagged.push(phrase);
    clean = clean.replace(phrasePattern(phrase), "");
  }

  if (flagged.length > 0) {
    clean = clean
      .replace(/[ \t]{2,}/g, " ")
      .replace(/ +([,.!?;:])/g, "$1")
      .replace(/\n[ \t]+/g, "\n")
      .trim();
  }

  return { clean, flagged };
}

/** True when the copy carries no prohibited phrase. Drives the studio badge. */
export function isClaimClean(text: string): boolean {
  return stripNeverSay(text).flagged.length === 0;
}

/* ------------------------------------------------------------------ *
 * Prompts
 * ------------------------------------------------------------------ */

/**
 * Shared system prompt for every action. The prohibition and preference lists
 * are interpolated from the arrays above rather than restated here, so the
 * denylist has exactly one definition and cannot drift from the guardrail that
 * enforces it.
 */
export const AGENCY_SYSTEM_PROMPT = [
  "You are the in-house marketing copywriter for HōMI.",
  "",
  "WHAT HōMI IS",
  "- A decision readiness platform for major purchase commitments — home first, then car.",
  "- It turns scattered financial signals into one readiness verdict and a Build First path.",
  "- It is educational guidance only. It is not a lender, not a broker, not a credit bureau,",
  "  and it does not give advice about what someone should buy.",
  "",
  "WHO IT IS FOR",
  '- The ICP says: "I can afford it, but I am not sure I will be okay."',
  "- Their problem is decision anxiety on a major commitment, not rate shopping.",
  "- Anti-ICP: approval seekers, rate shoppers, and anyone looking for a credit score substitute.",
  "",
  "VOICE",
  "- Clear, direct, empathetic, grounded in data. Short sentences. Concrete nouns.",
  "- Never hype. Never promise an outcome. Never imply a lending decision has been made.",
  "- Write like a founder who respects the reader's intelligence and time.",
  "",
  `NEVER USE THESE PHRASES OR ANY PARAPHRASE OF THEM: ${NEVER_SAY_PHRASES.join(", ")}.`,
  `PREFER THIS LANGUAGE: ${PREFERRED_PHRASES.join(", ")}.`,
  "",
  "OUTPUT RULES",
  "- Respect the target platform's character ceiling and native formatting.",
  "- At most two emoji, and only where the platform expects them.",
  "- Reply with the requested JSON object and nothing else. No preamble, no code fences.",
].join("\n");

export function buildPostPrompt(input: {
  platform: SocialPlatform;
  tone: PostTone;
  topic: string;
  wordCount?: number;
  persona?: string;
}): string {
  const meta = platformMeta(input.platform);
  const tone = TONES.find((t) => t.key === input.tone) ?? TONES[0]!;
  const target = input.wordCount ? `Aim for roughly ${input.wordCount} words. ` : "";
  const persona = input.persona?.trim();

  return [
    `Write one ${meta.label} post for HōMI.`,
    "",
    `TOPIC: ${input.topic}`,
    `TONE: ${tone.label} — ${tone.brief}`,
    ...(persona
      ? [
          `Write for this specific ICP persona: ${persona}. Address their specific anxiety.`,
          "Use their language. Do not name the persona label in the copy itself.",
        ]
      : []),
    `PLATFORM BRIEF: ${meta.brief}`,
    `HARD CEILING: ${meta.limit} characters for the post copy. ${target}`.trim(),
    "",
    "Return this JSON object:",
    "{",
    '  "copy": "the full post copy, ready to paste, no hashtags inside it",',
    `  "hashtags": ["exactly ${meta.hashtagCount} hashtags, each starting with #"],`,
    '  "utmSuggestion": "a short lowercase utm_campaign slug, words joined by underscores"',
    "}",
  ].join("\n");
}

export function buildInsightPrompt(input: {
  verdictCounts: Record<string, number>;
  channelCounts: { label: string; count: number }[];
  interestCounts: { interest: string; count: number }[];
}): string {
  const verdicts = Object.entries(input.verdictCounts)
    .map(([key, count]) => `${key}=${count}`)
    .join(", ");
  const channels = input.channelCounts.map((c) => `${c.label}=${c.count}`).join(", ") || "none";
  const interests = input.interestCounts.map((i) => `${i.interest}=${i.count}`).join(", ") || "none";

  return [
    "Read this audience snapshot and state the marketing implication.",
    "",
    `READINESS VERDICTS: ${verdicts || "none"}`,
    `SIGNUP CHANNELS: ${channels}`,
    `WAITLIST INTERESTS: ${interests}`,
    "",
    "Write 2-3 sentences for the founder running growth. Say what the numbers mean for what",
    "to publish next week — a specific message or channel decision, not a summary of the data.",
    "If the counts are too small to support a conclusion, say so plainly and name what to",
    "collect first. Never claim causation from these counts.",
    "",
    'Return this JSON object: { "insight": "the 2-3 sentences" }',
  ].join("\n");
}

export function buildCaptionPrompt(input: {
  idea: string;
  imageDescription?: string;
  platform: SocialPlatform;
  hookStyle: HookStyle;
}): string {
  const meta = platformMeta(input.platform);
  const style = HOOK_STYLES.find((h) => h.key === input.hookStyle) ?? HOOK_STYLES[0]!;
  const visual = input.imageDescription?.trim()
    ? `THE VISUAL: ${input.imageDescription.trim()}`
    : "THE VISUAL: not described — write copy that stands on its own.";

  return [
    `Write one ${meta.label} caption for HōMI.`,
    "",
    `KEY MESSAGE: ${input.idea}`,
    visual,
    `HOOK STYLE: ${style.label} — ${style.brief}`,
    `PLATFORM BRIEF: ${meta.brief}`,
    `HARD CEILING: ${meta.limit} characters for hook plus body combined.`,
    "",
    "Return this JSON object:",
    "{",
    '  "hook": "a single opening line",',
    '  "body": "the caption body, no hashtags inside it",',
    `  "hashtags": ["exactly ${meta.hashtagCount} relevant hashtags, each starting with #"]`,
    "}",
  ].join("\n");
}

/* ------------------------------------------------------------------ *
 * Deterministic templates (used when no API key is configured)
 * ------------------------------------------------------------------ */

const HASHTAG_POOL = [
  "#DecisionReadiness",
  "#HomeBuying",
  "#FinancialClarity",
  "#BuildFirst",
  "#MoneyDecisions",
  "#FirstTimeBuyer",
];

export function defaultHashtags(platform: SocialPlatform): string[] {
  return HASHTAG_POOL.slice(0, platformMeta(platform).hashtagCount);
}

/** Lowercase underscore slug suitable for a utm_campaign value. */
export function slugifyCampaign(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return slug || "founder_post";
}

/** Trim to a platform ceiling on a word boundary rather than mid-word. */
export function fitToLimit(text: string, limit: number): string {
  if (limit <= 0) return "";
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit - 1);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  return `${(lastBreak > limit * 0.6 ? cut.slice(0, lastBreak) : cut).trimEnd()}…`;
}

const TONE_TEMPLATES: Record<PostTone, (topic: string) => string[]> = {
  educational: (topic) => [
    `Affordability math answers one question about ${topic}: what fits on paper.`,
    "",
    "It does not answer the one people actually lose sleep over — what happens the month after.",
    "",
    "Three checks worth running first:",
    "1. What your cushion looks like 30 days after, not on the day of.",
    "2. Which single expense would hurt most if it moved 20%.",
    "3. What you would have to stop doing to keep the payment comfortable.",
    "",
    "That gap has a name. Afford ≠ ready.",
  ],
  story: (topic) => [
    `Someone told me they had been researching ${topic} for eleven months.`,
    "",
    "Spreadsheets. Calculators. Three different opinions from three different people.",
    "",
    "They still could not answer the simplest question in the room: are you okay if this goes ahead?",
    "",
    "That is not a math problem. That is a readiness problem, and it is the one nobody was solving.",
  ],
  authority: (topic) => [
    `The hardest part of ${topic} is not the number. It is knowing whether the number is survivable.`,
    "",
    "Every tool in this category answers the same question — how much can you carry.",
    "",
    "Almost nothing answers the question underneath it: what does your life look like after you commit, and what would have to be true for that to feel steady?",
    "",
    "That is the layer HōMI works on. Educational guidance only, and a Build First path when the answer is not yet.",
  ],
  hook: (topic) => [
    `You can afford ${topic} and still not be ready for it.`,
    "",
    "Those are two different questions, and only one of them gets asked.",
    "",
    "The first is arithmetic. The second is what your month looks like when the payment is real, the cushion is thinner, and something unexpected shows up anyway.",
    "",
    "Not yet is not no. It is a map with a date on it.",
  ],
  engagement: (topic) => [
    `Honest question for anyone weighing ${topic}:`,
    "",
    "What is the one thing you would need to see to feel genuinely settled about it?",
    "",
    "Not what a calculator says. What would actually let you stop second-guessing the decision.",
    "",
    "I am collecting answers — they keep pointing at the same missing signal.",
  ],
};

export type GeneratedPost = { copy: string; hashtags: string[]; utmSuggestion: string };

export function templatePost(input: {
  platform: SocialPlatform;
  tone: PostTone;
  topic: string;
  persona?: string;
}): GeneratedPost {
  const meta = platformMeta(input.platform);
  const topic = input.topic.trim() || "a major purchase decision";
  const persona = input.persona?.trim();
  const lines = TONE_TEMPLATES[input.tone](topic);
  // The template path cannot rewrite for a persona, so it says who the post was
  // aimed at rather than pretending the targeting happened.
  const body = (persona ? [...lines, "", `(Written for: ${persona})`] : lines).join("\n");

  return {
    copy: fitToLimit(stripNeverSay(body).clean, meta.limit),
    hashtags: defaultHashtags(input.platform),
    utmSuggestion: `${meta.utmSource}_${slugifyCampaign(topic)}`.slice(0, 60),
  };
}

export function templateInsight(input: {
  verdictCounts: Record<string, number>;
  channelCounts: { label: string; count: number }[];
  interestCounts: { interest: string; count: number }[];
}): { insight: string } {
  const verdictTotal = Object.values(input.verdictCounts).reduce((sum, n) => sum + n, 0);
  const readyPct = verdictTotal > 0 ? Math.round(((input.verdictCounts.READY ?? 0) / verdictTotal) * 100) : 0;
  const topChannel = [...input.channelCounts].sort((a, b) => b.count - a.count)[0];
  const topInterest = [...input.interestCounts].sort((a, b) => b.count - a.count)[0];

  if (verdictTotal === 0 && !topChannel && !topInterest) {
    return {
      insight:
        "There is not enough data yet to draw a conclusion. Publish the week's slate with tagged links so the next read has channel truth behind it, and treat the first ten activations as the sample worth learning from.",
    };
  }

  const parts: string[] = [];
  if (verdictTotal > 0) {
    parts.push(
      readyPct >= 40
        ? `${readyPct}% of completed assessments scored READY — this audience is close to a decision, so lead with urgency and next steps rather than education.`
        : `Only ${readyPct}% scored READY, so most of this audience is still building — lead with the Build First path and treat "not yet" as the message, not a failure state.`,
    );
  }
  if (topChannel) {
    parts.push(
      `${topChannel.label} is the strongest signup channel at ${topChannel.count}; keep the weekly cadence there before adding a second surface.`,
    );
  }
  if (topInterest) {
    parts.push(`Demand is concentrated in ${topInterest.interest} — make that the next content hub.`);
  }

  return { insight: parts.join(" ") };
}

export type GeneratedCaption = { hook: string; body: string; hashtags: string[] };

const HOOK_TEMPLATES: Record<HookStyle, (idea: string) => string> = {
  question: (idea) => `What would it take for ${idea} to feel settled instead of stressful?`,
  stat: () => "Most people check what they can afford. Far fewer check what happens the month after.",
  story: (idea) => `They had the down payment ready and still could not sleep. ${idea}`,
  quote: () => '"I can afford it. I just do not know if I will be okay."',
  controversial: () => "Being approved for a number tells you almost nothing about whether you are ready for it.",
};

export function templateCaption(input: {
  idea: string;
  imageDescription?: string;
  platform: SocialPlatform;
  hookStyle: HookStyle;
}): GeneratedCaption {
  const meta = platformMeta(input.platform);
  const idea = input.idea.trim() || "a major purchase decision";
  const hook = stripNeverSay(HOOK_TEMPLATES[input.hookStyle](idea)).clean;

  // Blank strings are paragraph breaks, not empties — do not filter them out.
  const paragraphs = [
    `${idea.charAt(0).toUpperCase()}${idea.slice(1)}.`,
    "",
    "Affordability is arithmetic. Readiness is what your life looks like after you commit — the cushion, the month-after, the thing that goes wrong anyway.",
    "",
    "HōMI reads the signals you already have and gives you one readiness verdict plus the path to close the gap. Educational guidance only — not a lender, not a credit score substitute.",
  ];
  const visual = input.imageDescription?.trim();
  if (visual) paragraphs.push("", `(${visual})`);

  const body = stripNeverSay(paragraphs.join("\n")).clean;

  return {
    hook: fitToLimit(hook, Math.min(220, meta.limit)),
    body: fitToLimit(body, Math.max(0, meta.limit - hook.length - 2)),
    hashtags: defaultHashtags(input.platform),
  };
}

/* ------------------------------------------------------------------ *
 * Content calendar
 * ------------------------------------------------------------------ */

export const CALENDAR_STORAGE_KEY = "homi-content-calendar";

export const CALENDAR_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const CALENDAR_SLOTS = ["morning", "afternoon"] as const;

export type CalendarDay = (typeof CALENDAR_DAYS)[number];
export type CalendarSlot = (typeof CALENDAR_SLOTS)[number];
/** One post per (day, slot) — the key doubles as the entry's identity. */
export type CalendarKey = `${CalendarDay}:${CalendarSlot}`;

export type CalendarEntry = {
  day: CalendarDay;
  slot: CalendarSlot;
  platform: SocialPlatform;
  tone: PostTone;
  campaign: string;
  copy: string;
};

export type CalendarBoard = Partial<Record<CalendarKey, CalendarEntry>>;

export function calendarKey(day: CalendarDay, slot: CalendarSlot): CalendarKey {
  return `${day}:${slot}`;
}

const SLOT_LABELS: Record<CalendarSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
};

export function slotLabel(slot: CalendarSlot): string {
  return SLOT_LABELS[slot];
}

function isCalendarDay(value: unknown): value is CalendarDay {
  return typeof value === "string" && (CALENDAR_DAYS as readonly string[]).includes(value);
}

function isCalendarSlot(value: unknown): value is CalendarSlot {
  return typeof value === "string" && (CALENDAR_SLOTS as readonly string[]).includes(value);
}

function enginePlatform(value: unknown): SocialPlatform {
  return value === "tiktok" ? "tiktok" : DEFAULT_SOCIAL_PLATFORM;
}

function engineSlot(platform: SocialPlatform): CalendarSlot {
  return platform === "tiktok" ? "afternoon" : "morning";
}

/**
 * Seed X + TikTok slots from the engine slate — never a LinkedIn-only week.
 * Untitled / empty copy is allowed (titled placeholders). Calendar mount does
 * not auto-apply this; empty slots stay empty until the operator seeds or drafts.
 */
export function seedCalendarFromEngine(
  posts: { day: string; title: string; campaign: string; platform?: string }[],
): CalendarBoard {
  const board: CalendarBoard = {};
  const fallbackDays: CalendarDay[] = ["Mon", "Wed", "Fri"];

  posts.forEach((post, index) => {
    const day = isCalendarDay(post.day) ? post.day : fallbackDays[index % fallbackDays.length]!;
    const platform = enginePlatform(post.platform);
    const slot = engineSlot(platform);
    board[calendarKey(day, slot)] = {
      day,
      slot,
      platform,
      tone: "authority",
      campaign: post.campaign,
      copy: post.title,
    };
  });

  return board;
}

/** Defensive read of the localStorage payload — any malformed entry is dropped. */
export function parseStoredCalendar(raw: string | null): CalendarBoard | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const board: CalendarBoard = {};
  for (const value of Object.values(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Partial<CalendarEntry>;
    if (!isCalendarDay(entry.day) || !isCalendarSlot(entry.slot)) continue;
    if (typeof entry.copy !== "string" || typeof entry.campaign !== "string") continue;
    const platform = isSocialPlatform(entry.platform)
      ? entry.platform
      : DEFAULT_SOCIAL_PLATFORM;
    const tone = TONES.some((t) => t.key === entry.tone) ? (entry.tone as PostTone) : "authority";
    board[calendarKey(entry.day, entry.slot)] = {
      day: entry.day,
      slot: entry.slot,
      platform,
      tone,
      campaign: entry.campaign,
      copy: entry.copy,
    };
  }
  return board;
}

/** One post per line, newline-separated — the calendar's copyable export. */
export function calendarToText(board: CalendarBoard): string {
  const lines: string[] = [];
  for (const day of CALENDAR_DAYS) {
    for (const slot of CALENDAR_SLOTS) {
      const entry = board[calendarKey(day, slot)];
      if (!entry) continue;
      const oneLine = entry.copy.replace(/\s*\n+\s*/g, " ").trim();
      lines.push(
        `${day} · ${slotLabel(slot)} · ${platformMeta(entry.platform).label} · ${entry.tone} · ${entry.campaign} — ${oneLine}`,
      );
    }
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * Cross-component wiring
 * ------------------------------------------------------------------ */

/**
 * The calendar's "+ Add post" opens the studio, and the studio pushes a
 * finished post back into a slot. Both components are independent client
 * islands under a server page, so they hand off through window CustomEvents
 * rather than a shared provider.
 */
export const STUDIO_PREFILL_EVENT = "homi:studio-prefill";
export const CALENDAR_ADD_EVENT = "homi:calendar-add";

export type StudioPrefillDetail = {
  day: CalendarDay;
  slot: CalendarSlot;
  topic?: string;
};

export type CalendarAddDetail = {
  day?: CalendarDay;
  slot?: CalendarSlot;
  platform: SocialPlatform;
  tone: PostTone;
  campaign: string;
  copy: string;
};

/* ================================================================== *
 * TIER-2 EXTENSION — personas, repurpose, scorecard, image brief,    *
 * drip sequences, analytics, competitor intel, post performance,      *
 * theme calendar, webhook publisher.                                  *
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * Personas                                                            *
 * ------------------------------------------------------------------ */

export type PersonaKey =
  | "all"
  | "self_employed"
  | "recently_divorced"
  | "dual_income"
  | "first_time"
  | "pre_retiree";

/**
 * ICP slices the copy can be aimed at. `description` is what reaches the model
 * verbatim, so it is written as a brief rather than as a label.
 *
 * "all" carries an empty description on purpose — an empty brief is how the
 * caller says "general ICP", and the prompt builder omits the persona block
 * entirely rather than telling the model to write for nobody in particular.
 */
export const PERSONAS: { key: PersonaKey; label: string; description: string }[] = [
  { key: "all", label: "All (general ICP)", description: "" },
  {
    key: "self_employed",
    label: "Self-employed buyer",
    description:
      "freelancer or contractor with variable income, anxious about how that income reads on paper",
  },
  {
    key: "recently_divorced",
    label: "Recently divorced",
    description: "rebuilding solo on one income, financial and emotional reset at the same time",
  },
  {
    key: "dual_income",
    label: "Dual-income anxious couple",
    description: "earn well together but scared of the commitment, stuck in analysis paralysis",
  },
  {
    key: "first_time",
    label: "First-time buyer",
    description: "overwhelmed by rates, terms and timeline, and by not knowing what they do not know",
  },
  {
    key: "pre_retiree",
    label: "Pre-retiree mover",
    description: "downsizing or relocating on a five-year horizon, moving to a fixed income",
  },
];

export function personaMeta(key: PersonaKey): { key: PersonaKey; label: string; description: string } {
  return PERSONAS.find((p) => p.key === key) ?? PERSONAS[0]!;
}

/** The brief handed to generate_post. Empty string means "no persona". */
export function personaBrief(key: PersonaKey): string {
  const meta = personaMeta(key);
  return meta.description ? `${meta.label} — ${meta.description}` : "";
}

/* ------------------------------------------------------------------ *
 * Repurpose                                                           *
 * ------------------------------------------------------------------ */

export function buildRepurposePrompt(input: {
  sourceCopy: string;
  targetPlatform: SocialPlatform;
}): string {
  const meta = platformMeta(input.targetPlatform);

  // AGENCY_SYSTEM_PROMPT is passed as the `system` parameter by the route, not
  // spread in here — it is a string, and spreading a string into an array would
  // yield one element per character.
  return [
    `Adapt this post for ${meta.label}.`,
    "",
    "SOURCE POST:",
    input.sourceCopy,
    "",
    `HARD CEILING: ${meta.limit} characters. Respect it — do not go one character over.`,
    `PLATFORM BRIEF: ${meta.brief}`,
    "Keep the core message. Adjust format for platform norms. Strip never-say words.",
    "This is a rewrite, not a summary — it should read as if written for this platform first.",
    "",
    "Return this JSON object:",
    "{",
    '  "copy": "the adapted post copy, ready to paste, no hashtags inside it",',
    `  "hashtags": ["exactly ${meta.hashtagCount} hashtags, each starting with #"],`,
    '  "utmSuggestion": "a short lowercase utm_campaign slug, words joined by underscores"',
    "}",
  ].join("\n");
}

/**
 * Deterministic repurpose: fit the source to the target ceiling.
 *
 * Honest about what it is — a trim, not a rewrite. The badge on the panel says
 * "Template" so the operator knows to edit before posting.
 */
export function templateRepurpose(input: {
  sourceCopy: string;
  targetPlatform: SocialPlatform;
}): GeneratedPost {
  const meta = platformMeta(input.targetPlatform);
  const clean = stripNeverSay(input.sourceCopy).clean.trim();

  return {
    copy: fitToLimit(clean, meta.limit),
    hashtags: defaultHashtags(input.targetPlatform),
    utmSuggestion: `${meta.utmSource}_${slugifyCampaign(clean.slice(0, 60))}`.slice(0, 60),
  };
}

/* ------------------------------------------------------------------ *
 * Post performance log                                                *
 * ------------------------------------------------------------------ */

export const POST_SNIPPET_LENGTH = 120;

export type PostPerformanceRow = {
  id: string;
  created_at: string;
  platform: string;
  utm_campaign: string;
  utm_source: string;
  post_snippet: string;
  posted_at: string;
  impressions: number | null;
  clicks: number | null;
  completions: number | null;
  notes: string | null;
};

export function postSnippet(copy: string): string {
  return copy.replace(/\s+/g, " ").trim().slice(0, POST_SNIPPET_LENGTH);
}

export type PerformanceTotals = {
  impressions: number;
  clicks: number;
  completions: number;
  /** Percentage points, or null when nothing was ever shown. */
  ctr: number | null;
};

export function performanceTotals(rows: PostPerformanceRow[]): PerformanceTotals {
  const impressions = rows.reduce((sum, r) => sum + (r.impressions ?? 0), 0);
  const clicks = rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0);
  const completions = rows.reduce((sum, r) => sum + (r.completions ?? 0), 0);
  return {
    impressions,
    clicks,
    completions,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 10_000) / 100 : null,
  };
}

/**
 * The row to highlight — most attributed completions wins, because completions
 * are the north star and impressions are not. Null when nothing has completions
 * yet, so the badge never crowns a row for scoring zero.
 */
export function bestPerformingId(rows: PostPerformanceRow[]): string | null {
  let best: PostPerformanceRow | null = null;
  for (const row of rows) {
    if ((row.completions ?? 0) <= 0) continue;
    if (!best || (row.completions ?? 0) > (best.completions ?? 0)) best = row;
  }
  return best?.id ?? null;
}

/* ------------------------------------------------------------------ *
 * Sunday scorecard                                                    *
 * ------------------------------------------------------------------ */

export type ScorecardMetrics = {
  /**
   * Unique users with ≥1 completed assessment in the last 7 days (north star).
   * Not raw completion-event count.
   */
  activationsLast7: number;
  accountsLast7: number;
  waitlistLast7: number;
  waitlistTotal: number;
  accountsTotal: number;
  assessedUsers: number;
  paidTotal: number;
  mrrCents: number;
  /**
   * Cohort activation %: new accounts (7d) who completed at least once,
   * or null when n is under the cohort minimum / zero.
   */
  activationRate7d: number | null;
  /** Top channels this week, already ranked. Only the first three are printed. */
  channels: { label: string; count: number }[];
};

/** Whole dollars, thousands-separated — the scorecard has no room for cents. */
export function formatUsdWhole(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

/** "Aug 12, 2026" — the week-ending stamp in the scorecard heading. */
export function weekEndingLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The exact markdown the founder pastes into the Sunday scoreboard.
 *
 * Three channel lines are always printed, padded with an em dash, so the shape
 * of the scorecard does not change week to week — a missing line reads as a
 * formatting bug, a dash reads as "no third channel yet".
 */
export function buildScorecardMarkdown(metrics: ScorecardMetrics, weekEnding: Date): string {
  const rate =
    metrics.activationRate7d !== null
      ? `${metrics.activationRate7d}% of new accounts (cohort)`
      : "— (n under 5 or no new accounts)";
  const channels = [0, 1, 2].map((i) => {
    const row = metrics.channels[i];
    return `${i + 1}. ${row ? `${row.label} — ${row.count.toLocaleString()}` : "—"}`;
  });

  return [
    `## HōMI Weekly Scorecard — WEEK ending ${weekEndingLabel(weekEnding)}`,
    "",
    "### North Star",
    `- Unique activated users (7d): ${metrics.activationsLast7.toLocaleString()}`,
    `- Cohort activation rate: ${rate}`,
    "",
    "### Pipeline",
    `- New accounts (7d): ${metrics.accountsLast7.toLocaleString()}`,
    `- Waitlist signups (7d): ${metrics.waitlistLast7.toLocaleString()}`,
    `- Total waitlist: ${metrics.waitlistTotal.toLocaleString()}`,
    `- Total accounts: ${metrics.accountsTotal.toLocaleString()}`,
    `- Assessed (ever): ${metrics.assessedUsers.toLocaleString()}`,
    `- Paid: ${metrics.paidTotal.toLocaleString()}`,
    "",
    "### Revenue",
    `- MRR (est.): ${formatUsdWhole(metrics.mrrCents)}`,
    "",
    "### Top channels this week",
    ...channels,
    "",
    "### Wins this week",
    "- [ ] (fill in manually)",
    "",
    "### Blockers",
    "- [ ] (fill in manually)",
    "",
    "### Next week focus",
    "- [ ] (fill in manually)",
  ].join("\n");
}

export type ScorecardSummaryInput = {
  activationsLast7: number;
  accountsLast7: number;
  waitlistLast7: number;
  mrrCents: number;
  topChannel: string;
};

export function buildScorecardSummaryPrompt(input: ScorecardSummaryInput): string {
  return [
    "You are the founder's weekly marketing analyst. Given these HōMI metrics, write 2-3",
    "sentences of honest, actionable insight. No hype. Recommend one content priority for",
    "next week. If the numbers are too small to support a conclusion, say that plainly.",
    "",
    `ACTIVATIONS (7d): ${input.activationsLast7}`,
    `NEW ACCOUNTS (7d): ${input.accountsLast7}`,
    `WAITLIST SIGNUPS (7d): ${input.waitlistLast7}`,
    `MRR (est.): ${formatUsdWhole(input.mrrCents)}`,
    `TOP CHANNEL: ${input.topChannel || "none yet"}`,
    "",
    'Return this JSON object: { "summary": "the 2-3 sentences" }',
  ].join("\n");
}

export function templateScorecardSummary(input: ScorecardSummaryInput): { summary: string } {
  const rate =
    input.accountsLast7 > 0 ? Math.round((input.activationsLast7 / input.accountsLast7) * 100) : null;

  if (input.activationsLast7 === 0 && input.accountsLast7 === 0 && input.waitlistLast7 === 0) {
    return {
      summary:
        "Nothing moved this week — no new accounts, activations or waitlist signups. That is a distribution problem, not a product one. Publish the three-post slate with tagged links so next Sunday has channel truth to read.",
    };
  }

  const parts: string[] = [];
  parts.push(
    rate === null
      ? `${input.activationsLast7} activations against no new accounts — the activations came from people who signed up earlier, so the top of the funnel is what to work on.`
      : `${input.activationsLast7} activations from ${input.accountsLast7} new accounts (${rate}%) — ${
          rate >= 40
            ? "the path is converting, so the constraint is traffic, not friction."
            : "more than half of new accounts never finish, so walk the path yourself before adding reach."
        }`,
  );
  if (input.topChannel) {
    parts.push(
      input.topChannel === "direct"
        ? "Most signups are landing as direct, which means the links are not tagged — stamp every founder post with UTMs before drawing any channel conclusion."
        : `${input.topChannel} is carrying the week; keep the cadence there rather than opening a second surface.`,
    );
  }
  parts.push(
    input.waitlistLast7 > input.accountsLast7
      ? "Waitlist is outpacing accounts — next week's priority is the founder-story post that converts interest into a completed assessment."
      : "Next week's priority: one Build First post that shows the path a “not yet” verdict opens.",
  );

  return { summary: parts.join(" ") };
}

/* ------------------------------------------------------------------ *
 * Image brief                                                         *
 * ------------------------------------------------------------------ */

export type ImageBrief = { canva_prompt: string; midjourney_prompt: string; style_notes: string };

export function buildImageBriefPrompt(input: {
  captionHook: string;
  captionBody: string;
  platform: SocialPlatform;
}): string {
  const meta = platformMeta(input.platform);

  return [
    "Based on this social post hook and body, write a visual design brief.",
    "",
    `PLATFORM: ${meta.label}`,
    `HOOK: ${input.captionHook}`,
    `BODY: ${input.captionBody}`,
    "",
    "Output three things:",
    "1) A Canva description — what to put on the graphic: text, layout, feel. Two sentences.",
    "2) An image-generation prompt (photorealistic or illustrated) that matches the HōMI dark",
    "   navy aesthetic. No faces unless the post requires one. No text rendered in the image.",
    "3) Style notes — colour mood and one composition tip.",
    "",
    "BRAND: dark navy background, cyan / emerald / yellow accents, generous negative space,",
    "calm and precise rather than loud. Never a stock-photo handshake.",
    "",
    "Return this JSON object:",
    "{",
    '  "canva_prompt": "the Canva description",',
    '  "midjourney_prompt": "the image-generation prompt",',
    '  "style_notes": "colour mood and composition tip"',
    "}",
  ].join("\n");
}

/**
 * Deterministic brief. Colour is named in words rather than hex on purpose:
 * lib/brand COLORS is the single source of the palette, and a hex literal
 * copied into a prompt string is a fork waiting to drift.
 */
export function templateImageBrief(input: {
  captionHook: string;
  captionBody: string;
  platform: SocialPlatform;
}): ImageBrief {
  const meta = platformMeta(input.platform);
  const hook = stripNeverSay(input.captionHook.trim()).clean || "Afford ≠ ready";

  return {
    canva_prompt: [
      `${meta.label} graphic on a dark navy canvas with the hook — “${fitToLimit(hook, 90)}” —`,
      "set left-aligned in the upper third, large, with a thin cyan rule beneath it and a lot of",
      "empty space below. Bottom-left: the HōMI wordmark and the line “educational guidance only”",
      "at a quarter of the hook's size, in dim grey.",
    ].join(" "),
    midjourney_prompt: [
      "editorial illustration, deep navy background, single subject lit by cool cyan rim light,",
      "soft emerald and warm yellow accents, wide negative space on the left third,",
      "calm precise composition, matte finish, subtle film grain, no faces, no text,",
      "no logos, square 1:1 --style raw",
    ].join(" "),
    style_notes:
      "Cool base with one warm accent — navy ground, cyan for the signal, yellow used once and only once. Compose to the left third so the hook has room; keep the subject small in frame rather than centred and cropped.",
  };
}

/* ------------------------------------------------------------------ *
 * Email drip sequences                                                *
 * ------------------------------------------------------------------ */

export type DripPresetKey = "launch" | "reengagement" | "assessment_nurture" | "custom";

export type DripStepInput = { name: string; delayDays: number };

export type DripStep = {
  step: number;
  name: string;
  delay_days: number;
  subject: string;
  body: string;
};

/** Delays are days after the PREVIOUS step, not days since signup. */
export const DRIP_PRESETS: {
  key: DripPresetKey;
  label: string;
  audience: string;
  steps: DripStepInput[];
}[] = [
  {
    key: "launch",
    label: "Launch sequence",
    audience: "someone who just joined the waitlist",
    steps: [
      { name: "Welcome", delayDays: 0 },
      { name: "Day 3", delayDays: 3 },
      { name: "Day 7", delayDays: 4 },
      { name: "Day 14", delayDays: 7 },
    ],
  },
  {
    key: "reengagement",
    label: "Re-engagement",
    audience: "someone who signed up but never finished the readiness path",
    steps: [
      { name: "Day 0", delayDays: 0 },
      { name: "Day 7", delayDays: 7 },
      { name: "Day 21", delayDays: 14 },
    ],
  },
  {
    key: "assessment_nurture",
    label: "Assessment nurture",
    audience: "someone who completed the assessment and has a verdict",
    steps: [
      { name: "Completed", delayDays: 0 },
      { name: "Day 2", delayDays: 2 },
      { name: "Day 5", delayDays: 3 },
      { name: "Day 10", delayDays: 5 },
    ],
  },
  {
    key: "custom",
    label: "Custom",
    audience: "the HōMI ICP",
    steps: [{ name: "Step 1", delayDays: 0 }],
  },
];

export function dripPreset(key: DripPresetKey): {
  key: DripPresetKey;
  label: string;
  audience: string;
  steps: DripStepInput[];
} {
  return DRIP_PRESETS.find((p) => p.key === key) ?? DRIP_PRESETS[0]!;
}

export function buildDripStepPrompt(input: {
  preset: DripPresetKey;
  step: DripStepInput;
  index: number;
  total: number;
  audienceInterest?: string;
}): string {
  const preset = dripPreset(input.preset);
  const interest = input.audienceInterest?.trim();

  return [
    `Write email step ${input.index + 1} of ${input.total} in a "${preset.label}" sequence for HōMI Technology.`,
    "",
    `STEP NAME: ${input.step.name}`,
    `DELAY: ${input.step.delayDays} days after the previous email.`,
    `AUDIENCE: ${preset.audience}.`,
    ...(interest ? [`WHAT THEY SAID THEY WANT: ${interest}.`] : []),
    "",
    "Tone: educational, warm, no hype. Educational guidance only — HōMI is not a lender and",
    "does not tell anyone what to buy.",
    "Subject line: 6-8 words, curiosity-driven, no colon-stacking, no emoji.",
    "Body: 3-4 short paragraphs, plain text, one clear call to action at the end.",
    "",
    "Return this JSON object:",
    "{",
    '  "subject": "the subject line",',
    '  "body": "the email body, newline-separated paragraphs"',
    "}",
  ].join("\n");
}

const DRIP_BODY_TEMPLATES: Record<DripPresetKey, (step: DripStepInput, index: number) => string> = {
  launch: (step, index) =>
    [
      index === 0
        ? "You are on the list. Here is what that actually gets you."
        : `Following on from ${step.name.toLowerCase()} — one idea worth sitting with.`,
      "",
      "Most tools answer how much you can carry. Almost nothing answers the question underneath it: what does your month look like after you commit, and would that feel steady?",
      "",
      "HōMI reads the signals you already have and returns one readiness verdict plus the path to close the gap. Educational guidance only — not a lender, not a credit score substitute.",
      "",
      "When you are ready, the readiness path takes about eight minutes.",
    ].join("\n"),
  reengagement: (_step, index) =>
    [
      index === 0
        ? "You started the readiness path and stopped. That is worth a minute of honesty."
        : "Still here whenever you want to pick it back up.",
      "",
      "People usually stop at the same place — the question that asks what happens the month after. It is uncomfortable because it is the real one.",
      "",
      "You do not have to like the answer to benefit from having it. A “not yet” is a map with a date on it, not a rejection.",
      "",
      "Pick up where you left off — nothing you entered was lost.",
    ].join("\n"),
  assessment_nurture: (_step, index) =>
    [
      index === 0
        ? "Your verdict is ready. Here is how to read it."
        : "One step from your Build First path, in plain language.",
      "",
      "A verdict is a snapshot of three things at once: the money, the timing, and how you actually feel about the commitment. Any one of them can be the thing holding the score down.",
      "",
      "The path underneath it is ordered by leverage — the first item moves the number most. Work it in that order rather than all at once.",
      "",
      "Open your path and take the first item this week.",
    ].join("\n"),
  custom: (step) =>
    [
      `${step.name}.`,
      "",
      "Affordability is arithmetic. Readiness is what your life looks like after you commit — the cushion, the month-after, the thing that goes wrong anyway.",
      "",
      "HōMI turns the signals you already have into one readiness verdict and a Build First path. Educational guidance only.",
      "",
      "Take the readiness path when you have eight minutes.",
    ].join("\n"),
};

const DRIP_SUBJECT_TEMPLATES: Record<DripPresetKey, string[]> = {
  launch: [
    "What being on this list actually gets you",
    "Afford and ready are different questions",
    "The month after is the real test",
    "A “not yet” with a date on it",
  ],
  reengagement: [
    "You stopped at the honest question",
    "Nothing you entered was lost",
    "Two minutes to finish what you started",
  ],
  assessment_nurture: [
    "How to read your readiness verdict",
    "The one item that moves your score most",
    "Why timing counts as much as money",
    "Where you stand two weeks on",
  ],
  custom: ["A clearer read on a big decision"],
};

export function templateDripSequence(input: {
  preset: DripPresetKey;
  steps: DripStepInput[];
}): DripStep[] {
  const subjects = DRIP_SUBJECT_TEMPLATES[input.preset] ?? DRIP_SUBJECT_TEMPLATES.custom;
  const bodyFor = DRIP_BODY_TEMPLATES[input.preset] ?? DRIP_BODY_TEMPLATES.custom;

  return input.steps.map((step, index) => ({
    step: index + 1,
    name: step.name,
    delay_days: step.delayDays,
    subject: stripNeverSay(subjects[index % subjects.length]!).clean,
    body: stripNeverSay(bodyFor(step, index)).clean,
  }));
}

/* ------------------------------------------------------------------ *
 * LinkedIn analytics import                                           *
 * ------------------------------------------------------------------ */

export type AnalyticsPost = { title: string; date: string; impressions: number; clicks: number; ctr: number };
export type AnalyticsSummary = { summary: string; recommended_hooks: string[]; content_gaps: string[] };

/**
 * RFC4180-ish CSV reader: quoted fields, embedded commas and newlines, and
 * doubled quotes as an escaped quote. Written by hand rather than pulled in as
 * a dependency because this parses exactly one known export shape — but it does
 * have to handle quotes, since LinkedIn post titles routinely contain commas.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch !== '"') {
        field += ch;
      } else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = false;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell !== ""));
}

/** "1,234" â†’ 1234, "1.23%" â†’ 1.23, anything unreadable â†’ 0. */
function parseNumeric(raw: string | undefined): number {
  if (!raw) return 0;
  const value = Number.parseFloat(raw.replace(/[,\s%$]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Read a LinkedIn post-analytics export.
 *
 * LinkedIn prefixes the real table with a metadata block, and the column set
 * has changed more than once, so columns are located by header name with a
 * positional fallback rather than by index alone.
 */
export function parseLinkedInAnalytics(text: string): AnalyticsPost[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const headerAt = rows.findIndex((row) =>
    row.some((cell) => /post\s*(?:title|url)|published/i.test(cell)),
  );
  const start = headerAt === -1 ? 0 : headerAt;
  const headers = (rows[start] ?? []).map((h) => h.toLowerCase());

  const at = (predicate: (header: string) => boolean, fallback: number): number => {
    const found = headers.findIndex(predicate);
    return found === -1 ? fallback : found;
  };
  const titleAt = at((h) => h.includes("title") || h === "post", 0);
  const dateAt = at((h) => h.includes("published") || h.includes("date"), 1);
  // "Unique impressions" is a different metric — never let it win this lookup.
  const impressionsAt = at((h) => h.includes("impressions") && !h.includes("unique"), 2);
  const clicksAt = at((h) => h.includes("click") && !h.includes("through") && !h.includes("ctr"), 4);
  const ctrAt = at(
    (h) => h.includes("ctr") || h.includes("click through") || h.includes("click-through"),
    8,
  );

  // When the header row was not found, row 0 is data, not a header.
  const dataRows = headerAt === -1 ? rows : rows.slice(start + 1);

  return dataRows
    .map((row): AnalyticsPost => {
      const impressions = Math.max(0, Math.round(parseNumeric(row[impressionsAt])));
      const clicks = Math.max(0, Math.round(parseNumeric(row[clicksAt])));
      const rawCtr = row[ctrAt] ?? "";
      let ctr = parseNumeric(rawCtr);
      // A CTR column can arrive as "1.23%" or as the fraction 0.0123.
      if (rawCtr && !rawCtr.includes("%") && ctr > 0 && ctr <= 1) ctr *= 100;
      if (!ctr && impressions > 0) ctr = (clicks / impressions) * 100;

      return {
        title: (row[titleAt] ?? "").slice(0, 200) || "(untitled post)",
        date: row[dateAt] ?? "",
        impressions,
        clicks,
        ctr: Math.round(ctr * 100) / 100,
      };
    })
    .filter((post) => post.impressions > 0 || post.clicks > 0);
}

export function topPostsBy(
  posts: AnalyticsPost[],
  key: "impressions" | "clicks" | "ctr",
  count = 3,
): AnalyticsPost[] {
  return [...posts].sort((a, b) => b[key] - a[key]).slice(0, count);
}

export function buildAnalyticsPrompt(topPosts: {
  title: string;
  impressions: number;
  ctr: number;
  clicks: number;
}[]): string {
  const table = topPosts
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" — ${p.impressions} impressions, ${p.clicks} clicks, ${p.ctr}% CTR`,
    )
    .join("\n");

  return [
    "You are a LinkedIn content analyst for HōMI Technology.",
    "Given these top performing posts, identify:",
    "1) What hooks and angles are working — read impressions and CTR together, not separately.",
    "2) What content gaps exist.",
    "3) Recommend 3 specific post angles for next month.",
    "Be specific. Reference the actual post titles.",
    "",
    "TOP POSTS:",
    table || "(none supplied)",
    "",
    "Return this JSON object:",
    "{",
    '  "summary": "2-4 sentences on what is working and what is not",',
    '  "recommended_hooks": ["3 specific post angles, each one line"],',
    '  "content_gaps": ["2-4 gaps, each one line"]',
    "}",
  ].join("\n");
}

export function templateAnalyticsSummary(posts: AnalyticsPost[]): AnalyticsSummary {
  if (posts.length === 0) {
    return {
      summary:
        "No rows parsed from that export. Paste the CSV including its header row — the table starts at the line naming “Post title”.",
      recommended_hooks: [],
      content_gaps: [],
    };
  }

  const totalImpressions = posts.reduce((sum, p) => sum + p.impressions, 0);
  const byImpressions = topPostsBy(posts, "impressions");
  const byCtr = topPostsBy(posts, "ctr");
  const share = (n: number) =>
    totalImpressions > 0 ? `${Math.round((n / totalImpressions) * 100)}%` : "0%";

  const lead = byImpressions
    .map(
      (p) =>
        `“${fitToLimit(p.title, 60)}” at ${p.impressions.toLocaleString()} (${share(p.impressions)} of all reach)`,
    )
    .join("; ");

  const reachWinner = byImpressions[0];
  const ctrWinner = byCtr[0];
  const divergent = Boolean(reachWinner && ctrWinner && reachWinner.title !== ctrWinner.title);

  return {
    summary: [
      `${posts.length} posts parsed, ${totalImpressions.toLocaleString()} impressions total. Reach leaders: ${lead}.`,
      divergent && ctrWinner
        ? `Reach and intent are pulling apart — “${fitToLimit(ctrWinner.title, 60)}” converts best at ${ctrWinner.ctr}% CTR despite less reach, which is the angle worth repeating.`
        : "Reach and click-through agree on the same post, so the top angle is doing both jobs — repeat its structure before testing a new one.",
    ].join(" "),
    recommended_hooks: byCtr.map((p) => fitToLimit(p.title, 90)),
    content_gaps: [
      "No post in this export addresses the month-after question directly.",
      "Build First — what a “not yet” verdict actually unlocks — is missing from the top set.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Competitor intel                                                    *
 * ------------------------------------------------------------------ */

export const COMPETITOR_LOG_KEY = "homi-competitor-log";
export const COMPETITOR_URLS_KEY = "homi-competitor-urls";
export const COMPETITOR_URL_SLOTS = 5;
export const COMPETITOR_LOG_MAX = 50;

export const COMPETITOR_TAGS = [
  "housing",
  "rates",
  "readiness",
  "emotional",
  "data",
  "story",
  "tips",
  "fear",
] as const;
export type CompetitorTag = (typeof COMPETITOR_TAGS)[number];

export type CompetitorPost = {
  id: string;
  account: string;
  hook: string;
  date: string;
  tags: CompetitorTag[];
  impressions?: number;
};

export type CompetitorAnalysis = { patterns: string[]; gaps: string[]; recommendations: string[] };

/** Exported so the route narrows against the registry rather than a copy of it. */
export function isCompetitorTag(value: unknown): value is CompetitorTag {
  return typeof value === "string" && (COMPETITOR_TAGS as readonly string[]).includes(value);
}

/**
 * Defensive read of the hand-kept log.
 *
 * An entry with no id or no hook is unrenderable — the id is the React key and
 * the hook is the only column worth reading — so those rows are dropped. An
 * unknown tag is not fatal in the same way, so it is dropped from the row rather
 * than taking the row with it.
 */
export function parseStoredCompetitorLog(raw: string | null): CompetitorPost[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const log: CompetitorPost[] = [];
  for (const value of parsed) {
    if (log.length >= COMPETITOR_LOG_MAX) break;
    if (!value || typeof value !== "object") continue;
    const entry = value as Partial<CompetitorPost>;
    const id = typeof entry.id === "string" ? entry.id.trim() : "";
    const hook = typeof entry.hook === "string" ? entry.hook.trim() : "";
    if (!id || !hook) continue;

    const impressions =
      typeof entry.impressions === "number" && Number.isFinite(entry.impressions)
        ? entry.impressions
        : undefined;

    log.push({
      id,
      hook,
      account: typeof entry.account === "string" ? entry.account : "",
      date: typeof entry.date === "string" ? entry.date : "",
      tags: Array.isArray(entry.tags) ? entry.tags.filter(isCompetitorTag) : [],
      ...(impressions === undefined ? {} : { impressions }),
    });
  }
  return log;
}

export function buildCompetitorPrompt(
  posts: { account: string; hook: string; tags: string[]; impressions?: number }[],
): string {
  // AGENCY_SYSTEM_PROMPT is passed as the `system` parameter by the route, not
  // spread in here — it is a string, and spreading a string into an array would
  // yield one element per character.
  const lines = posts.map(
    (p) =>
      `- [${p.account || "unattributed"}] "${p.hook}" — tags: ${p.tags.join(", ") || "none"}${
        p.impressions ? ` — ~${p.impressions} impressions` : ""
      }`,
  );

  return [
    "You are a competitive content analyst for HōMI in the decision-readiness space.",
    "",
    "COMPETITOR POSTS LOGGED BY HAND:",
    ...(lines.length > 0 ? lines : ["(none logged)"]),
    "",
    "Say what is working for them, which angles HōMI can own that they are not claiming, and",
    "three specific post angles that differentiate rather than imitate. HōMI is not a lender",
    "and does not compete on rates — an angle that requires either is not usable.",
    "",
    "Return this JSON object:",
    "{",
    '  "patterns": ["what is working for them, one line each"],',
    '  "gaps": ["angles nobody logged here is claiming, one line each"],',
    '  "recommendations": ["exactly three post angles, one line each"]',
    "}",
  ].join("\n");
}

/** What each tag means when it shows up repeatedly in the log. */
const COMPETITOR_TAG_PATTERNS: Record<CompetitorTag, string> = {
  housing: "Housing-market commentary — inventory, prices, when to move",
  rates: "Rate and affordability anxiety is what they lead with",
  readiness: "Readiness language, though usually stopping at the number behind it",
  emotional: "Emotional framing — how the decision feels, not what it costs",
  data: "Charts and data posts, credibility built on the numbers",
  story: "Personal story hooks rather than a data-only open",
  tips: "Checklist and how-to formats, written to be saved",
  fear: "Loss framing — what you give up by waiting",
};

/**
 * Deterministic read of the log.
 *
 * Tag-driven rather than canned: one pattern line per tag actually seen, ranked
 * by how often it appeared, so an empty log says it is empty instead of
 * inventing a category the operator never logged.
 */
export function templateCompetitorAnalysis(posts: CompetitorPost[]): CompetitorAnalysis {
  const counts = new Map<CompetitorTag, number>();
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const logged = `${posts.length} logged`;

  let patterns: string[];
  if (posts.length === 0) {
    patterns = [
      "Nothing logged yet — paste five hooks from the accounts you watch and the pattern shows up on its own.",
    ];
  } else if (ranked.length === 0) {
    patterns = [
      `${posts.length} post${posts.length === 1 ? "" : "s"} logged with no topic tags, so there is nothing to group on yet. Tag them and the shape of their content becomes readable.`,
    ];
  } else {
    patterns = ranked.map(([tag, count]) => `${COMPETITOR_TAG_PATTERNS[tag]} (${count} of ${logged})`);
  }

  return {
    patterns,
    gaps: [
      counts.has("readiness")
        ? "Someone logged here is already using decision readiness language — read those posts closely and say what the verdict actually rests on, which they do not."
        : "Nobody logged here is claiming decision readiness — the gap between what someone can afford and whether they are ready for it is open ground.",
      "The month after the purchase. Their posts stop at the closing; the anxiety starts after it.",
      '"Not yet" as a real answer with a date on it, rather than a softer way of saying no.',
    ],
    recommendations: [
      "Afford ≠ ready — name the distinction nobody else in this feed is making.",
      "What a readiness verdict rests on, and what it deliberately does not claim.",
      "The month after: what your budget actually looks like thirty days past the commitment.",
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Theme calendar (30-day)                                             *
 * ------------------------------------------------------------------ */

export const THEME_CALENDAR_STORAGE_KEY = "homi-theme-calendar";
export const THEME_NOTES_STORAGE_KEY = "homi-theme-cal-notes";
export type ThemeColorKey = "cyan" | "amber" | "emerald" | "yellow";

export type ThemeWeek = {
  /** 1-4, matching the "Week n" label in the legend. */
  week: number;
  label: string;
  description: string;
  colorKey: ThemeColorKey;
  /** Pre-selected in the studio when the operator writes for this theme. */
  tone: PostTone;
  studioCampaign: string;
};

export const THEME_WEEKS: ThemeWeek[] = [
  {
    week: 1,
    label: "Founder Story",
    description: "Share your why, your journey, your own read on what readiness cost you.",
    colorKey: "cyan",
    tone: "story",
    studioCampaign: "founder_story",
  },
  {
    week: 2,
    label: "ICP Pain",
    description: "Speak straight at the anxiety the ICP already feels. Name the fear out loud.",
    colorKey: "amber",
    tone: "hook",
    studioCampaign: "icp_pain",
  },
  {
    week: 3,
    label: "Social Proof / Insight",
    description: "Data, an insight, or a real user moment — evidence rather than assertion.",
    colorKey: "emerald",
    tone: "authority",
    studioCampaign: "social_proof",
  },
  {
    week: 4,
    label: "Product / Path",
    description: "Show what HōMI does, concretely. The path, the verdict, the next move.",
    colorKey: "yellow",
    tone: "educational",
    studioCampaign: "product_path",
  },
];

/**
 * Days 1-7 are week one, 8-14 week two, and so on — deliberately not tied to
 * which weekday the month starts on, so a theme never splits across a row.
 */
export function themeForDayOfMonth(dayOfMonth: number): ThemeWeek {
  return THEME_WEEKS[Math.floor((dayOfMonth - 1) / 7) % THEME_WEEKS.length]!;
}

export function themeDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Day 0 of the next month is the last day of this one. `month` is 0-indexed. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * The month packed into rows of seven, starting at day 1.
 *
 * Not a weekday-aligned grid: the theme rotation is what the rows represent, so
 * padding the first row to the calendar weekday would put week one's theme on
 * blank cells. The final row is short rather than null-padded — a caller
 * mapping over it gets real days and nothing else.
 */
export function monthWeekRows(year: number, month: number): number[][] {
  const total = daysInMonth(year, month);
  const rows: number[][] = [];
  for (let first = 1; first <= total; first += 7) {
    rows.push(Array.from({ length: Math.min(7, total - first + 1) }, (_, i) => first + i));
  }
  return rows;
}

/** Mon/Wed/Fri is the publishing cadence. Null (an absent day) is never one. */
export function isPostingDay(year: number, month: number, day: number | null): boolean {
  if (day === null) return false;
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  return weekday === 1 || weekday === 3 || weekday === 5;
}

/** Note keys are ISO calendar days; anything else is a stale or corrupt write. */
const THEME_NOTE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function parseStoredThemeNotes(raw: string | null): Record<string, string> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  const notes: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!THEME_NOTE_KEY.test(key) || typeof value !== "string") continue;
    notes[key] = value;
  }
  return notes;
}

/** One line per posting day: ISO date, theme, and the campaign tag to stamp. */
export function themeMonthExport(year: number, month: number): string {
  const lines: string[] = [];
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    if (!isPostingDay(year, month, day)) continue;
    const theme = themeForDayOfMonth(day);
    lines.push(`${themeDayKey(year, month, day)} — ${theme.label} — ${theme.studioCampaign}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------------ *
 * Webhook publisher                                                   *
 * ------------------------------------------------------------------ */

export const WEBHOOK_BUFFER_KEY = "homi-webhook-buffer";
export const WEBHOOK_MAKE_KEY = "homi-webhook-make";
export type WebhookTarget = "buffer" | "make";

export type WebhookPayload = {
  platform: string;
  copy: string;
  utm_link: string;
  utm_campaign: string;
  hashtags: string[];
  /** Always null: HōMI composes, the downstream tool schedules. */
  scheduled_for: null;
  source: "homi-marketing-studio";
};

export function buildWebhookPayload(post: {
  platform: string;
  copy: string;
  utm_link: string;
  utm_campaign: string;
  hashtags: string[];
}): WebhookPayload {
  return { ...post, scheduled_for: null, source: "homi-marketing-studio" };
}

/**
 * https only. Draft copy leaves the browser on this URL, so plain http (or a
 * javascript:/data: URL pasted by accident) is refused rather than warned about.
 * Trimmed first — a URL pasted with trailing whitespace is a typo, not a
 * different protocol.
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    return new URL(url.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Morning brief / week plan / rewrite (Agency OS P1)
 * ------------------------------------------------------------------ */

export type MorningBriefInput = {
  uniqueActivated7d: number;
  completions7d: number;
  accountsLast7: number;
  cohortRate7d: number | null;
  waitlistTotal: number;
  pendingApprovals: number;
  resendConfigured: boolean;
  topChannel: string;
};

export function buildMorningBriefPrompt(input: MorningBriefInput): string {
  return [
    "Write a CEO morning brief for HōMI marketing. HARD RULES:",
    "- Exactly 3 short sentences maximum.",
    "- Name exactly ONE decision for the CEO today with a clear action.",
    "- If nothing moved (all zeros / empty queue), say \"Nothing moved\" — do not invent narrative.",
    "- Educational tone only. Never use: approved, pre-approved, pre-qualified, guaranteed, lender, credit score replacement.", // brand-ok: enumerating prohibited claim words for LLM instruction // brand-ok: claim-law denylist for model prompts
    "",
    "METRICS:",
    `unique_activated_7d=${input.uniqueActivated7d}`,
    `completions_7d=${input.completions7d}`,
    `new_accounts_7d=${input.accountsLast7}`,
    `cohort_rate=${input.cohortRate7d ?? "n/a"}`,
    `waitlist_total=${input.waitlistTotal}`,
    `pending_approvals=${input.pendingApprovals}`,
    `resend_configured=${input.resendConfigured}`,
    `top_channel=${input.topChannel || "unknown"}`,
    "",
    'Return JSON: { "brief": "three sentences max", "decision": "one concrete CEO action", "decision_href": "#desk-content" }',
  ].join("\n");
}

export function templateMorningBrief(input: MorningBriefInput): {
  brief: string;
  decision: string;
  decision_href: string;
} {
  const quiet =
    input.uniqueActivated7d === 0 &&
    input.accountsLast7 === 0 &&
    input.pendingApprovals === 0 &&
    input.waitlistTotal === 0;

  if (quiet) {
    return {
      brief: "Nothing moved. No new activations, signups, or pending approvals in the last quiet window.",
      decision: "Open Content desk and draft one founder post with a UTM link.",
      decision_href: "#desk-content",
    };
  }

  if (!input.resendConfigured) {
    return {
      brief: `Resend is blocked while ${input.uniqueActivated7d} unique users activated and ${input.pendingApprovals} items wait in the queue.`,
      decision: "Fix Resend (Email desk) before loading any drip — sends cannot leave the building.",
      decision_href: "#desk-email",
    };
  }

  if (input.pendingApprovals > 0) {
    return {
      brief: `${input.pendingApprovals} draft(s) need CEO eyes. ${input.uniqueActivated7d} unique activated (7d); ${input.completions7d} completions.`,
      decision: "Clear the approval queue — approve, edit with feedback, or reject each draft.",
      decision_href: "#approval-queue",
    };
  }

  if (input.accountsLast7 > 0 && input.uniqueActivated7d === 0) {
    return {
      brief: `${input.accountsLast7} new accounts and zero unique activations (7d) — path friction is the story, not content volume.`,
      decision: "Walk the assessment path yourself, then fix the first drop-off before more traffic.",
      decision_href: "/assessment",
    };
  }

  const rate =
    input.cohortRate7d !== null ? `${input.cohortRate7d}% cohort activation` : "cohort rate n/a (small n)";
  return {
    brief: `${input.uniqueActivated7d} unique activated users (7d), ${input.completions7d} completions, ${rate}. Top channel: ${input.topChannel || "direct/unknown"}.`,
    decision: "Draft this week's Mon post from the engine slate and queue it for approval.",
    decision_href: "#desk-content",
  };
}

export type WeekSlotDraft = {
  day: string;
  theme: string;
  topic: string;
  campaign: string;
  platform: SocialPlatform;
};

export function buildWeekPlanPrompt(): string {
  return [
    "Draft a 7-slot content week for HōMI (Decision Companion). Mon/Wed/Fri are required posting days; include optional Tue/Thu.",
    "Themes rotate: Founder Story, ICP Pain, Social Proof, Product/Path, Afford≠Ready, Not yet, What HōMI isn't.",
    "Educational only. Never lender/approval language.",
    'Return JSON: { "slots": [ { "day": "Mon", "theme": "...", "topic": "one sentence topic", "campaign": "utm_slug", "platform": "x" } ] }',
    "Exactly 5–7 slots. campaign must be snake_case.",
  ].join("\n");
}

export function templateWeekPlan(): { slots: WeekSlotDraft[] } {
  return {
    slots: [
      { day: "Mon", theme: "Founder Story", topic: "Why credit answers the wrong question", campaign: "w_founder_why", platform: "x" },
      { day: "Tue", theme: "ICP Pain", topic: "Afford ≠ ready — the anxiety under the pre-approval letter", campaign: "w_afford_ready", platform: "tiktok" }, // brand-ok: post topic quoting industry term to contrast against HōMI positioning // brand-ok: topic names the banned phrase as the anxiety, not a claim
      { day: "Wed", theme: "Product / Path", topic: "What a Build First verdict actually unlocks", campaign: "w_build_first", platform: "x" },
      { day: "Thu", theme: "Social Proof / Insight", topic: "Three questions before you escalate the commitment", campaign: "w_three_q", platform: "tiktok" },
      { day: "Fri", theme: "What HōMI isn't", topic: "Not a lender. Not a credit score. A Decision Companion.", campaign: "w_what_isnt", platform: "x" },
    ],
  };
}

export function buildRewritePrompt(input: {
  original: string;
  feedback: string;
  platform: SocialPlatform;
}): string {
  return [
    `Rewrite this ${input.platform} post using the CEO feedback. Keep educational claim-law clean.`,
    "Never use: approved, pre-approved, pre-qualified, guaranteed, our lenders, credit score replacement.", // brand-ok: enumerating prohibited claim words for LLM instruction // brand-ok: claim-law denylist for rewrite prompts
    "",
    "ORIGINAL:",
    input.original,
    "",
    "FEEDBACK:",
    input.feedback,
    "",
    'Return JSON: { "copy": "...", "hashtags": ["#..."] }',
  ].join("\n");
}

export function templateRewrite(input: {
  original: string;
  feedback: string;
  platform: SocialPlatform;
}): { copy: string; hashtags: string[] } {
  const note = input.feedback.trim() ? ` (${input.feedback.trim().slice(0, 80)})` : "";
  const base = stripNeverSay(input.original).clean || input.original;
  return {
    copy: fitToLimit(
      `${base}\n\n— Revised for clarity${note}. Educational guidance only. Not a lender.`,
      PLATFORM_LIMITS[input.platform],
    ),
    hashtags: defaultHashtags(input.platform),
  };
}

/** Per-action model tiering (P3). */
export function modelForAction(action: string): string {
  const premium = new Set(["morning_brief", "week_plan", "scorecard_summary", "audience_insight"]);
  if (premium.has(action)) return "claude-sonnet-4-20250514";
  return "claude-haiku-4-5-20251001";
}

