import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { env, hasAnthropic } from "@/lib/env";
import {
  AGENCY_SYSTEM_PROMPT,
  buildCaptionPrompt,
  buildInsightPrompt,
  buildPostPrompt,
  defaultHashtags,
  fitToLimit,
  platformMeta,
  slugifyCampaign,
  stripNeverSay,
  templateCaption,
  templateInsight,
  templatePost,
  type GeneratedCaption,
  type GeneratedPost,
  type HookStyle,
  type PostTone,
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

const bodySchema = z.discriminatedUnion("action", [
  generatePostSchema,
  audienceInsightSchema,
  captionSchema,
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

  if (body.action === "generate_post") {
    return NextResponse.json(await generatePost(body, gate.user.id));
  }
  if (body.action === "audience_insight") {
    return NextResponse.json(await audienceInsight(body, gate.user.id));
  }
  return NextResponse.json(await caption(body, gate.user.id));
}

async function generatePost(
  body: { platform: SocialPlatform; tone: PostTone; topic: string; wordCount?: number },
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
