import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import {
  computeScore,
  generateKeyInsight,
  generateNextSteps,
  type AssessmentInputs,
} from "@/lib/scoring";
import { assessmentInputsSchema as inputsSchema } from "@/lib/validation/assessment";
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

  const parsed = inputsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid assessment inputs.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const inputs: AssessmentInputs = parsed.data;

  try {
    const supabase = await createClient();
    const refused = await phase0RefuseIfFrozen(supabase);
    if (refused) return refused;
  } catch {
    // No session infra — guest scoring path.
  }

  const result = computeScore(inputs);
  const keyInsight = generateKeyInsight(result);
  const nextSteps = generateNextSteps(result);

  return NextResponse.json({
    score: result.score,
    verdict: result.verdict,
    // Full pillar breakdowns — UI score cards need sub-factors, not totals only.
    financial: result.financial,
    emotional: result.emotional,
    timing: result.timing,
    warnings: result.warnings,
    hardStops: result.hardStops,
    keyInsight,
    nextSteps,
  });
}
