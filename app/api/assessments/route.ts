import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeScore, generateKeyInsight, generateNextSteps } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";

const assessmentInputsSchema = z.object({
  debtToIncomeRatio: z.number().min(0).max(5),
  downPaymentPercent: z.number().min(0).max(2),
  emergencyFundMonths: z.number().min(0).max(600),
  creditScore: z.number().min(0).max(900),
  lifeStability: z.number().min(1).max(10),
  confidenceLevel: z.number().min(1).max(10),
  partnerAlignment: z.number().min(1).max(10).nullable(),
  fomoLevel: z.number().min(1).max(10),
  timeHorizonMonths: z.number().min(0).max(1200),
  savingsRate: z.number().min(0).max(2),
  downPaymentProgress: z.number().min(0).max(2),
  monthlyHousingRatio: z.number().min(0).max(5).optional(),
});

const bodySchema = z.object({
  inputs: assessmentInputsSchema,
  kind: z.enum(["full", "shadow"]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assessment payload" }, { status: 400 });
    }
    const { inputs, kind } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ saved: false }, { status: 401 });
    }

    // Never trust client-computed scores — recompute server-side.
    const result = computeScore(inputs);

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        decision_type: "home_buying",
        status: "completed",
        financial_score: result.financial.total,
        emotional_score: result.emotional.total,
        timing_score: result.timing.total,
        overall_score: result.score,
        verdict: result.verdict,
        inputs,
        sub_scores: {
          financial: result.financial,
          emotional: result.emotional,
          timing: result.timing,
        },
        insights: {
          keyInsight: generateKeyInsight(result),
          nextSteps: generateNextSteps(result),
        },
        hard_stops: result.hardStops,
        is_shadow: kind === "shadow",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved: true, id: data.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assessments: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
