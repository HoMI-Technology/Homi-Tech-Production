import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/entitlements";

/** GET /api/account/entitlements — current user's capability set (read-only). */
export async function GET() {
  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  return NextResponse.json({ entitlements });
}
