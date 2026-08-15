import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadPhase0ServerState } from "@/lib/advisor/phase0/server";

/**
 * GET /api/assessments/latest
 *
 * Returns the signed-in user's most recent completed assessment row, or
 * `{ assessment: null }` when anonymous, on any error, or when the user has
 * no completed full assessment yet. Shadow rows are excluded — they are not
 * a HōMI-Score. Always 200 — this endpoint is a best-effort fallback source
 * for /results and /plan, never a hard dependency, so it fails safe rather
 * than surfacing errors the client would have to branch on.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ assessment: null });
    }

    const freeze = await loadPhase0ServerState(supabase, user.id);
    if (freeze.frozen) {
      return NextResponse.json({
        assessment: null,
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
      .eq("status", "completed")
      .eq("is_shadow", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ assessment: null });
    }

    return NextResponse.json({ assessment: data ?? null });
  } catch {
    return NextResponse.json({ assessment: null });
  }
}
