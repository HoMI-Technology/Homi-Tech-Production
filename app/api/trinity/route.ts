import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import { getUserEntitlements } from "@/lib/entitlements";
import { buildFallbackTrinity, type TrinityAssessmentContext } from "@/lib/trinity/fallback";
import { VERDICT_META } from "@/lib/brand";

export const runtime = "nodejs";

const assessmentContextSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  pillars: z.object({
    financial: z.number(),
    emotional: z.number(),
    timing: z.number(),
  }),
  hardStops: z.array(z.string().max(400)).default([]),
});

const bodySchema = z.object({
  assessment: assessmentContextSchema,
});

const SYSTEM_PROMPT = `You are running the "Trinity Engine" for HōMI, a home-readiness decision companion. Brand is "HōMI" (with a macron over the o) — never write it any other way. Voice: calm, radically honest, protective. NOT YET is protection, not failure. No hype words, no emoji.

You will produce exactly three perspectives on the same real Decision Readiness Score data, then a synthesis:

1. The Advocate — the strongest honest case FOR moving forward now. Must be genuine and specific to their actual numbers, not generic optimism. 100-160 words.
2. The Skeptic — the strongest honest case for waiting. If hard-stop protections are present, the Skeptic must cite the specific hard-stop condition(s) by name. 100-160 words.
3. The Arbiter — a synthesis of both, plus a concrete statement of what specific, measurable thing would change the answer (not vague "time will tell"). 100-160 words.

Then produce a one-sentence "alignment" statement: does the Arbiter's synthesis agree or disagree with the numeric verdict, stated plainly.

Never give specific financial, legal, mortgage, or investment advice — speak only to readiness, timing, and honesty. Ground every perspective in the actual score, verdict, pillar breakdown, and hard stops given to you. Never invent numbers.

Respond with ONLY a JSON object, no markdown fences, no commentary, in exactly this shape:
{"advocate": "...", "skeptic": "...", "arbiter": "...", "alignment": "..."}`;

function buildContextNote(assessment: TrinityAssessmentContext): string {
  const meta = VERDICT_META[assessment.verdict];
  const hardStopNote =
    assessment.hardStops.length > 0
      ? ` Active protective hard-stops: ${assessment.hardStops.join("; ")}.`
      : " No hard stops are active.";
  return (
    `Decision Readiness Score: ${assessment.score}/100. Verdict: ${meta.label} (${meta.line}). ` +
    `Pillars — Financial Reality: ${assessment.pillars.financial}/35, Emotional Truth: ${assessment.pillars.emotional}/35, ` +
    `Perfect Timing: ${assessment.pillars.timing}/30.${hardStopNote}`
  );
}

function tryParseTrinityJson(
  text: string,
): { advocate: string; skeptic: string; arbiter: string; alignment: string } | null {
  try {
    // Strip potential markdown code fences defensively.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (
      typeof parsed.advocate === "string" &&
      typeof parsed.skeptic === "string" &&
      typeof parsed.arbiter === "string" &&
      typeof parsed.alignment === "string" &&
      parsed.advocate.trim() &&
      parsed.skeptic.trim() &&
      parsed.arbiter.trim() &&
      parsed.alignment.trim()
    ) {
      return {
        advocate: parsed.advocate.trim(),
        skeptic: parsed.skeptic.trim(),
        arbiter: parsed.arbiter.trim(),
        alignment: parsed.alignment.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`trinity:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Take a breath and try again in a minute." },
      { status: 429 },
    );
  }

  // Validate the body BEFORE the Companion gate: gateCompanion atomically
  // consumes one daily-quota message, and a malformed request must not burn it.
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Companion gate: this is an LLM endpoint (AUDIT T1.3). Require a session and
  // consume from the tier's daily quota — no anonymous LLM spend.
  const supabase = await createClient();
  const gate = await gateCompanion(supabase);
  if (!gate.ok) return gate.response;

  // Real model only for paid tiers (advisorRealModel). Authenticated FREE users
  // get the deterministic fallback trinity — no model spend.
  const { entitlements } = await getUserEntitlements(supabase);

  const { assessment } = parsed.data;

  if (!hasAnthropic() || !entitlements.advisorRealModel) {
    const trinity = buildFallbackTrinity(assessment);
    return NextResponse.json({ trinity, source: "fallback" });
  }

  try {
    const contextNote = buildContextNote(assessment);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: `${SYSTEM_PROMPT}\n\nContext for this analysis: ${contextNote}`,
        messages: [
          {
            role: "user",
            content:
              "Run the Trinity now. Respond with only the JSON object, following all rules exactly.",
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[trinity] model call failed", {
        status: response.status,
        reason: "non_200_response",
      });
      const trinity = buildFallbackTrinity(assessment);
      return NextResponse.json({ trinity, source: "fallback" });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    const trinity = text ? tryParseTrinityJson(text) : null;

    if (!trinity) {
      const fallback = buildFallbackTrinity(assessment);
      return NextResponse.json({ trinity: fallback, source: "fallback" });
    }

    console.log("[advisor:cost]", {
      surface: "trinity",
      model: "claude-haiku-4-5-20251001",
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
      userId: gate.userId,
      tier: entitlements.tier,
    });

    return NextResponse.json({ trinity, source: "model" });
  } catch (err) {
    console.error("[trinity] model call failed", {
      status: undefined,
      reason: err instanceof Error ? err.message : String(err),
    });
    const trinity = buildFallbackTrinity(assessment);
    return NextResponse.json({ trinity, source: "fallback" });
  }
}
