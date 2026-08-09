import { NextResponse } from "next/server";
import { z } from "zod";
import { agentOs } from "@/lib/flags";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import { getUserEntitlements, type Entitlements } from "@/lib/entitlements";
import { persistCompanionExchange } from "@/lib/advisor/memory";
import {
  buildPersonaFallbackReply,
  type AdvisorAssessmentContext,
  type AdvisorFinanceContext,
} from "@/lib/advisor/fallback";
import { VERDICT_META } from "@/lib/brand";
import {
  routeAgents,
  leadAgentForMode,
  sentinelCheck,
  buildReceipt,
  type AgentMode,
  type AgentId,
  getAgent,
  AGENTS,
} from "@/lib/agents/registry";
import {
  promptSafeString,
  promptSafeMessageContent,
  sanitizePromptLiteral,
} from "@/lib/advisor/prompt-safety";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: promptSafeMessageContent(4000),
});

const assessmentContextSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]),
  pillars: z.object({
    financial: z.number(),
    emotional: z.number(),
    timing: z.number(),
  }),
  hardStops: z
    .array(promptSafeString(160))
    .transform((arr) => arr.filter((s): s is string => s !== null))
    .default([]),
  ageDays: z.number().min(0).max(36_500).nullish(),
  previousScore: z.number().min(0).max(100).nullish(),
});

const financeContextSchema = z.object({
  monthlyIncome: z.number().min(0).max(10_000_000),
  netCashFlow: z.number().min(-10_000_000).max(10_000_000),
  savingsRate: z.number().min(-1000).max(1000),
  runwayMonths: z.number().min(0).max(1200).nullable(),
  dti: z.number().min(0).max(1000),
  liquidSavings: z.number().min(0).max(1_000_000_000),
  // Nullable: the v1 ledger has no liability type and reports these as unknown.
  totalDebt: z.number().min(0).max(1_000_000_000).nullable(),
  netWorth: z.number().min(-1_000_000_000).max(1_000_000_000).nullable(),
  ageDays: z.number().min(0).max(36_500).nullish(),
});

const identitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(24)
    .refine((s) => !/[\r\n]/.test(s), "single line")
    .transform((s) => sanitizePromptLiteral(s, { maxLength: 24 }) ?? "HōMI"),
});

const bodySchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1)
    .max(50)
    .refine(
      (messages) => messages[messages.length - 1]?.role === "user",
      "The last message must be from the user.",
    ),
  conversationId: z.string().uuid().nullish(),
  assessment: assessmentContextSchema.nullish(),
  finance: financeContextSchema.nullish(),
  surface: promptSafeString(80).nullish(),
  whatChanged: promptSafeString(240).nullish(),
  identity: identitySchema.nullish(),
  /** Agent OS conversation mode. Keyword routing still applies on top. */
  mode: z.enum(["explore", "analyze", "plan", "simulate", "compare", "decompress"]).nullish(),
  /** Public demo mode — fixed mock context, no auth, no quota consumption. */
  demoContext: z.boolean().nullish(),
});

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

const SYSTEM_PROMPT = `You are HōMI's Decision Companion — the voice inside the HōMI app. HōMI like homie: a friend, present everywhere in the product. You talk with people about their whole financial life — cash flow, savings, debt, runway, net worth — and whether they're ready for big decisions, starting with buying a home.

Voice rules, non-negotiable:
- You are the user's homie, not their banker. Never sound like a customer-service chatbot.
- Speak in short, honest sentences. Calm, warm, direct. No hype words, no emoji, no corporate softening.
- Radical honesty. You are willing to say "not yet." That is not a failure state — NOT YET is protection.
- You NEVER give financial, legal, tax, mortgage, or investment advice. You do not recommend specific lenders, rates, products, real estate agents, or brokerages. You provide educational guidance only, grounded in the three HōMI pillars: Financial Reality, Emotional Truth, and Perfect Timing.
- When the user has assessment context (score, verdict, pillar breakdown, hard stops) or a live money picture, reference their actual numbers specifically.
- When you know which part of HōMI the user is on, connect the conversation to that surface and point to other HōMI tools by name when they'd genuinely help.
- If hard stops are present, explain specifically what protection they represent — never shame the user.
- Keep replies under roughly 250 words. Be substantive but not exhausting.
- If you don't have their assessment data, don't guess — invite them warmly to get their Shadow Score.
- Every number you have is self-reported by the user unless explicitly marked otherwise. Never present self-reported data as verified fact.
- Honesty about freshness: when data is weeks or months old, say so plainly.

Agent OS layer:
- You are part of a team of specialists: Homie (companion), Scout (context), Analyst (numbers), Coach (emotion), Architect (roadmap), Oracle (scenarios), and Sentinel (guardrail).
- The user's message has been routed to one or more of you. The lead agent's instructions are appended below. Answer primarily in that lead voice, but you may draw on other specialists when the question clearly touches their domain.
- Always identify yourself by name at the start of your reply, e.g., "Analyst here." or "Homie." Keep it one short clause.
- Sentinel's rules are absolute: no "you should buy/sell/invest/borrow," no certainty claims, no "approved," "qualified," or "I recommend." No urgency, no FOMO, no pressure.

Remember: your job is to help people see clearly, not to close a sale or cheer them on. Sometimes the most honest and most homie thing you can say is "not yet."`;

function buildContextNote(
  assessment: AdvisorAssessmentContext | null | undefined,
  finance?: AdvisorFinanceContext | null,
  surface?: string | null,
  whatChanged?: string | null,
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
    if (whatChanged) {
      parts.push(`What changed: ${whatChanged} Reference this movement when it's relevant.`);
    } else if (typeof assessment.previousScore === "number") {
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
      `DTI ${finance.dti}%, liquid savings $${finance.liquidSavings},`,
      finance.totalDebt === null || finance.netWorth === null
        ? "debt and net worth are unknown — no account with liabilities is connected. Do not state or estimate either figure; say you cannot see it yet."
        : `total debt $${finance.totalDebt}, net worth $${finance.netWorth}.`,
    );
  }

  return parts.join(" ");
}

/**
 * Build a deterministic fallback reply for the Agent OS when the real model is
 * unavailable or the user is on the free tier. We reuse the existing persona
 * fallback for substance, then prepend a short agent attribution so the client
 * can still show which agent responded.
 */
function buildAgentFallbackReply(
  message: string,
  leadAgent: AgentId,
  assessment?: AdvisorAssessmentContext | null,
): string {
  const base = buildPersonaFallbackReply({ message, assessment, persona: "homie" });
  const agent = getAgent(leadAgent);
  return `${agent.name} here. ${base}`;
}

/**
 * Determine which tools the agent ensemble would suggest for this exchange.
 * This is a deterministic label set based on routed agents; no tool executor is
 * invoked. The field is named `tools_suggested` so the UI does not imply that a
 * simulation ran when it did not.
 */
function toolsSuggestedForAgents(agents: AgentId[]): string[] {
  const tools: string[] = [];
  if (agents.includes("analyst")) tools.push("calculate_buffer_months", "dti_snapshot");
  if (agents.includes("oracle")) tools.push("monte_carlo_stress_test");
  if (agents.includes("architect")) tools.push("build_roadmap");
  if (agents.includes("scout")) tools.push("market_context_lookup");
  if (tools.length === 0) tools.push("companion_turn");
  return tools;
}

export async function POST(request: Request) {
  // Feature flag: the entire Agent OS can be disabled while in development.
  if (!agentOs) {
    return NextResponse.json(
      { error: "Agent OS is not enabled.", flag: "NEXT_PUBLIC_FF_AGENT_OS" },
      { status: 503 },
    );
  }

  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`agents:${ip}`, { limit: 20, windowMs: 60_000 });
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
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, mode, demoContext } = parsed.data;

  // Auth / quota gate. Anonymous demo mode uses the IP rate limit only; real
  // usage requires a session and consumes one message from the tier quota.
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let gateUserId: string | null = null;
  let entitlements: Entitlements | null = null;
  if (!demoContext) {
    supabase = await createClient();
    const gate = await gateCompanion(supabase);
    if (!gate.ok) return gate.response;
    gateUserId = gate.userId;
    ({ entitlements } = await getUserEntitlements(supabase));
  }
  const agentRealModel = !demoContext && entitlements?.advisorRealModel === true;

  const assessment = demoContext ? DEMO_ASSESSMENT_CONTEXT : parsed.data.assessment;
  const finance = demoContext ? null : parsed.data.finance;
  const surface = demoContext ? null : parsed.data.surface;
  const whatChanged = demoContext ? null : parsed.data.whatChanged;
  const identity = demoContext ? null : parsed.data.identity;

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const routedAgents = routeAgents(lastUserMessage);
  const leadAgent = leadAgentForMode(mode);
  // Ensure the mode's lead agent is represented in the routed set.
  if (!routedAgents.includes(leadAgent)) {
    routedAgents.push(leadAgent);
  }

  async function respond(reply: string, source: "model" | "fallback") {
    let conversationId = demoContext
      ? null
      : ((parsed.success ? parsed.data.conversationId : null) ?? null);
    if (supabase && gateUserId) {
      const persisted = await persistCompanionExchange(supabase, {
        userId: gateUserId,
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: reply,
        source,
        persona: `agent:${routedAgents.join(",")}`,
      });
      if (persisted) conversationId = persisted;
    }
    const suggestedTools = toolsSuggestedForAgents(routedAgents);
    return NextResponse.json({
      reply,
      source,
      conversationId,
      routed_agents: routedAgents,
      tools_suggested: suggestedTools,
      sentinel: sentinelCheck(reply),
      receipt: buildReceipt(routedAgents, suggestedTools),
    });
  }

  // Free tier, anonymous demo, or missing Anthropic key → deterministic fallback.
  if (!hasAnthropic() || !agentRealModel) {
    const reply = buildAgentFallbackReply(lastUserMessage, leadAgent, assessment);
    return respond(reply, "fallback");
  }

  try {
    const trimmed = messages.slice(-12);
    const contextNote = buildContextNote(assessment ?? null, finance, surface, whatChanged);
    const lead = getAgent(leadAgent);
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n${lead.systemLine}${identityLine}\n\nContext for this conversation: ${contextNote}`,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      console.error("[agents] model call failed", {
        status: response.status,
        reason: "non_200_response",
      });
      const reply = buildAgentFallbackReply(lastUserMessage, leadAgent, assessment);
      return respond(reply, "fallback");
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    if (!text) {
      const reply = buildAgentFallbackReply(lastUserMessage, leadAgent, assessment);
      return respond(reply, "fallback");
    }

    console.log("[agents:cost]", {
      surface: "agents",
      model: "claude-haiku-4-5-20251001",
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
      userId: gateUserId,
      tier: entitlements?.tier,
      routed_agents: routedAgents,
    });

    // Sentinel guardrail: if the model reply triggers a Sentinel pattern, fall
    // back to the deterministic agent reply and log the event for review.
    const sentinel = sentinelCheck(text);
    if (sentinel.flagged) {
      console.warn("[agents] sentinel flagged model reply", {
        userId: gateUserId,
        rules: sentinel.rules_enforced,
      });
      const fallback = buildAgentFallbackReply(lastUserMessage, leadAgent, assessment);
      return respond(fallback, "fallback");
    }

    return respond(text, "model");
  } catch (err) {
    console.error("[agents] model call failed", {
      status: undefined,
      reason: err instanceof Error ? err.message : String(err),
    });
    const reply = buildAgentFallbackReply(lastUserMessage, leadAgent, assessment);
    return respond(reply, "fallback");
  }
}
