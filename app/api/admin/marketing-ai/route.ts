import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { env, hasAnthropic } from "@/lib/env";
import {
  AGENCY_SYSTEM_PROMPT,
  buildAnalyticsPrompt,
  buildCaptionPrompt,
  buildCompetitorPrompt,
  buildDripStepPrompt,
  buildImageBriefPrompt,
  buildInsightPrompt,
  buildPostPrompt,
  buildRepurposePrompt,
  buildScorecardSummaryPrompt,
  defaultHashtags,
  fitToLimit,
  isCompetitorTag,
  platformMeta,
  slugifyCampaign,
  stripNeverSay,
  templateAnalyticsSummary,
  templateCaption,
  templateCompetitorAnalysis,
  templateDripSequence,
  templateImageBrief,
  templateInsight,
  templatePost,
  templateRepurpose,
  templateScorecardSummary,
  type AnalyticsSummary,
  type CompetitorAnalysis,
  type CompetitorPost,
  type DripPresetKey,
  type DripStep,
  type DripStepInput,
  type GeneratedCaption,
  type GeneratedPost,
  type HookStyle,
  type ImageBrief,
  type PostTone,
  type ScorecardSummaryInput,
  type SocialPlatform,
} from "@/lib/admin/marketing-agency";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * AI copy generation for the marketing agency suite (/admin/marketing).
 *
 * Admin-only, rate limited, and fail-soft: when ANTHROPIC_API_KEY is unset — or
 * the upstream call fails, times out, or returns copy that trips claim law —
 * the deterministic templates in lib/admin/marketing-agency answer instead, so
 * the studio is never a dead button. The response always says which path ran
 * (`source`) so the operator knows whether they are reading model output.
 *
 * Every completion passes through stripNeverSay here as well as in the client:
 * the server strip is the one that matters, the client strip is what keeps a
 * cached response honest.
 */

const MODEL = "claude-haiku-4-5-20251001";
const UPSTREAM_TIMEOUT_MS = 20_000;

async function requireAdmin(): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { user };
}

const platformSchema = z.enum(["linkedin", "x", "instagram", "threads"]);
const toneSchema = z.enum(["educational", "story", "authority", "hook", "engagement"]);
const hookStyleSchema = z.enum(["question", "stat", "story", "quote", "controversial"]);

const generatePostSchema = z.object({
  action: z.literal("generate_post"),
  platform: platformSchema,
  tone: toneSchema,
  topic: z.string().trim().min(3).max(400),
  wordCount: z.number().int().min(20).max(600).optional(),
  // Free text rather than an enum: the client sends the persona *brief*, which
  // is what reaches the model. An unknown string is harmless — it is prose in a
  // prompt, not a lookup key.
  persona: z.string().trim().max(200).optional(),
});

const audienceInsightSchema = z.object({
  action: z.literal("audience_insight"),
  verdictCounts: z.record(z.string().max(40), z.number().int().min(0).max(10_000_000)),
  channelCounts: z
    .array(z.object({ label: z.string().trim().max(60), count: z.number().int().min(0) }))
    .max(20),
  interestCounts: z
    .array(z.object({ interest: z.string().trim().max(60), count: z.number().int().min(0) }))
    .max(20),
});

const captionSchema = z.object({
  action: z.literal("caption"),
  idea: z.string().trim().min(3).max(400),
  imageDescription: z.string().trim().max(400).optional(),
  platform: platformSchema,
  hookStyle: hookStyleSchema,
});

const scorecardSummarySchema = z.object({
  action: z.literal("scorecard_summary"),
  metrics: z.object({
    activationsLast7: z.number().int().min(0).max(10_000_000),
    accountsLast7: z.number().int().min(0).max(10_000_000),
    waitlistLast7: z.number().int().min(0).max(10_000_000),
    mrrCents: z.number().int().min(0).max(1_000_000_000),
    topChannel: z.string().trim().max(60),
  }),
});

const repurposeSchema = z.object({
  action: z.literal("repurpose"),
  source_copy: z.string().trim().min(3).max(3000),
  target_platform: platformSchema,
});

const imageBriefSchema = z.object({
  action: z.literal("image_brief"),
  caption_hook: z.string().trim().min(1).max(400),
  caption_body: z.string().trim().max(3000),
  platform: platformSchema,
});

const analyticsSummarySchema = z.object({
  action: z.literal("analytics_summary"),
  top_posts: z
    .array(
      z.object({
        title: z.string().trim().max(200),
        impressions: z.number().min(0).max(1_000_000_000),
        ctr: z.number().min(0).max(100),
        clicks: z.number().min(0).max(1_000_000_000),
      }),
    )
    .min(1)
    .max(30),
});

const dripSequenceSchema = z.object({
  action: z.literal("drip_sequence"),
  preset: z.enum(["launch", "reengagement", "assessment_nurture", "custom"]),
  steps: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        delay_days: z.number().int().min(0).max(365),
      }),
    )
    .min(1)
    .max(8),
  audience_interest: z.string().trim().max(120).optional(),
  /**
   * Single-step regeneration. The whole sequence is still sent so the prompt can
   * say "step 3 of 4" honestly; only this index is generated and returned.
   */
  regenerate_index: z.number().int().min(0).max(7).optional(),
});

const competitorAnalysisSchema = z.object({
  action: z.literal("competitor_analysis"),
  posts: z
    .array(
      z.object({
        account: z.string().trim().max(80),
        hook: z.string().trim().min(1).max(400),
        tags: z.array(z.string().trim().max(30)).max(6),
        impressions: z.number().int().min(0).max(1_000_000_000).optional(),
      }),
    )
    .min(1)
    .max(50),
});

const bodySchema = z.discriminatedUnion("action", [
  generatePostSchema,
  audienceInsightSchema,
  captionSchema,
  scorecardSummarySchema,
  repurposeSchema,
  imageBriefSchema,
  analyticsSummarySchema,
  dripSequenceSchema,
  competitorAnalysisSchema,
]);

/**
 * Pull a JSON object out of a completion. Haiku follows the "no code fences"
 * instruction almost always, so this only has to survive the exceptions:
 * a fenced block, or a stray sentence either side of the object.
 */
function extractJson(raw: string): Record<string, unknown> | null {
  const withoutFences = raw.replace(/```(?:json)?/gi, "").trim();
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(withoutFences.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asHashtags(value: unknown, platform: SocialPlatform): string[] {
  if (!Array.isArray(value)) return defaultHashtags(platform);
  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => {
      const trimmed = tag.trim().replace(/\s+/g, "");
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    })
    .filter((tag) => tag.length > 1)
    .slice(0, platformMeta(platform).hashtagCount);
  return tags.length > 0 ? tags : defaultHashtags(platform);
}

/**
 * One Anthropic call. Returns the completion text, or null on any failure —
 * missing key, non-200, timeout, or an empty text block. Callers fall back to
 * their template rather than surfacing an error, so a key problem degrades the
 * feature instead of breaking it.
 */
async function callModel(
  prompt: string,
  maxTokens: number,
  actorId: string,
  action: string,
): Promise<string | null> {
  if (!hasAnthropic()) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: AGENCY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!response.ok) {
      // A bad or expired key looks exactly like the normal $0 template path
      // from the client's side, so it has to be visible in logs.
      console.error("[marketing-ai] model call failed", { status: response.status, action });
      return null;
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    console.log("[marketing-ai:cost]", {
      surface: "admin_marketing",
      action,
      model: MODEL,
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
      userId: actorId,
    });

    return data.content?.find((block) => block.type === "text")?.text?.trim() ?? null;
  } catch (err) {
    console.error("[marketing-ai] model call threw", {
      action,
      reason: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  // Per-IP as specified; the admin id is appended so two admins behind one
  // office NAT cannot exhaust each other's budget.
  const { allowed } = await rateLimit(`marketing-ai:${getClientIp(request)}:${gate.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many generations. Wait a minute and try again." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid marketing-ai payload." }, { status: 400 });
  }
  const body = parsed.data;

  switch (body.action) {
    case "generate_post":
      return NextResponse.json(await generatePost(body, gate.user.id));
    case "audience_insight":
      return NextResponse.json(await audienceInsight(body, gate.user.id));
    case "caption":
      return NextResponse.json(await caption(body, gate.user.id));
    case "scorecard_summary":
      return NextResponse.json(await scorecardSummary(body.metrics, gate.user.id));
    case "repurpose":
      return NextResponse.json(await repurpose(body, gate.user.id));
    case "image_brief":
      return NextResponse.json(await imageBrief(body, gate.user.id));
    case "analytics_summary":
      return NextResponse.json(await analyticsSummary(body.top_posts, gate.user.id));
    case "drip_sequence":
      return NextResponse.json(await dripSequence(body, gate.user.id));
    case "competitor_analysis":
      return NextResponse.json(await competitorAnalysis(body.posts, gate.user.id));
  }

  // Unreachable: bodySchema is a discriminated union over exactly these actions.
  // Kept so the handler's return type can never widen to include undefined.
  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}

async function generatePost(
  body: {
    platform: SocialPlatform;
    tone: PostTone;
    topic: string;
    wordCount?: number;
    persona?: string;
  },
  actorId: string,
): Promise<GeneratedPost & { source: "model" | "template"; flagged: string[] }> {
  const fallback = { ...templatePost(body), source: "template" as const, flagged: [] as string[] };

  const raw = await callModel(buildPostPrompt(body), 1400, actorId, "generate_post");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const copy = asString(parsed?.copy);
  if (!copy) return fallback;

  const meta = platformMeta(body.platform);
  const checked = stripNeverSay(copy);
  if (!checked.clean) return fallback;

  const suggestion = asString(parsed?.utmSuggestion);
  return {
    copy: fitToLimit(checked.clean, meta.limit),
    hashtags: asHashtags(parsed?.hashtags, body.platform),
    utmSuggestion: suggestion
      ? slugifyCampaign(suggestion)
      : `${meta.utmSource}_${slugifyCampaign(body.topic)}`.slice(0, 60),
    source: "model",
    flagged: checked.flagged,
  };
}

async function audienceInsight(
  body: {
    verdictCounts: Record<string, number>;
    channelCounts: { label: string; count: number }[];
    interestCounts: { interest: string; count: number }[];
  },
  actorId: string,
): Promise<{ insight: string; source: "model" | "template"; flagged: string[] }> {
  const fallback = {
    ...templateInsight(body),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildInsightPrompt(body), 500, actorId, "audience_insight");
  if (!raw) return fallback;

  const insight = asString(extractJson(raw)?.insight);
  if (!insight) return fallback;

  const checked = stripNeverSay(insight);
  if (!checked.clean) return fallback;

  return { insight: checked.clean, source: "model", flagged: checked.flagged };
}

async function caption(
  body: {
    idea: string;
    imageDescription?: string;
    platform: SocialPlatform;
    hookStyle: HookStyle;
  },
  actorId: string,
): Promise<GeneratedCaption & { source: "model" | "template"; flagged: string[] }> {
  const fallback = {
    ...templateCaption(body),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildCaptionPrompt(body), 900, actorId, "caption");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const hook = stripNeverSay(asString(parsed?.hook));
  const bodyCopy = stripNeverSay(asString(parsed?.body));
  if (!hook.clean || !bodyCopy.clean) return fallback;

  const meta = platformMeta(body.platform);
  return {
    hook: fitToLimit(hook.clean, Math.min(220, meta.limit)),
    body: fitToLimit(bodyCopy.clean, Math.max(0, meta.limit - hook.clean.length - 2)),
    hashtags: asHashtags(parsed?.hashtags, body.platform),
    source: "model",
    flagged: [...new Set([...hook.flagged, ...bodyCopy.flagged])],
  };
}

/* ------------------------------------------------------------------ *
 * Tier 2 actions
 * ------------------------------------------------------------------ */

/**
 * Claim-strip every string in a model-produced list and drop what is left empty.
 * Bulleted output is where a prohibited phrase most often survives review, since
 * the operator skims a list rather than reading it.
 */
function asCleanList(value: unknown, max: number, flagged: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => {
      const checked = stripNeverSay(item.trim());
      flagged.push(...checked.flagged);
      return checked.clean.trim();
    })
    .filter((item) => item.length > 0)
    .slice(0, max);
}

async function scorecardSummary(
  metrics: ScorecardSummaryInput,
  actorId: string,
): Promise<{ summary: string; source: "model" | "template"; flagged: string[] }> {
  const fallback = {
    ...templateScorecardSummary(metrics),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildScorecardSummaryPrompt(metrics), 400, actorId, "scorecard_summary");
  if (!raw) return fallback;

  const summary = asString(extractJson(raw)?.summary);
  if (!summary) return fallback;

  const checked = stripNeverSay(summary);
  if (!checked.clean) return fallback;

  return { summary: checked.clean, source: "model", flagged: checked.flagged };
}

async function repurpose(
  body: { source_copy: string; target_platform: SocialPlatform },
  actorId: string,
): Promise<GeneratedPost & { platform: SocialPlatform; source: "model" | "template"; flagged: string[] }> {
  const input = { sourceCopy: body.source_copy, targetPlatform: body.target_platform };
  const fallback = {
    ...templateRepurpose(input),
    platform: body.target_platform,
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildRepurposePrompt(input), 900, actorId, "repurpose");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const copy = asString(parsed?.copy);
  if (!copy) return fallback;

  const meta = platformMeta(body.target_platform);
  const checked = stripNeverSay(copy);
  if (!checked.clean) return fallback;

  const suggestion = asString(parsed?.utmSuggestion);
  return {
    copy: fitToLimit(checked.clean, meta.limit),
    hashtags: asHashtags(parsed?.hashtags, body.target_platform),
    utmSuggestion: suggestion
      ? slugifyCampaign(suggestion)
      : `${meta.utmSource}_${slugifyCampaign(body.source_copy.slice(0, 60))}`.slice(0, 60),
    platform: body.target_platform,
    source: "model",
    flagged: checked.flagged,
  };
}

async function imageBrief(
  body: { caption_hook: string; caption_body: string; platform: SocialPlatform },
  actorId: string,
): Promise<ImageBrief & { source: "model" | "template"; flagged: string[] }> {
  const input = {
    captionHook: body.caption_hook,
    captionBody: body.caption_body,
    platform: body.platform,
  };
  const fallback = {
    ...templateImageBrief(input),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildImageBriefPrompt(input), 700, actorId, "image_brief");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const canva = stripNeverSay(asString(parsed?.canva_prompt));
  const midjourney = stripNeverSay(asString(parsed?.midjourney_prompt));
  if (!canva.clean || !midjourney.clean) return fallback;

  const notes = stripNeverSay(asString(parsed?.style_notes));
  return {
    canva_prompt: canva.clean,
    midjourney_prompt: midjourney.clean,
    style_notes: notes.clean || fallback.style_notes,
    source: "model",
    flagged: [...new Set([...canva.flagged, ...midjourney.flagged, ...notes.flagged])],
  };
}

async function analyticsSummary(
  topPosts: { title: string; impressions: number; ctr: number; clicks: number }[],
  actorId: string,
): Promise<AnalyticsSummary & { source: "model" | "template"; flagged: string[] }> {
  const fallback = {
    // The template twin reads full rows; the endpoint only receives the top set,
    // which is enough for the share-of-reach arithmetic it does.
    ...templateAnalyticsSummary(topPosts.map((p) => ({ ...p, date: "" }))),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildAnalyticsPrompt(topPosts), 900, actorId, "analytics_summary");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const summary = stripNeverSay(asString(parsed?.summary));
  if (!summary.clean) return fallback;

  const flagged = [...summary.flagged];
  return {
    summary: summary.clean,
    recommended_hooks: asCleanList(parsed?.recommended_hooks, 5, flagged),
    content_gaps: asCleanList(parsed?.content_gaps, 5, flagged),
    source: "model",
    flagged: [...new Set(flagged)],
  };
}

async function dripSequence(
  body: {
    preset: DripPresetKey;
    steps: { name: string; delay_days: number }[];
    audience_interest?: string;
    regenerate_index?: number;
  },
  actorId: string,
): Promise<{ steps: DripStep[]; source: "model" | "template"; flagged: string[] }> {
  const steps: DripStepInput[] = body.steps.map((s) => ({ name: s.name, delayDays: s.delay_days }));
  const template = templateDripSequence({ preset: body.preset, steps });

  // Single-step regeneration still prompts with the full sequence context, so
  // "step 3 of 4" is true rather than "step 1 of 1".
  const targets =
    body.regenerate_index !== undefined && body.regenerate_index < steps.length
      ? [body.regenerate_index]
      : steps.map((_, i) => i);

  if (!hasAnthropic()) {
    return {
      steps: targets.map((i) => template[i]!),
      source: "template",
      flagged: [],
    };
  }

  const flagged: string[] = [];
  let anyModel = false;

  const generated = await Promise.all(
    targets.map(async (index) => {
      const raw = await callModel(
        buildDripStepPrompt({
          preset: body.preset,
          step: steps[index]!,
          index,
          total: steps.length,
          audienceInterest: body.audience_interest,
        }),
        800,
        actorId,
        "drip_sequence",
      );
      if (!raw) return template[index]!;

      const parsed = extractJson(raw);
      const subject = stripNeverSay(asString(parsed?.subject));
      const emailBody = stripNeverSay(asString(parsed?.body));
      if (!subject.clean || !emailBody.clean) return template[index]!;

      anyModel = true;
      flagged.push(...subject.flagged, ...emailBody.flagged);
      return {
        step: index + 1,
        name: steps[index]!.name,
        delay_days: steps[index]!.delayDays,
        subject: subject.clean,
        body: emailBody.clean,
      } satisfies DripStep;
    }),
  );

  return {
    steps: generated,
    source: anyModel ? "model" : "template",
    flagged: [...new Set(flagged)],
  };
}

async function competitorAnalysis(
  posts: { account: string; hook: string; tags: string[]; impressions?: number }[],
  actorId: string,
): Promise<CompetitorAnalysis & { source: "model" | "template"; flagged: string[] }> {
  // The template twin is tag-driven, so unknown tags are dropped rather than
  // widening CompetitorTag to string across the whole module. Narrowed with the
  // library's own guard so this cannot drift from COMPETITOR_TAGS.
  const typed: CompetitorPost[] = posts.map((p, i) => ({
    id: String(i),
    account: p.account,
    date: "",
    hook: p.hook,
    tags: p.tags.filter(isCompetitorTag),
    impressions: p.impressions,
  }));

  const fallback = {
    ...templateCompetitorAnalysis(typed),
    source: "template" as const,
    flagged: [] as string[],
  };

  const raw = await callModel(buildCompetitorPrompt(posts), 1000, actorId, "competitor_analysis");
  if (!raw) return fallback;

  const parsed = extractJson(raw);
  const flagged: string[] = [];
  const patterns = asCleanList(parsed?.patterns, 6, flagged);
  const recommendations = asCleanList(parsed?.recommendations, 3, flagged);
  if (patterns.length === 0 || recommendations.length === 0) return fallback;

  return {
    patterns,
    gaps: asCleanList(parsed?.gaps, 5, flagged),
    recommendations,
    source: "model",
    flagged: [...new Set(flagged)],
  };
}
