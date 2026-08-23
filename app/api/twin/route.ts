import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import { getUserEntitlements } from "@/lib/entitlements";
import { buildFallbackLetter, type TwinAssessmentContext, type Horizon } from "@/lib/twin/fallback";
import { VERDICT_META } from "@/lib/brand";

export const runtime = "nodejs";

const assessmentContextSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  weakestPillar: z.object({
    name: z.string().min(1).max(80),
    pct: z.number().min(0).max(100),
  }),
  hardStops: z.array(z.string().max(400)).default([]),
});

const bodySchema = z.object({
  horizon: z.enum(["5", "10", "retirement"]),
  fear: z.string().max(400).optional(),
  assessment: assessmentContextSchema,
});

// The spelling rule names the misspellings it forbids, so the literals are
// intentional negative examples. The waiver rides as a trailing code comment
// (the file is also in brand-check's SUPPRESSION_REGISTRY) — an in-string
// comment used to ship verbatim to the model on every call.
const BRAND_SPELLING_RULE =
  '- Brand is "HōMI" (with a macron over the o). Never write "Homi" or "HOMI" in prose.'; // brand-ok: negative-example spellings the model must never emit

const SYSTEM_PROMPT = `You write as the user's own future self, sending a letter back to their present-day self at the exact moment they are deciding whether to buy a home. You are not a financial advisor and you never give financial or legal advice. You are warm, honest, and never preachy. You are grounded strictly in the real Decision Readiness Score data you are given — never invent numbers.

Voice rules (non-negotiable):
${BRAND_SPELLING_RULE}
- Calm, radically honest, protective. NOT YET is protection, not failure or rejection.
- No hype words, no emoji, no exclamation-point energy.
- A gentle "temperature" or time metaphor is welcome (the passage of time, distance, hindsight) but do not overuse it.
- Write 250-350 words total.
- End with exactly one concrete, specific ask directed at the present-day self — something they can actually do, not vague encouragement.
- Never give specific financial, legal, mortgage, or investment advice. Speak only to readiness, timing, and honesty.
- Reference their actual score, verdict, weakest pillar, and any hard-stop protections naturally in the letter — don't just list them.
- If they shared a fear, address it directly and specifically, with honesty about how it resolved (or didn't, if the verdict is NOT_YET and unresolved — in that case be honest that some fears take longer, without inventing outcomes).

Output plain prose only: a short salutation-style opening line, then the letter body in flowing paragraphs. No markdown, no headers, no bullet points.`;

function buildContextNote(
  horizon: Horizon,
  assessment: TwinAssessmentContext,
  fear: string | undefined,
): string {
  const meta = VERDICT_META[assessment.verdict];
  const horizonWord = horizon === "retirement" ? "retirement" : `${horizon} years from now`;
  const hardStopNote =
    assessment.hardStops.length > 0
      ? ` Active protective hard-stops at the time: ${assessment.hardStops.join("; ")}.`
      : "";
  const fearNote =
    fear && fear.trim()
      ? ` The present-day self named this fear about the decision: "${fear.trim()}".`
      : "";
  return (
    `Writing horizon: ${horizonWord}. Decision Readiness Score: ${assessment.score}/100. Verdict: ${meta.label} (${meta.line}). ` +
    `Weakest pillar: ${assessment.weakestPillar.name} at ${assessment.weakestPillar.pct}%.${hardStopNote}${fearNote}`
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`twin:${ip}`, { limit: 10, windowMs: 60_000 });
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
  // get the deterministic fallback letter — no model spend.
  const { entitlements } = await getUserEntitlements(supabase);

  const { horizon, fear, assessment } = parsed.data;

  if (!hasAnthropic() || !entitlements.advisorRealModel) {
    const letter = buildFallbackLetter({ horizon, fear, assessment });
    return NextResponse.json({ letter, source: "fallback" });
  }

  try {
    const contextNote = buildContextNote(horizon, assessment, fear);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system: `${SYSTEM_PROMPT}\n\nContext for this letter: ${contextNote}`,
        messages: [
          {
            role: "user",
            content:
              "Write the letter now, following all the rules exactly. Output plain prose only.",
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[twin] model call failed", {
        status: response.status,
        reason: "non_200_response",
      });
      const letter = buildFallbackLetter({ horizon, fear, assessment });
      return NextResponse.json({ letter, source: "fallback" });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    if (!text) {
      const letter = buildFallbackLetter({ horizon, fear, assessment });
      return NextResponse.json({ letter, source: "fallback" });
    }

    console.log("[advisor:cost]", {
      surface: "twin",
      model: "claude-haiku-4-5-20251001",
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
      userId: gate.userId,
      tier: entitlements.tier,
    });

    // Model returns plain prose; split into paragraphs for rendering,
    // treating the first line as the salutation if it reads like one.
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const salutation =
      lines[0] && lines[0].length < 90 ? lines[0] : "A letter from your future self";
    const paragraphs = lines[0] && lines[0].length < 90 ? lines.slice(1) : lines;

    return NextResponse.json({
      letter: { salutation, paragraphs: paragraphs.length > 0 ? paragraphs : [text] },
      source: "model",
    });
  } catch (err) {
    console.error("[twin] model call failed", {
      status: undefined,
      reason: err instanceof Error ? err.message : String(err),
    });
    const letter = buildFallbackLetter({ horizon, fear, assessment });
    return NextResponse.json({ letter, source: "fallback" });
  }
}
