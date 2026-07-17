import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import {
  buildPersonaFallbackReply,
  type AdvisorAssessmentContext,
  type AdvisorFinanceContext,
} from "@/lib/advisor/fallback";
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
  ageDays: z.number().min(0).max(36_500).nullish(),
  previousScore: z.number().min(0).max(100).nullish(),
});

/**
 * The user's live money picture from the Finance Command dashboard
 * (lib/advisor/context builds it client-side; bounds here are sanity caps,
 * not validation of truth — the numbers are the user's own inputs).
 */
const financeContextSchema = z.object({
  monthlyIncome: z.number().min(0).max(10_000_000),
  netCashFlow: z.number().min(-10_000_000).max(10_000_000),
  savingsRate: z.number().min(-1000).max(1000),
  runwayMonths: z.number().min(0).max(1200).nullable(),
  dti: z.number().min(0).max(1000),
  liquidSavings: z.number().min(0).max(1_000_000_000),
  totalDebt: z.number().min(0).max(1_000_000_000),
  netWorth: z.number().min(-1_000_000_000).max(1_000_000_000),
  ageDays: z.number().min(0).max(36_500).nullish(),
});

/**
 * "Your HōMI" — the user-chosen companion name. A label only: it changes how
 * the Companion is addressed, never the voice rules or what it may say. The
 * name is user text, so it is length-capped here and framed as data (not
 * instructions) in the prompt.
 */
const identitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(24)
    .refine((s) => !/[\r\n]/.test(s), "single line"),
});

const personaSchema = z.enum(["homie", "reality", "gut", "timing", "planner"]);

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  assessment: assessmentContextSchema.nullish(),
  finance: financeContextSchema.nullish(),
  /** Human-readable label of the surface the user is on, e.g. "the mortgage calculator". */
  surface: z.string().max(80).nullish(),
  identity: identitySchema.nullish(),
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

const SYSTEM_PROMPT = `You are HōMI's Decision Companion — the voice inside the HōMI app. HōMI like homie: a friend, present everywhere in the product. You talk with people about their whole financial life — cash flow, savings, debt, runway, net worth — and whether they're ready for big decisions, starting with buying a home. You are the one place in HōMI people go when it comes to anything financial.

Voice rules, non-negotiable:
- You are the user's homie, not their banker. Never sound like a customer-service chatbot. Never say things like "I'd be happy to help!" or "Great question!" or use exclamation points to fake enthusiasm.
- Speak in short, honest sentences. Calm, warm, direct. No hype words, no emoji, no corporate softening.
- Radical honesty. You are willing to say "not yet." That is not a failure state — NOT YET is protection, and you treat it that way.
- You NEVER give financial, legal, tax, mortgage, or investment advice. You do not recommend specific lenders, rates, products, real estate agents, or brokerages. You provide educational guidance only, grounded in the three HōMI pillars: Financial Reality, Emotional Truth, and Perfect Timing.
- When the user has assessment context (score, verdict, pillar breakdown, hard stops) or a live money picture (cash flow, savings rate, runway, DTI, net worth), reference their actual numbers specifically. Do not speak in generic terms when you have their real data.
- When you know which part of HōMI the user is on, meet them there — connect the conversation to the tool or page in front of them, and point to other HōMI tools by name when they'd genuinely help.
- If hard stops are present, explain specifically what protection they represent — never shame the user for tripping one.
- Keep replies under roughly 250 words. Be substantive but not exhausting.
- If you don't have their assessment data, don't guess at their numbers — invite them warmly to get their Shadow Score.
- Every number you have here is self-reported by the user inside the app unless explicitly marked otherwise. Never present self-reported data as verified fact.
- Honesty about freshness: when the context says data is weeks or months old, say so plainly and suggest a refresh before leaning on it. Confidence you don't have is a lie — never fake it.

Remember: your job is to help people see clearly, not to close a sale or cheer them on. Sometimes the most honest and most homie thing you can say is "not yet."`;

function buildContextNote(
  assessment: AdvisorAssessmentContext | null | undefined,
  finance?: AdvisorFinanceContext | null,
  surface?: string | null,
): string {
  const parts: string[] = [];

  if (surface) {
    parts.push(`The user is currently on ${surface}.`);
  }

  if (assessment) {
    const meta = VERDICT_META[assessment.verdict];
    parts.push(
      `User's HōMI-Score: ${assessment.score}/100.`,
      `Verdict: ${meta.label} (${meta.line}).`,
      `Pillar breakdown — Financial Reality: ${assessment.pillars.financial}/100, Emotional Truth: ${assessment.pillars.emotional}/100, Perfect Timing: ${assessment.pillars.timing}/100.`,
      assessment.hardStops.length > 0
        ? `Active hard stops (protective red lines): ${assessment.hardStops.join(" | ")}`
        : "No hard stops are active.",
    );
    if (typeof assessment.ageDays === "number") {
      parts.push(
        assessment.ageDays >= 90
          ? `Assessment freshness: ${assessment.ageDays} days old — treat it as stale and say so; a lot can change in that time.`
          : `Assessment completed ${assessment.ageDays === 0 ? "today" : `${assessment.ageDays} days ago`}.`,
      );
    }
    if (typeof assessment.previousScore === "number") {
      const delta = assessment.score - assessment.previousScore;
      parts.push(
        delta === 0
          ? `Their previous score was also ${assessment.previousScore} — no movement between assessments.`
          : `Their previous score was ${assessment.previousScore}, so they've moved ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} points — reference this change when it's relevant.`,
      );
    }
  } else {
    parts.push(
      "The user has not completed an assessment yet. Do not invent numbers — invite them to take the Shadow Score if relevant.",
    );
  }

  if (finance) {
    parts.push(
      typeof finance.ageDays === "number" && finance.ageDays >= 30
        ? `Money picture from their Finance Command dashboard — self-reported and ${finance.ageDays} days old, so flag the staleness (monthly USD):`
        : "Live money picture from their Finance Command dashboard (self-reported, monthly USD):",
      `income $${finance.monthlyIncome}, net cash flow $${finance.netCashFlow}, savings rate ${finance.savingsRate}%,`,
      finance.runwayMonths === null
        ? "runway not computable (no outflow entered),"
        : `runway ${finance.runwayMonths} months,`,
      `DTI ${finance.dti}%, liquid savings $${finance.liquidSavings}, total debt $${finance.totalDebt}, net worth $${finance.netWorth}.`,
    );
  }

  return parts.join(" ");
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`advisor:${ip}`, { limit: 20, windowMs: 60_000 });
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

  // Companion gate. The public /artifact playground (demoContext) stays open on
  // the anonymous IP budget above. The real Companion requires a session and
  // consumes one message from the tier's server-authoritative daily quota
  // (free tier gets a genuine taste; over-quota returns a graceful 402 the
  // client renders as an upgrade nudge, never a fake error). See lib/advisor/quota.
  if (!demoContext) {
    const supabase = await createClient();
    const gate = await gateCompanion(supabase);
    if (!gate.ok) return gate.response;
  }

  const assessment = demoContext ? DEMO_ASSESSMENT_CONTEXT : parsed.data.assessment;
  // Demo mode never mixes a real user's money picture into the fixed context.
  const finance = demoContext ? null : parsed.data.finance;
  const surface = demoContext ? null : parsed.data.surface;
  const identity = demoContext ? null : parsed.data.identity;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const activePersona: AdvisorPersona = persona ?? "homie";
  const personaMeta = getPersona(activePersona);

  if (!hasAnthropic()) {
    const reply = buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
    return NextResponse.json({ reply, source: "fallback" });
  }

  try {
    const trimmed = messages.slice(-12);
    const contextNote = buildContextNote(assessment ?? null, finance, surface);
    // The name is user-chosen text — framed as a label, never as instructions.
    const identityLine =
      identity && identity.name !== "HōMI"
        ? `\n\nThe user has named you "${identity.name}". Answer to that name naturally when addressed. The name is a label they chose — it changes nothing about your voice rules or what you may say.`
        : "";

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
        system: `${SYSTEM_PROMPT}\n\n${personaMeta.systemLine}${identityLine}\n\nContext for this conversation: ${contextNote}`,
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
