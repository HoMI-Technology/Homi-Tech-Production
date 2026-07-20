import { NextResponse } from "next/server";
import { z } from "zod";
import { computeScore, PILLAR_MAX_POINTS } from "@/lib/scoring";
import { assessmentInputsSchema } from "@/lib/validation/assessment";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * POST /api/shadow-shares — mint an anonymous share card (migration 00021).
 *
 * The anonymous top-of-funnel previously dead-ended at /results; this gives it
 * a shareable exit. Canon holds: the client sends raw INPUTS, never a score —
 * the engine recomputes server-side, so a card can never carry a forged
 * number. The stored row holds derived values only (score/verdict/pillar
 * percentages), never the inputs themselves, so a leaked token can never
 * expose self-reported financials.
 *
 * reveal_score defaults to false: the public card is a "journey card" (pillar
 * shape + direction). Unflattering numbers forced onto share cards are
 * anti-viral and anti-user; the number renders only when the creator opted in.
 */

const bodySchema = z.object({
  inputs: assessmentInputsSchema,
  revealScore: z.boolean().optional().default(false),
});

function toPct(total: number, max: number): number {
  return Math.max(0, Math.min(100, Math.round((total / max) * 100)));
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`shadow-share:${ip}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many share links created. Try again in an hour." },
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
    return NextResponse.json({ error: "Invalid share payload." }, { status: 400 });
  }

  const service = createAdminClient();
  if (!service) {
    return NextResponse.json(
      { error: "Sharing is not available right now." },
      { status: 503 },
    );
  }

  const result = computeScore(parsed.data.inputs);

  const { data, error } = await service
    .from("shadow_shares")
    .insert({
      score: result.score,
      verdict: result.verdict,
      financial_pct: toPct(result.financial.total, PILLAR_MAX_POINTS.financial),
      emotional_pct: toPct(result.emotional.total, PILLAR_MAX_POINTS.emotional),
      timing_pct: toPct(result.timing.total, PILLAR_MAX_POINTS.timing),
      reveal_score: parsed.data.revealScore,
    })
    .select("token")
    .single();

  if (error || !data?.token) {
    const correlationId = crypto.randomUUID();
    console.error(`[shadow-shares:${correlationId}]`, error?.code, error?.message);
    return NextResponse.json(
      { error: "Could not create the share link right now.", correlationId },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    token: data.token,
    url: `${env.NEXT_PUBLIC_SITE_URL}/shadow/${data.token}`,
  });
}
