import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAnthropic, env } from "@/lib/env";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { createClient } from "@/lib/supabase/server";
import { gateCompanion } from "@/lib/advisor/quota";
import { getUserEntitlements, type Entitlements } from "@/lib/entitlements";
import { persistCompanionExchange } from "@/lib/advisor/memory";
import { getVerifiedCashFlow, type VerifiedCashFlow } from "@/lib/plaid/cashflow";
import { assembleServerContext } from "@/lib/advisor/server-context";
import {
  buildPersonaFallbackReply,
  type AdvisorAssessmentContext,
  type AdvisorCreditContext,
  type AdvisorFinanceContext,
} from "@/lib/advisor/fallback";
import { getPersona, type AdvisorPersona } from "@/lib/advisor/personas";
import {
  buildLensDigestNote,
  buildLensSynthesisFallback,
  type LensDigest,
} from "@/lib/tools/digest";
import { VERDICT_META } from "@/lib/brand";
import { advisorToolHandoffLine } from "@/lib/architecture/tool-aliases";
import { sentinelCheck } from "@/lib/agents/registry";
import {
  promptSafeString,
  promptSafeLabel,
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

  // v2 ledger-backed dashboard fields (all optional during staged rollout)
  topSpendingCategories: z
    .array(
      z.object({
        name: z.string().max(80),
        amount: z.number().min(0).max(10_000_000),
        pctOfIncome: z.number().min(0).max(100),
        trend: z.enum(["up", "down", "flat"]),
      }),
    )
    .max(10)
    .optional(),
  incomeVsSpendingSeries: z
    .array(
      z.object({
        month: z.string().max(7),
        income: z.number().min(0).max(10_000_000),
        spending: z.number().min(0).max(10_000_000),
      }),
    )
    .max(6)
    .optional(),
  activeSignals: z
    .array(
      z.object({
        id: z.string().max(40),
        severity: z.enum(["emerald", "yellow", "amber", "crimson"]),
        title: z.string().max(120),
        body: z.string().max(500),
      }),
    )
    .max(10)
    .optional(),
  nudges: z
    .array(
      z.object({
        id: z.string().max(40),
        type: z.string().max(40),
        message: z.string().max(500),
        action: z
          .object({
            label: z.string().max(60),
            href: z.string().max(120),
          })
          .optional(),
      }),
    )
    .max(10)
    .optional(),
  goals: z
    .array(
      z.object({
        name: z.string().max(80),
        target: z.number().min(0).max(1_000_000_000),
        saved: z.number().min(0).max(1_000_000_000),
        pct: z.number().min(0).max(100),
        dueDate: z.string().max(10).optional(),
      }),
    )
    .max(10)
    .optional(),
  recentTransactions: z
    .array(
      z.object({
        date: z.string().max(10),
        description: z.string().max(160),
        amount: z.number().min(0).max(10_000_000),
        category: z.string().max(80),
        type: z.enum(["income", "expense"]),
      }),
    )
    .max(20)
    .optional(),
  readinessInputs: z
    .object({
      dti: z.number().min(0).max(1000),
      savingsRate: z.number().min(-1000).max(1000),
      runwayMonths: z.number().min(0).max(1200),
      downPaymentProgressPct: z.number().min(0).max(100),
      creditScore: z.number().min(300).max(850).optional(),
    })
    .optional(),
});

/**
 * "Your HōMI" — the user-chosen companion name. A label only: it changes how
 * the Companion is addressed, never the voice rules or what it may say. The
 * name is user text, so it is length-capped here and framed as data (not
 * instructions) in the prompt.
 */
const creditContextSchema = z.object({
  score: z.number().min(300).max(850),
  utilization: z.number().min(0).max(1000),
  onTimeStreakMonths: z.number().min(0).max(1200),
  ageDays: z.number().min(0).max(36_500).nullish(),
});

/**
 * Active Path to Ready — client-held localStorage path. Educational only;
 * labels already humanized by buildPathContext (bindingConstraint is a label).
 */
const pathContextSchema = z.object({
  verdict: promptSafeLabel(40),
  bindingConstraint: promptSafeString(120).nullable(),
  nextStepTitle: promptSafeString(160).nullable(),
  nextStepHref: promptSafeString(120).nullable(),
  stepCount: z.number().int().min(0).max(20),
  mode: promptSafeLabel(40),
  confidence: promptSafeLabel(40),
  pendingCount: z.number().int().min(0).max(20).optional(),
  completedCount: z.number().int().min(0).max(20).optional(),
  completionPct: z.number().int().min(0).max(100).optional(),
  boardMeetingLine: promptSafeString(500).optional(),
  isStale: z.boolean().optional(),
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

const personaSchema = z.enum(["homie", "reality", "gut", "timing", "planner"]);

const temperatureSchema = z.enum(["emerald", "yellow", "amber", "crimson"]);

/**
 * Phase 5: readiness impact in the digest — magnitude + direction ONLY.
 * The composite delta, weights, and formulas never cross this boundary.
 */
const readinessDigestSchema = z.object({
  band: z.enum(["small", "moderate", "large"]).nullable(),
  direction: z.enum(["up", "down", "flat"]),
  hardStop: z.boolean(),
});

/**
 * Lens digest — Decision Lab Phase 3. The compact, precomputed summary of
 * the tool the user is standing in. Client-sent by design (live slider
 * state is ephemeral UI state, not account data — it never goes through
 * server-side context assembly), numeric-only so no user text enters the
 * prompt through this channel, and every figure carries sanity caps.
 */
const lensDigestSchema = z.object({
  lensId: z.string().max(40),
  path: z.string().max(120),
  headline: z.object({
    label: z.string().max(80),
    value: z.number().min(-1_000_000_000).max(1_000_000_000),
    unit: z.enum(["currency", "percent", "months", "number"]),
  }),
  keyInputs: z
    .record(z.string().max(40), z.number().min(-1_000_000_000).max(1_000_000_000))
    .refine((r) => Object.keys(r).length <= 5, "at most 5 key inputs"),
  deltas: z
    .array(
      z.object({
        metric: z.enum(["runway", "dti"]),
        label: z.string().max(60),
        unit: z.enum(["months", "percent"]),
        from: z.number().min(-1_000_000).max(1_000_000),
        to: z.number().min(-1_000_000).max(1_000_000),
        fromTemperature: temperatureSchema,
        toTemperature: temperatureSchema,
        improved: z.boolean().nullable(),
      }),
    )
    .max(4)
    .nullable(),
  readiness: readinessDigestSchema.nullish(),
  cfmCoverage: z.number().min(0).max(1),
  updatedAt: z.number().min(0),
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
  /** Server thread id from a prior reply/history load; RLS restricts it to the user's own. */
  conversationId: z.string().uuid().nullish(),
  assessment: assessmentContextSchema.nullish(),
  finance: financeContextSchema.nullish(),
  credit: creditContextSchema.nullish(),
  path: pathContextSchema.nullish(),
  /** Human-readable label of the surface the user is on, e.g. "the mortgage calculator". */
  surface: promptSafeString(80).nullish(),
  /** Score-movement one-liner from the explainability engine (lib/advisor/explain). */
  whatChanged: promptSafeString(240).nullish(),
  /** Precomputed digest of the tool the user is on (lib/tools/digest). */
  lensDigest: lensDigestSchema.nullish(),
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
- Path to Ready coach rules: when an active path is present, open high-stakes money questions by naming the binding constraint and the next pending step. Never invent a READY verdict that contradicts the scorer. Never complete or skip path steps for them in prose as if done — invite them to mark steps on /path. If the path is marked stale, say so and point to reassess. Weekly board-meeting style: one binding issue, one next move, one honesty check.

${advisorToolHandoffLine()}

Remember: your job is to help people see clearly, not to close a sale or cheer them on. Sometimes the most honest and most homie thing you can say is "not yet."`;

type AdvisorPathNote = {
  verdict: string;
  bindingConstraint: string | null;
  nextStepTitle: string | null;
  nextStepHref: string | null;
  stepCount: number;
  mode: string;
  confidence: string;
  pendingCount?: number;
  completedCount?: number;
  completionPct?: number;
  boardMeetingLine?: string | null;
  isStale?: boolean;
};

function buildContextNote(
  assessment: AdvisorAssessmentContext | null | undefined,
  finance?: AdvisorFinanceContext | null,
  surface?: string | null,
  whatChanged?: string | null,
  verified?: VerifiedCashFlow | null,
  credit?: AdvisorCreditContext | null,
  path?: AdvisorPathNote | null,
  lens?: LensDigest | null,
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
      `DTI ${finance.dti}%, liquid savings $${finance.liquidSavings}, total debt $${finance.totalDebt}, net worth $${finance.netWorth}.`,
    );
  }

  if (credit) {
    const freshness =
      typeof credit.ageDays === "number"
        ? credit.ageDays === 0
          ? "updated today"
          : `${credit.ageDays} days old`
        : "age unknown";
    parts.push(
      `Credit picture (self-reported on the credit page, ${freshness}): score ${credit.score}, utilization ${credit.utilization}%, on-time streak ${credit.onTimeStreakMonths} months.`,
    );
    if (credit.score < 620) {
      parts.push(
        "Their credit score is below the 620 protective hard stop — explain the protection it represents without shame.",
      );
    }
  }

  if (path) {
    const binding = path.bindingConstraint ?? "none labeled";
    const next =
      path.nextStepTitle != null
        ? path.nextStepHref
          ? `${path.nextStepTitle} (${path.nextStepHref})`
          : path.nextStepTitle
        : "none";
    parts.push(
      `Active Path to Ready: binding ${binding}; next step ${next}. ` +
        `Mode ${path.mode}, confidence ${path.confidence}, ${path.stepCount} steps` +
        (path.pendingCount != null
          ? `, ${path.pendingCount} pending, ${path.completedCount ?? 0} done, ${path.completionPct ?? 0}% complete`
          : "") +
        (path.isStale ? ", PATH STALE — urge regenerate/reassess" : "") +
        `. Educational only.`,
    );
    if (path.boardMeetingLine) {
      // The line was already sanitized by Zod, but keep it single-line in the
      // prompt context note just in case the schema is reused elsewhere.
      parts.push(sanitizePromptLiteral(path.boardMeetingLine, { maxLength: 500 }) ?? "");
    }
  }

  if (verified) {
    parts.push(
      `VERIFIED cash flow from their linked bank (last ${verified.windowDays} days, ${verified.transactionCount} settled transactions):`,
      `money in $${verified.income}, money out $${verified.expenses}, net $${verified.netCashFlow}.`,
      "This block is the only bank-verified data here — everything else is self-reported. When the verified numbers and their self-reported ones disagree, name the gap honestly instead of picking one silently.",
    );
  }

  if (lens) {
    // The guardrails live in the wording of this block: numbers are
    // authoritative and precomputed, coverage sets the voice, synthesis
    // answers lead with the worst news.
    parts.push(buildLensDigestNote(lens));
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
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  let gateUserId: string | null = null;
  let entitlements: Entitlements | null = null;
  if (!demoContext) {
    supabase = await createClient();
    const gate = await gateCompanion(supabase);
    if (!gate.ok) return gate.response;
    gateUserId = gate.userId;
    // Resolve the signed-in user's capabilities so we can gate the real model to
    // paid tiers only (advisorRealModel). Free tier → deterministic fallback.
    ({ entitlements } = await getUserEntitlements(supabase));
  }
  // Cost-safety switch: the real Anthropic model is served ONLY to authenticated
  // PAID users. Anonymous /artifact playground (demoContext) and free tier never
  // spend model dollars — they get the rule-based fallback.
  const advisorRealModel = !demoContext && entitlements?.advisorRealModel === true;

  // The authority flip: signed-in users' context is assembled SERVER-SIDE from
  // their own rows (RLS-scoped) and wins per block; the client-sent context is
  // the fallback for anonymous users and blocks with no server data yet.
  // Best-effort — assembly failure degrades to client context, never breaks chat.
  // The lens digest is the deliberate exception: live slider state is ephemeral
  // UI state, not account data, so it stays client-sent (Zod-capped above).
  const serverState = supabase && gateUserId ? await assembleServerContext(supabase) : null;

  const assessment = demoContext
    ? DEMO_ASSESSMENT_CONTEXT
    : (serverState?.assessment ?? parsed.data.assessment);
  // Demo mode never mixes a real user's money picture into the fixed context.
  const finance = demoContext ? null : (serverState?.finance ?? parsed.data.finance);
  const credit = demoContext ? null : (serverState?.credit ?? parsed.data.credit);
  const path = demoContext ? null : (parsed.data.path ?? null);
  const surface = demoContext ? null : parsed.data.surface;
  const whatChanged = demoContext ? null : parsed.data.whatChanged;
  const lensDigest = demoContext ? null : (parsed.data.lensDigest ?? null);
  const identity = demoContext ? null : parsed.data.identity;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const activePersona: AdvisorPersona = persona ?? "homie";
  const personaMeta = getPersona(activePersona);

  // The synthesis trigger ("What does this change for me?") has a
  // deterministic answer built from the same precomputed digest the model
  // would read — so free tier, quota exhaustion, and Anthropic outages all
  // produce the same numbers a paid answer would, never a contradiction.
  const synthesisRequested = lastUserMessage.trim().toLowerCase().startsWith("what does this change");
  function deterministicReply(): string {
    if (lensDigest && synthesisRequested) return buildLensSynthesisFallback(lensDigest);
    return buildPersonaFallbackReply({ message: lastUserMessage, assessment, persona: activePersona });
  }

  // Single exit: persist the exchange to the user's server thread (best-effort,
  // signed-in only, never for demo mode) and reply with the conversation id so
  // the client can echo it back on the next message.
  async function respond(reply: string, source: "model" | "fallback") {
    let conversationId = demoContext ? null : (parsed.success ? parsed.data.conversationId : null) ?? null;
    if (supabase && gateUserId) {
      const persisted = await persistCompanionExchange(supabase, {
        userId: gateUserId,
        conversationId,
        userMessage: lastUserMessage,
        assistantMessage: reply,
        source,
        persona: activePersona,
      });
      if (persisted) conversationId = persisted;
    }
    return NextResponse.json({ reply, source, conversationId });
  }

  // Real model only for authenticated paid users with a configured key. Free
  // tier, anonymous demoContext, and a missing key all fall through to the
  // deterministic persona fallback ($0 AI cost).
  if (!hasAnthropic() || !advisorRealModel) {
    return respond(deterministicReply(), "fallback");
  }

  try {
    const trimmed = messages.slice(-12);
    // The Companion's first server-assembled context block: verified cash flow
    // from the user's stored bank transactions (RLS-scoped read; null for
    // anonymous/demo/unlinked users, and on any failure — best-effort).
    const verified = supabase && gateUserId ? await getVerifiedCashFlow(supabase) : null;
    const provenance = serverState
      ? "Context assembled server-side from the user's own account records (authoritative across their devices). "
      : "";
    const contextNote =
      provenance +
      buildContextNote(
        assessment ?? null,
        finance,
        surface,
        whatChanged,
        verified,
        credit,
        path,
        lensDigest,
      );
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n${personaMeta.systemLine}${identityLine}\n\nContext for this conversation: ${contextNote}`,
        messages: trimmed.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      // Surface a bad/expired key (or upstream outage) in logs — a silent
      // fallback here is indistinguishable from the normal $0 path otherwise.
      console.error("[advisor] model call failed", { status: response.status, reason: "non_200_response" });
      return respond(deterministicReply(), "fallback");
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();

    if (!text) {
      return respond(deterministicReply(), "fallback");
    }

    console.log("[advisor:cost]", {
      surface: "advisor",
      model: "claude-haiku-4-5-20251001",
      input_tokens: data.usage?.input_tokens,
      output_tokens: data.usage?.output_tokens,
      userId: gateUserId,
      tier: entitlements?.tier,
    });

    // Sentinel guardrail: the main Companion surface must not return advice-like
    // or pressure language. If the model reply triggers a Sentinel pattern, fall
    // back to the deterministic persona reply (which is built from the same
    // canonical context) and log the event for review.
    const sentinel = sentinelCheck(text);
    if (sentinel.flagged) {
      console.warn("[advisor] sentinel flagged model reply", {
        userId: gateUserId,
        rules: sentinel.rules_enforced,
      });
      return respond(deterministicReply(), "fallback");
    }

    return respond(text, "model");
  } catch (err) {
    console.error("[advisor] model call failed", {
      status: undefined,
      reason: err instanceof Error ? err.message : String(err),
    });
    return respond(deterministicReply(), "fallback");
  }
}
