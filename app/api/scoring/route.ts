import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { computeScore, generateKeyInsight, generateNextSteps, type AssessmentInputs } from "@/lib/scoring";

export const runtime = "nodejs";

const inputsSchema = z.object({
  debtToIncomeRatio: z.number().min(0).max(1),
  downPaymentPercent: z.number().min(0).max(1),
  emergencyFundMonths: z.number().min(0).max(120),
  creditScore: z.number().min(300).max(850),

  lifeStability: z.number().min(1).max(10),
  confidenceLevel: z.number().min(1).max(10),
  partnerAlignment: z.number().min(1).max(10).nullable(),
  fomoLevel: z.number().min(1).max(10),

  timeHorizonMonths: z.number().min(0).max(600),
  savingsRate: z.number().min(0).max(1),
  downPaymentProgress: z.number().min(0).max(1),

  monthlyHousingRatio: z.number().min(0).max(2).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = rateLimit(`scoring:${ip}`, { limit: 30, windowMs: 60_000 });
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
