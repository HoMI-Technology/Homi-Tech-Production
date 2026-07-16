import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { computeScore, generateKeyInsight, generateNextSteps, type AssessmentInputs } from "@/lib/scoring";
import { assessmentInputsSchema as inputsSchema } from "@/lib/validation/assessment";

export const runtime = "nodejs";

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
    return NextResponse.json({ error: "Invalid assessment inputs.", issues: parsed.error.issues }, { status: 400 });
  }

  const inputs: AssessmentInputs = parsed.data;
  const result = computeScore(inputs);
  const keyInsight = generateKeyInsight(result);
  const nextSteps = generateNextSteps(result);

  return NextResponse.json({
    score: result.score,
    verdict: result.verdict,
    financial: { total: result.financial.total },
    emotional: { total: result.emotional.total },
    timing: { total: result.timing.total },
    warnings: result.warnings,
    hardStops: result.hardStops,
    keyInsight,
    nextSteps,
  });
}
