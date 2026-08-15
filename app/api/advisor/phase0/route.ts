import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { detectAcuteDistress } from "@/lib/advisor/crisis";
import { PHASE0_SIGNAL_IDS } from "@/lib/advisor/phase0";
import { ingestPhase0Server, loadPhase0ServerState } from "@/lib/advisor/phase0/server";

export const runtime = "nodejs";

const ingestSchema = z.object({
  texts: z.array(z.string().max(4000)).max(8).optional(),
  named: z.array(z.enum(PHASE0_SIGNAL_IDS)).max(20).optional(),
});

/**
 * Signed-in Phase 0 state. Guest freeze stays on the device.
 * GET reads the server row. POST ingests signals; it can trip a freeze
 * but cannot clear one.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ frozen: false, guest: true });
  }
  const state = await loadPhase0ServerState(supabase, user.id);
  return NextResponse.json({
    frozen: state.frozen,
    guest: false,
    phase0: state.record
      ? {
          frozen: true,
          until: state.record.until,
          financialStress: state.record.financialStress,
          selfHarm: state.record.selfHarm,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required.", code: "auth_required" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = ingestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Phase 0 payload." }, { status: 400 });
  }

  const texts = parsed.data.texts ?? [];
  const result = await ingestPhase0Server(supabase, user.id, {
    texts,
    named: (parsed.data.named ?? []).map((id) => ({ id })),
    selfHarm: texts.some((text) => detectAcuteDistress(text)),
  });

  return NextResponse.json({
    frozen: result.frozen,
    phase0: result.record
      ? {
          frozen: true,
          until: result.record.until,
          financialStress: result.record.financialStress,
          selfHarm: result.record.selfHarm,
        }
      : null,
  });
}
