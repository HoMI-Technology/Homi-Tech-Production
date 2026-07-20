import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import { loadServerAssessmentContext } from "@/lib/advisor/server-context";
import { buildPersonaFallbackReply, type AdvisorAssessmentContext } from "@/lib/advisor/fallback";
import { getPersona, type AdvisorPersona } from "@/lib/advisor/personas";
import { VERDICT_META } from "@/lib/brand";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const assessmentContextSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  pillars: z.object({
    financial: z.number(),
    emotional: z.number(),
    timing: z.number(),
  }),
  hardStops: z.array(z.string()).default([]),
});

const personaSchema = z.enum(["homie", "reality", "gut", "timing", "planner"]);

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  assessment: assessmentContextSchema.nullish(),
  persona: personaSchema.nullish(),
  /** When true, the server supplies a fixed mock assessment context (used
   * by the public /artifact companion test environment) and any client-sent
   * `assessment` field is ignored. */
  demoContext: z.boolean().nullish(),
});

/**
 * Fixed mock context for the /artifact test environment. Score 67 and
 * pillar points 24/23/20 (financial/emotional/timing, on maxes 35/35/30)
 * mirror lib/demo/context.tsx's DEMO_DATA so the demo page and the
 * companion playground never disagree. AdvisorAssessmentContext.pillars
 * are on a 0-100 scale (see lib/advisor/context.ts's buildAssessmentContext,
 * which normalizes pillar.total / PILLAR_MAX_POINTS.pillar * 100) — so the
 * raw points are converted here the same way.
 */
const DEMO_ASSESSMENT_CONTEXT: AdvisorAssessmentContext = {
  score: 67,
  verdict: "ALMOST_THERE",
  pillars: {
    financial: Math.round((24 / 35) * 100),
    emotional: Math.round((23 / 35) * 100),
    timing: Math.round((20 / 30) * 100),
  },
  hardStops: [],
};

const SYSTEM_PROMPT = `You are HōMI's Decision Companion — the voice inside the HōMI app that talks with people about whether they're ready to buy a home.

Voice rules, non-negotiable:
- You are the user's homie, not their banker. Never sound like a customer-service chatbot. Never say things like "I'd be happy to help!" or "Great question!" or use exclamation points to fake enthusiasm.
- Speak in short, honest sentences. Calm, warm, direct. No hype words, no emoji, no corporate softening.
- Radical honesty. You are willing to say "not yet." That is not a failure state — NOT YET is protection, and you treat it that way.
- You NEVER give financial, legal, tax, mortgage, or investment advice. You do not recommend specific lenders, rates, products, real estate agents, or brokerages. You provide educational guidance only, grounded in the three HōMI pillars: Financial Reality, Emotional Truth, and Perfect Timing.
- When the user has assessment context (score, verdict, pillar breakdown, hard stops), reference their actual numbers specifically. Do not speak in generic terms when you have their real data.
- If hard stops are present, explain specifically what protection they represent — never shame the user for tripping one.
- Keep replies under roughly 250 words. Be substantive but not exhausting.
- If you don't have their assessment data, don't guess at their numbers — invite them warmly to get their Shadow Score.

Remember: your job is to help people see clearly, not to close a sale or cheer them on. Sometimes the most honest and most homie thing you can say is "not yet."`;

function buildContextNote(assessment: AdvisorAssessmentContext | null | undefined): string {
  if (!assessment) {
    return "The user has not completed an assessment yet. Do not invent numbers — invite them to take the Shadow Score if relevant.";
  }
  const meta = VERDICT_META[assessment.verdict];
  return [
    `User's HōMI-Score: ${assessment.score}/100.`,
    `Verdict: ${meta.label} (${meta.line}).`,
    `Pillar breakdown — Financial Reality: ${assessment.pillars.financial}/100, Emotional Truth: ${assessment.pillars.emotional}/100, Perfect Timing: ${assessment.pillars.timing}/100.`,
    assessment.hardStops.length > 0
      ? `Active hard stops (protective red lines): ${assessment.hardStops.join(" | ")}`
      : "No hard stops are active.",
  ].join(" ");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`advisor:${ip}`, { limit: 20, windowMs: 60_000 });
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

  const { messages, persona, demoContext } = parsed.data;

  // Assessment context. Demo playground uses the fixed mock. For the real
  // Companion we read the user's LATEST assessment server-side (integrity: the
  // Companion must reason about real numbers, never a client-forged block) —
  // the client-sent `assessment` field is ignored for signed-in users.
  let assessment: AdvisorAssessmentContext | null | undefined;

  if (demoContext) {
    // The public /artifact playground stays open, but on a tight anonymous
    // DAILY budget (not just the 20/min burst limit) so it can't be a spend
    // faucet. Per-IP; upgrades to cross-instance once Redis lands (PR #10).
    const demoBudget = rateLimit(`advisor-demo:${ip}`, { limit: 5, windowMs: 24 * 60 * 60 * 1000 });
    if (!demoBudget.allowed) {
      return NextResponse.json(
        { error: "You've reached the demo limit for today. Sign up to keep talking with your Companion." },
        { status: 429 },
      );
    }
    assessment = DEMO_ASSESSMENT_CONTEXT;
  } else {
    // Companion gate: requires a session and consumes one message from the
    // tier's server-authoritative daily+monthly quota (free tier gets a genuine
    // taste; over-quota returns a graceful 402 the client renders as an upgrade
    // nudge). See lib/advisor/quota.
    const supabase = await createClient();
    const gate = await gateCompanion(supabase);
    if (!gate.ok) return gate.response;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    assessment = user ? await loadServerAssessmentContext(supabase, user.id) : undefined;
  }
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const activePersona: AdvisorPersona = persona ?? "homie";
  const personaMeta = getPersona(activePersona);

  if (!hasAnthropic()) {
    const reply = buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
    return NextResponse.json({ reply, source: "fallback" });
  }

  try {
    const trimmed = messages.slice(-12);
    const contextNote = buildContextNote(assessment ?? null);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n${personaMeta.systemLine}\n\nContext for this conversation: ${contextNote}`,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const reply = buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
      return NextResponse.json({ reply, source: "fallback" });
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    if (!text) {
      const reply = buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
      return NextResponse.json({ reply, source: "fallback" });
    }

    return NextResponse.json({ reply: text, source: "model" });
  } catch {
    const reply = buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
    return NextResponse.json({ reply, source: "fallback" });
  }
}
