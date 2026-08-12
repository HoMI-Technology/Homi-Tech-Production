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

export type SocialPlatform = "linkedin" | "x" | "instagram" | "threads";
export type PostTone = "educational" | "story" | "authority" | "hook" | "engagement";
export type HookStyle = "question" | "stat" | "story" | "quote" | "controversial";

/** Hard character ceilings enforced client-side (badge only, never a server gate). */
export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  linkedin: 3000,
  x: 280,
  instagram: 2200,
  threads: 500,
};

export type PlatformMeta = {
  key: SocialPlatform;
  label: string;
  limit: number;
  /** utm_source / utm_medium stamped on the post's link. */
  utmSource: string;
  utmMedium: string;
  /** Formatting brief handed to the model. */
  brief: string;
  /** How many hashtags the platform actually rewards. */
  hashtagCount: number;
};

export const PLATFORMS: PlatformMeta[] = [
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
    key: "x",
    label: "Twitter/X",
    limit: PLATFORM_LIMITS.x,
    utmSource: "x",
    utmMedium: "social",
    brief:
      "One tight post under 280 characters including the link. Declarative, no throat-clearing, " +
      "no hashtag stuffing. Say one true thing well.",
    hashtagCount: 2,
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

export function platformMeta(key: SocialPlatform): PlatformMeta {
  return PLATFORMS.find((p) => p.key === key) ?? PLATFORMS[0]!;
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
}): string {
  const meta = platformMeta(input.platform);
  const tone = TONES.find((t) => t.key === input.tone) ?? TONES[0]!;
  const target = input.wordCount ? `Aim for roughly ${input.wordCount} words. ` : "";

  return [
    `Write one ${meta.label} post for HōMI.`,
    "",
    `TOPIC: ${input.topic}`,
    `TONE: ${tone.label} — ${tone.brief}`,
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
}): GeneratedPost {
  const meta = platformMeta(input.platform);
  const topic = input.topic.trim() || "a major purchase decision";
  const body = TONE_TEMPLATES[input.tone](topic).join("\n");

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

/**
 * Seed the week from the engine slate: Mon/Wed/Fri morning, in slate order,
 * mapped onto whichever days the slate actually names.
 */
export function seedCalendarFromEngine(
  posts: { day: string; title: string; campaign: string }[],
): CalendarBoard {
  const board: CalendarBoard = {};
  const fallbackDays: CalendarDay[] = ["Mon", "Wed", "Fri"];

  posts.forEach((post, index) => {
    const day = isCalendarDay(post.day) ? post.day : fallbackDays[index % fallbackDays.length]!;
    board[calendarKey(day, "morning")] = {
      day,
      slot: "morning",
      platform: "linkedin",
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
    const platform = PLATFORMS.some((p) => p.key === entry.platform)
      ? (entry.platform as SocialPlatform)
      : "linkedin";
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
