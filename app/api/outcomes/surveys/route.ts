import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import {
  structuredOutcomeResponseSchema,
  outcomeSurveyStructuredPayload,
} from "@/lib/outcomes/structured-response";
import { decisionStateFromLegacyOutcome } from "@/lib/outcomes/decision-state";

export const runtime = "nodejs";

/**
 * POST /api/outcomes/surveys
 * Records a structured checkpoint response. Never writes assessments.score
 * or assessments.verdict.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`outcome-survey:${ip}`, { limit: 20, windowMs: 60_000 });
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = structuredOutcomeResponseSchema
    .extend({ surveyId: z.string().uuid() })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid survey response." }, { status: 400 });
  }

  const { surveyId, ...response } = parsed.data;
  const { data: existing, error: fetchError } = await supabase
    .from("outcome_surveys")
    .select("id, completed_at, user_id")
    .eq("id", surveyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }
  if (existing.completed_at) {
    return NextResponse.json({ error: "This check-in is already recorded." }, { status: 409 });
  }

  const completedAt = new Date().toISOString();
  const decisionState =
    response.decision_state ?? decisionStateFromLegacyOutcome(response.outcome) ?? undefined;
  const payload = outcomeSurveyStructuredPayload(
    { ...response, decision_state: decisionState },
    completedAt,
  );

  const { error: updateError } = await supabase
    .from("outcome_surveys")
    .update(payload)
    .eq("id", surveyId)
    .eq("user_id", user.id);

  if (updateError) {
    const correlationId = crypto.randomUUID();
    console.error(`[outcomes/surveys:${correlationId}]`, updateError);
    return NextResponse.json(
      { error: "Could not save that check-in right now.", correlationId },
      { status: 500 },
    );
  }

  const eventType = response.outcome === "no_answer" ? "declined" : "completed";
  await supabase.from("outcome_survey_events").insert({
    survey_id: surveyId,
    user_id: user.id,
    event_type: eventType,
    channel: "in_app",
  });

  return NextResponse.json({ saved: true });
}
