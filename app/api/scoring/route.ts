import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import { applySkippedEmotionalReading } from "@/lib/assessment/two-pillar";
import { withVerticalHardStopDisplay } from "@/lib/assessment/vertical-insights";
import {
  activeDecisionTypeSchema,
  assessmentInputsSchema as inputsSchema,
} from "@/lib/validation/assessment";
import { createClient } from "@/lib/supabase/server";
import { phase0RefuseIfFrozen } from "@/lib/advisor/phase0/server";

export const runtime = "nodejs";

/**
 * Server-authoritative score (Plans.md 6.2 / AGENTS scoring guardrail).
 *
 * Returns the full AssessmentResult (pillar sub-factors are public UI output)
 * plus insight strings. Clients must not ship computeScore — they POST inputs
 * here and display the response. Auth-free so the anonymous assessment funnel
 * works; rate-limited by IP.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`scoring:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const scoringBodySchema = inputsSchema.extend({
    decisionType: activeDecisionTypeSchema.optional(),
    emotionalSkipped: z.boolean().optional(),
  });
  const parsed = scoringBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid assessment inputs.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { decisionType, emotionalSkipped, ...inputFields } = parsed.data;
  const inputs: AssessmentInputs = inputFields;

  try {
    const supabase = await createClient();
    const refused = await phase0RefuseIfFrozen(supabase);
    if (refused) return refused;
  } catch {
    // No session infra — guest scoring path.
  }

  const scored = computeScore(inputs);
  const displayed = withVerticalHardStopDisplay(scored, decisionType ?? "home_buying");
  const result = emotionalSkipped
    ? applySkippedEmotionalReading(displayed.result)
    : displayed.result;

  return NextResponse.json({
    score: result.score,
    verdict: result.verdict,
    // Full pillar breakdowns — UI score cards need sub-factors, not totals only.
    financial: result.financial,
    emotional: result.emotional,
    timing: result.timing,
    warnings: result.warnings,
    hardStops: result.hardStops,
    provenance: result.provenance,
    keyInsight: displayed.keyInsight,
    nextSteps: displayed.nextSteps,
  });
}
