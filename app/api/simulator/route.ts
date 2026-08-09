import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import {
  deriveAnchors,
  leversOf,
  rankLevers,
  simulate,
  type AnchorAssessment,
  type SimulatorBaseline,
  type SimulatorLevers,
} from "@/lib/simulator";
import { readinessImpactForHousing } from "@/lib/tools/readiness-bands";
import { runPreflight, type PreflightInput } from "@/lib/readiness/preflight";

export const runtime = "nodejs";

/**
 * Batch simulator (Plans.md 6.4).
 *
 * One call can return baseline + simulated scores, lever ranks, housing
 * readiness band, and/or preflight — so client sliders do not issue a
 * request per tick (would exhaust /api/scoring-style rate limits).
 *
 * Auth-free (anonymous tools + simulator page); rate-limited by IP.
 */

const leversSchema = z.object({
  monthlyIncome: z.number().finite(),
  monthlyExpenses: z.number().finite(),
  liquidSavings: z.number().finite(),
  totalDebt: z.number().finite(),
});

const baselineSchema = leversSchema.extend({
  source: z.enum(["plaid_sync", "manual", "empty"]),
  monthlyDebtPayments: z.number().finite().nullable(),
});

const anchorAssessmentSchema = z
  .object({
    emotional_score: z.number().finite().nullable(),
    timing_score: z.number().finite().nullable(),
    inputs: z.record(z.string(), z.unknown()).nullable(),
  })
  .nullable()
  .optional();

const housingSchema = z
  .object({
    monthlyObligation: z.number().finite(),
    upfrontCost: z.number().finite().optional(),
    replacedRentMonthly: z.number().finite().optional(),
  })
  .nullable()
  .optional();

const includeSchema = z
  .object({
    current: z.boolean().optional(),
    simulated: z.boolean().optional(),
    rank: z.boolean().optional(),
    anchors: z.boolean().optional(),
    housing: housingSchema,
  })
  .optional();

const preflightSchema = z
  .object({
    assessmentResult: z.unknown().optional().nullable(),
    assessmentInputs: z.unknown().optional().nullable(),
    monthlyIncome: z.number().finite().nullable().optional(),
    monthlyExpenses: z.number().finite().nullable().optional(),
    monthlyDebtPayments: z.number().finite().nullable().optional(),
    liquidSavings: z.number().finite().nullable().optional(),
    externalPressure: z.number().finite().nullable().optional(),
    partnerAlignment: z.number().finite().nullable().optional(),
    decisionLabel: z.string().max(120).nullable().optional(),
  })
  .nullable()
  .optional();

const bodySchema = z.object({
  baseline: baselineSchema.optional(),
  anchorAssessment: anchorAssessmentSchema,
  levers: leversSchema.optional(),
  include: includeSchema,
  preflight: preflightSchema,
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  // Higher than /api/scoring: one call covers many engine runs (rank alone
  // can be 5 computeScore passes). Still dampens abuse.
  const { allowed } = await rateLimit(`simulator:${ip}`, { limit: 60, windowMs: 60_000 });
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

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid simulator request.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { baseline, anchorAssessment, levers, include, preflight } = parsed.data;

  if (!baseline && !preflight) {
    return NextResponse.json({ error: "Provide baseline and/or preflight." }, { status: 400 });
  }

  const response: Record<string, unknown> = {};

  if (preflight) {
    response.preflight = runPreflight(preflight as PreflightInput);
  }

  if (baseline) {
    const base = baseline as SimulatorBaseline;
    const anchors = deriveAnchors((anchorAssessment ?? null) as AnchorAssessment | null);
    const want = {
      current: include?.current ?? true,
      simulated: include?.simulated ?? Boolean(levers),
      rank: include?.rank ?? Boolean(levers),
      anchors: include?.anchors ?? true,
      housing: include?.housing ?? null,
    };

    const activeLevers: SimulatorLevers = levers ?? leversOf(base);

    if (want.anchors !== false) {
      response.anchors = {
        emotionalScore: anchors.emotionalScore,
        timingScore: anchors.timingScore,
        neutral: anchors.neutral,
      };
    }

    if (want.current !== false) {
      response.current = simulate(leversOf(base), base, anchors);
    }

    if (want.simulated) {
      response.simulated = simulate(activeLevers, base, anchors);
    }

    if (want.rank) {
      response.impacts = rankLevers(activeLevers, base, anchors);
    }

    if (want.housing) {
      response.housing = readinessImpactForHousing(base, anchors, want.housing);
    }
  }

  return NextResponse.json(response);
}
