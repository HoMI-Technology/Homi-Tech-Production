/**
 * /api/tools/scenarios/[id] — delete one of the user's own scenarios.
 * RLS scopes the delete to the owner; a missing row is a truthful 404.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length > 40) {
    return NextResponse.json({ error: "Invalid scenario id." }, { status: 400 });
  }

  const supabase = await createClient();
  const { userId } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("tool_scenarios")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    console.error("[scenarios] delete failed", { reason: error.message });
    return NextResponse.json({ error: "Could not delete the scenario." }, { status: 500 });
  }
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "Scenario not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
