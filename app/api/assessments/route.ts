import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { computeScore } from "@/lib/scoring/engine";
import { applySkippedEmotionalReading } from "@/lib/assessment/two-pillar";
import { withVerticalHardStopDisplay } from "@/lib/assessment/vertical-insights";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeDecisionTypeSchema, assessmentInputsSchema } from "@/lib/validation/assessment";
import { getUserEntitlements } from "@/lib/entitlements";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import {
  isPartnerInviteRef,
  readAttributionCookie,
  resolvePartnerReferralSource,
} from "@/lib/attribution";
import { sendLifecycleEmail } from "@/lib/email/send";
import { verdictEmail } from "@/lib/email/templates";
import { captureServerEvent } from "@/lib/analytics/server";
import { isShadowAssessmentKind } from "@/lib/assessment/storage";
import {
  FREE_TIER_LOCKED_CODE,
  FREE_TIER_LOCKED_MESSAGE,
  freeTierOverflowAfterInsert,
  freeTierQuotaExceeded,
} from "@/lib/assessment/free-tier-quota";
import { loadPhase0ServerState, phase0RefuseIfFrozen } from "@/lib/advisor/phase0/server";
import {
  buildCheckpointSurveyRows,
  buildDecisionSnapshot,
} from "@/lib/outcomes/decision-snapshot";
import { baselineInsertRow } from "@/lib/outcomes/baseline";
import { SCORING_SCHEMA_ID } from "@/lib/outcomes/evidence-version";
import { assertSameUserLineage } from "@/lib/outcomes/lineage";

const bodySchema = z.object({
  inputs: assessmentInputsSchema,
  kind: z.enum(["full", "shadow"]),
  // Optional for older clients / the home-only shadow flow; absent means home_buying.
  decisionType: activeDecisionTypeSchema.optional(),
  previousAssessmentId: z.string().uuid().optional(),
  reassessmentReason: z.string().max(80).optional(),
  /** Option 1: omit Emotional Truth. Not partner solo. Not credit skip. */
  emotionalSkipped: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed } = await rateLimit(`assessments-write:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again in a moment." },
        { status: 429 },
      );
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid assessment payload" }, { status: 400 });
    }
    const { inputs, kind, decisionType, previousAssessmentId, reassessmentReason, emotionalSkipped } =
      parsed.data;
    // Compare on a raw string before any union narrowing (TS2367).
    const isShadowRead = isShadowAssessmentKind(String(kind));

    // Packet B: a shadow read is not an assessment. Do not score or persist it.
    if (isShadowRead) {
      return NextResponse.json(
        { error: "Shadow reads are not assessments.", saved: false },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ saved: false }, { status: 401 });
    }

    const refused = await phase0RefuseIfFrozen(supabase);
    if (refused) return refused;

    const { entitlements } = await getUserEntitlements(supabase);
    const resolvedDecisionType = decisionType ?? "home_buying";

    // D10: free tier gets one completed assessment per vertical; Plus+ unlimited.
    if (kind === "full" && !entitlements.unlimitedRescoring) {
      const { count } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_shadow", false)
        .eq("status", "completed")
        .eq("decision_type", resolvedDecisionType);

      if (
        freeTierQuotaExceeded({
          unlimitedRescoring: false,
          completedCountForVertical: count ?? 0,
        })
      ) {
        return NextResponse.json(
          { error: FREE_TIER_LOCKED_MESSAGE, code: FREE_TIER_LOCKED_CODE },
          { status: 402 },
        );
      }
    }

    // Never trust client-computed scores — recompute server-side.
    const scored = computeScore(inputs);
    const displayed = withVerticalHardStopDisplay(scored, resolvedDecisionType);
    const result = emotionalSkipped
      ? applySkippedEmotionalReading(displayed.result)
      : displayed.result;

    // First-touch acquisition snapshot (occurrence data only).
    const attribution = readAttributionCookie(req.headers.get("cookie"));

    // Denormalize partner invite ref → assessments.referral_source so partner
    // dashboard KPIs match portal RPC stats (attribution.ref = ptr_…).
    // Does NOT set profiles.partner_id (named roster is explicit, not invite traffic).
    let referralSource: string | null = null;
    if (attribution?.ref && isPartnerInviteRef(attribution.ref)) {
      try {
        const admin = createAdminClient();
        const db = admin ?? supabase;
        const { data: codeRow } = await db
          .from("partner_codes")
          .select("code, partner_user_id")
          .eq("code", attribution.ref)
          .maybeSingle();
        if (codeRow?.partner_user_id && codeRow?.code) {
          const map = new Map<string, string>([
            [String(codeRow.code).toLowerCase(), String(codeRow.partner_user_id)],
            [String(codeRow.code), String(codeRow.partner_user_id)],
          ]);
          referralSource = resolvePartnerReferralSource(attribution, map);
        }
      } catch {
        referralSource = null;
      }
    }

    const assessmentId = crypto.randomUUID();
    let lineage: { previous_assessment_id: string; reassessment_reason: string | null } | null =
      null;
    if (previousAssessmentId) {
      const { data: prior } = await supabase
        .from("assessments")
        .select("id, user_id")
        .eq("id", previousAssessmentId)
        .eq("user_id", user.id)
        .maybeSingle();
      const rejection = assertSameUserLineage(user.id, prior, assessmentId);
      if (rejection) {
        return NextResponse.json({ error: "Invalid reassessment link." }, { status: 400 });
      }
      lineage = {
        previous_assessment_id: previousAssessmentId,
        reassessment_reason: reassessmentReason?.trim() || null,
      };
    }

    const completedAt = new Date().toISOString();
    const decisionSnapshot = buildDecisionSnapshot({
      decisionId: assessmentId,
      score: result.score,
      verdict: result.verdict,
      hardStops: result.hardStops,
      provenance: result.provenance ?? {
        dti: "self_report",
        downPayment: "self_report",
        runway: "self_report",
        credit: "none",
        lookbackDays: null,
      },
      selfReportedCreditBand: inputs.selfReportedCreditBand ?? null,
      timestamp: completedAt,
    });

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        id: assessmentId,
        user_id: user.id,
        ...(attribution ? { attribution } : {}),
        ...(referralSource ? { referral_source: referralSource } : {}),
        decision_type: resolvedDecisionType,
        status: "completed",
        financial_score: result.financial.total,
        emotional_score: emotionalSkipped ? null : result.emotional.total,
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
          keyInsight: displayed.keyInsight,
          nextSteps: displayed.nextSteps,
          provenance: result.provenance,
          decisionSnapshot,
        },
        hard_stops: result.hardStops,
        is_shadow: isShadowRead,
        completed_at: completedAt,
        scoring_schema_id: SCORING_SCHEMA_ID,
        ...(lineage ?? {}),
      })
      .select("id")
      .single();

    // Compensating re-check for the free-tier gate above: the pre-insert count
    // is not atomic with the insert, so two concurrent completions can both
    // pass. Re-count and roll back the overflow row instead of storing it.
    if (data && kind === "full" && !entitlements.unlimitedRescoring) {
      const { count: afterCount } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_shadow", false)
        .eq("status", "completed")
        .eq("decision_type", resolvedDecisionType);
      if (
        freeTierOverflowAfterInsert({
          unlimitedRescoring: false,
          completedCountForVertical: afterCount ?? 0,
        })
      ) {
        await supabase.from("assessments").delete().eq("id", data.id).eq("user_id", user.id);
        return NextResponse.json(
          { error: FREE_TIER_LOCKED_MESSAGE, code: FREE_TIER_LOCKED_CODE },
          { status: 402 },
        );
      }
    }

    if (error) {
      const correlationId = crypto.randomUUID();
      console.error(`[assessments:POST:${correlationId}]`, error);
      return NextResponse.json(
        { error: "Could not save the assessment right now.", correlationId },
        { status: 500 },
      );
    }

    // Evidence Engine: snapshot is on insights. Baseline + 30/90/365 rows are
    // additive. Failure here must not roll back the assessment (retry would
    // create a second full row on the free tier).
    const { error: baselineError } = await supabase.from("assessment_outcome_baselines").insert(
      baselineInsertRow({
        assessmentId,
        userId: user.id,
        capturedAt: completedAt,
        fields: {
          emergencyFundMonths: inputs.emergencyFundMonths,
          confidenceLevel: inputs.confidenceLevel,
        },
      }),
    );
    if (baselineError) {
      console.error("[assessments] baseline capture failed:", baselineError);
    }

    const { error: surveyError } = await supabase.from("outcome_surveys").insert(
      buildCheckpointSurveyRows({
        userId: user.id,
        assessmentId,
        completedAt,
      }),
    );
    if (surveyError) {
      console.error("[assessments] checkpoint schedule failed:", surveyError);
    }

    // Post-response: verdict email (deduped per assessment) + server-side
    // funnel capture. Neither may add latency or failure modes to the save.
    const userId = user.id;
    const userEmail = user.email ?? null;
    const verdict = result.verdict;
    const score = result.score;
    after(async () => {
      try {
        captureServerEvent("assessment_completed", userId, { kind, verdict });
        if (kind !== "full" || !userEmail) return;
        const service = createAdminClient();
        if (!service) return;
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

    const freeze = await loadPhase0ServerState(supabase, user.id);
    if (freeze.frozen) {
      return NextResponse.json({
        assessments: [],
        phase0: freeze.record
          ? {
              frozen: true,
              until: freeze.record.until,
              financialStress: freeze.record.financialStress,
              selfHarm: freeze.record.selfHarm,
            }
          : { frozen: true },
      });
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
