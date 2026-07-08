import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
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

You will produce exactly three perspectives on the same real HōMI-Score data, then a synthesis:

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
    `HōMI-Score: ${assessment.score}/100. Verdict: ${meta.label} (${meta.line}). ` +
    `Pillars — Financial Reality: ${assessment.pillars.financial}/35, Emotional Truth: ${assessment.pillars.emotional}/35, ` +
    `Perfect Timing: ${assessment.pillars.timing}/30.${hardStopNote}`
  );
}

function tryParseTrinityJson(text: string): { advocate: string; skeptic: string; arbiter: string; alignment: string } | null {
  try {
    // Strip potential markdown code fences defensively.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
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
  const { allowed } = rateLimit(`trinity:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Take a breath and try again in a minute." },
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
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }

  const { assessment } = parsed.data;

  if (!hasAnthropic()) {
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
        model: "claude-sonnet-4-5",
        max_tokens: 1200,
        system: `${SYSTEM_PROMPT}\n\nContext for this analysis: ${contextNote}`,
        messages: [
          {
            role: "user",
            content: "Run the Trinity now. Respond with only the JSON object, following all rules exactly.",
          },
        ],
      }),
    });

    if (!response.ok) {
      const trinity = buildFallbackTrinity(assessment);
      return NextResponse.json({ trinity, source: "fallback" });
    }

    const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    const trinity = text ? tryParseTrinityJson(text) : null;

    if (!trinity) {
      const fallback = buildFallbackTrinity(assessment);
      return NextResponse.json({ trinity: fallback, source: "fallback" });
    }

    return NextResponse.json({ trinity, source: "model" });
  } catch {
    const trinity = buildFallbackTrinity(assessment);
    return NextResponse.json({ trinity, source: "fallback" });
  }
}
