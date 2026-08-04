import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";
import { AGENTS, type AgentId } from "@/lib/agents/registry";
import type { FinanceInsightRow } from "@/types/database";
import type { FinanceInsight } from "@/components/finance/AgentInsightsPanel";

export const runtime = "nodejs";

const AGENT_IDS = AGENTS.map((a) => a.id) as [AgentId, ...AgentId[]];

const INSIGHT_TYPES = ["signal", "nudge", "goal-suggestion", "step"] as const;

const SEVERITIES = ["emerald", "yellow", "amber", "crimson"] as const;

const createSchema = z.object({
  agentId: z.enum(AGENT_IDS),
  type: z.enum(INSIGHT_TYPES),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1000),
  severity: z.enum(SEVERITIES).optional(),
  action: z
    .object({
      label: z.string().trim().min(1).max(120),
      href: z.string().trim().min(1).max(240),
    })
    .optional(),
});

const dismissSchema = z.object({
  id: z.string().uuid(),
});

function serverError(scope: string, message: string) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-insights:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not process insights right now.", correlationId },
    { status: 500 },
  );
}

function rowToInsight(row: FinanceInsightRow): FinanceInsight {
  return {
    id: row.id,
    agentId: row.agent_id as AgentId,
    type: row.type as FinanceInsight["type"],
    title: row.title,
    body: row.body,
    severity: row.severity ?? undefined,
    action:
      row.action_label && row.action_href
        ? { label: row.action_label, href: row.action_href }
        : undefined,
  };
}

/** GET /api/finance/insights — non-dismissed insights for the caller. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-insights-read:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("finance_insights")
    .select(
      "id, user_id, agent_id, type, title, body, severity, action_label, action_href, dismissed_at, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ insights: [], deferred: true });
    }
    return serverError("get", error.message);
  }

  const insights = ((data ?? []) as FinanceInsightRow[]).map(rowToInsight);
  return NextResponse.json({ insights });
}

/** POST /api/finance/insights — create an insight for the caller. */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-insights-write:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid insight.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("finance_insights")
    .insert({
      user_id: user.id,
      agent_id: input.agentId,
      type: input.type,
      title: input.title,
      body: input.body,
      severity: input.severity ?? null,
      action_label: input.action?.label ?? null,
      action_href: input.action?.href ?? null,
    })
    .select(
      "id, user_id, agent_id, type, title, body, severity, action_label, action_href, dismissed_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    if (error?.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ deferred: true, insight: null }, { status: 202 });
    }
    return serverError("create", error?.message ?? "insert returned no row");
  }

  return NextResponse.json({ insight: rowToInsight(data as FinanceInsightRow) }, { status: 201 });
}

/** PATCH /api/finance/insights — dismiss an insight by id. */
export async function PATCH(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-insights-write:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = dismissSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Insight id is required." }, { status: 400 });
  }

  const { id } = parsed.data;

  const { data, error } = await supabase
    .from("finance_insights")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, agent_id, type, title, body, severity, action_label, action_href, dismissed_at, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    if (error?.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ deferred: true, insight: null });
    }
    return serverError("dismiss", error?.message ?? "dismiss returned no row");
  }

  return NextResponse.json({ insight: rowToInsight(data as FinanceInsightRow) });
}
