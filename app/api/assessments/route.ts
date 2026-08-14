import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { computeScore, generateKeyInsight, generateNextSteps } from "@/lib/scoring";
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

const bodySchema = z.object({
  inputs: assessmentInputsSchema,
  kind: z.enum(["full", "shadow"]),
  // Optional for older clients / the home-only shadow flow; absent means home_buying.
  decisionType: activeDecisionTypeSchema.optional(),
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
    const { inputs, kind, decisionType } = parsed.data;
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

    const { entitlements } = await getUserEntitlements(supabase);

    // Free tier gets one completed full assessment; Plus+ gets unlimited re-scoring.
    if (kind === "full" && !entitlements.unlimitedRescoring) {
      const { count } = await supabase
        .from("assessments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_shadow", false)
        .eq("status", "completed");

      if ((count ?? 0) >= 1) {
        return NextResponse.json(
          {
            error:
              "Your free plan includes one full assessment. Upgrade to re-score as your numbers change.",
            code: "rescoring_locked",
          },
          { status: 402 },
        );
      }
    }

    // Never trust client-computed scores — recompute server-side.
    const result = computeScore(inputs);

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

    const { data, error } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        ...(attribution ? { attribution } : {}),
        ...(referralSource ? { referral_source: referralSource } : {}),
        decision_type: decisionType ?? "home_buying",
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
        is_shadow: isShadowRead,
        completed_at: new Date().toISOString(),
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
        .eq("status", "completed");
      if ((afterCount ?? 0) > 1) {
        await supabase.from("assessments").delete().eq("id", data.id).eq("user_id", user.id);
        return NextResponse.json(
          {
            error:
              "Your free plan includes one full assessment. Upgrade to re-score as your numbers change.",
            code: "rescoring_locked",
          },
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
