import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { computeScore, generateKeyInsight, generateNextSteps } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assessmentInputsSchema } from "@/lib/validation/assessment";
import { readAttributionCookie } from "@/lib/attribution";
import { sendLifecycleEmail } from "@/lib/email/send";
import { verdictEmail } from "@/lib/email/templates";
import { captureServerEvent } from "@/lib/analytics/server";

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

    // First-touch acquisition snapshot (occurrence data only — see 00019).
    const attribution = readAttributionCookie(req.headers.get("cookie"));

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        ...(attribution ? { attribution } : {}),
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
      const correlationId = crypto.randomUUID();
      console.error(`[assessments:POST:${correlationId}]`, error);
      return NextResponse.json(
        { error: "Could not save the assessment right now.", correlationId },
        { status: 500 },
      );
    }

    // Post-response: verdict email (deduped per assessment) + server-side
    // funnel capture. Neither may add latency or failure modes to the save.
    const assessmentId = data.id as string;
    const userId = user.id;
    const userEmail = user.email ?? null;
    const verdict = result.verdict;
    const score = result.score;
    after(async () => {
      try {
        captureServerEvent("assessment_completed", userId, { kind, verdict });
        const service = createAdminClient();
        if (!service || !userEmail) return;
        const { data: profile } = await service
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .maybeSingle();
        const name =
          (profile as { full_name?: string | null } | null)?.full_name?.split(" ")[0] || "there";
        await sendLifecycleEmail({
          service,
          dedupeKey: `verdict:${assessmentId}`,
          userId,
          to: userEmail,
          template: "verdict",
          // Verdict delivery is transactional account mail (matches /api/email).
          marketing: false,
          render: () => verdictEmail(name, score, verdict),
        });
      } catch (err) {
        console.error(
          "[assessments] post-save lifecycle failed:",
          err instanceof Error ? err.message : "unknown",
        );
      }
    });

    return NextResponse.json({ saved: true, id: data.id });
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(`[assessments:POST:${correlationId}]`, err);
    return NextResponse.json(
      { error: "Something went wrong saving the assessment.", correlationId },
      { status: 500 },
    );
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
      const correlationId = crypto.randomUUID();
      console.error(`[assessments:GET:${correlationId}]`, error);
      return NextResponse.json(
        { error: "Could not load assessments right now.", correlationId },
        { status: 500 },
      );
    }

    return NextResponse.json({ assessments: data });
  } catch (err) {
    const correlationId = crypto.randomUUID();
    console.error(`[assessments:GET:${correlationId}]`, err);
    return NextResponse.json(
      { error: "Something went wrong loading assessments.", correlationId },
      { status: 500 },
    );
  }
}
