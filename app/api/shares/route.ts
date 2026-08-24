import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { nextTierWithMore, getUserEntitlements, type Entitlements } from "@/lib/entitlements";
import { rateLimit, getClientIp } from "@/lib/ratelimit";
import { TIERS } from "@/lib/stripe/tiers";

export const runtime = "nodejs";

/**
 * The share-cap 402 sentence. One builder for both call sites — the pre-insert gate
 * and the post-insert race rollback — because the two hand-written copies drifted:
 * one was corrected and the other kept telling users to "upgrade for more."
 *
 * Only offers an upgrade when a higher tier actually raises the cap. Pro and family
 * both allow 100 active links, so that phrasing bought a pro user nothing and was
 * simply false at the top of the ladder.
 */
function shareLimitMessage(entitlements: Entitlements): string {
  const cap = entitlements.maxActiveShares;
  const more = nextTierWithMore(entitlements.tier, (e) => e.maxActiveShares);
  return more
    ? `Your plan allows ${cap} active share links. Revoke one, or move to ${TIERS[more].name} for more.`
    : `Your plan allows ${cap} active share links. Revoke one to create another.`;
}


const bodySchema = z.object({
  assessmentId: z.string().min(1),
});

/** POST /api/shares — creates a 30-day score-share link for one of the current user's assessments. */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`shares-write:${ip}`, { limit: 15, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a moment." },
      { status: 429 },
    );
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
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "assessmentId is required." }, { status: 400 });
  }

  const { assessmentId } = parsed.data;

  // Ownership check — the fix for the cross-tenant share IDOR (AUDIT T1.1).
  // Without this, any authenticated user could mint a public share link for
  // *any* assessment UUID and leak another user's scores. Mirrors the proven
  // pattern in app/api/assessments/override/route.ts (the ownership select
  // before any mutation). RLS (00011) enforces the same rule in the database
  // as defense-in-depth, but the API is the first and clearest line.
  const { data: owned, error: ownershipError } = await supabase
    .from("assessments")
    .select("id")
    .eq("id", assessmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (ownershipError || !owned) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  const { entitlements } = await getUserEntitlements(supabase);

  const { count: activeCount } = await supabase
    .from("score_shares")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if ((activeCount ?? 0) >= entitlements.maxActiveShares) {
    return NextResponse.json(
      { error: shareLimitMessage(entitlements), code: "share_limit" },
      { status: 402 },
    );
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("score_shares")
    .insert({
      assessment_id: assessmentId,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create a share link." }, { status: 500 });
  }

  // Compensating re-check: the pre-insert count above is not atomic with the
  // insert, so two concurrent requests can both pass the gate. Re-count after
  // inserting and roll back the overflow row instead of exceeding the plan cap.
  const { count: afterCount } = await supabase
    .from("score_shares")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if ((afterCount ?? 0) > entitlements.maxActiveShares) {
    await supabase.from("score_shares").delete().eq("id", data.id).eq("created_by", user.id);
    return NextResponse.json(
      { error: shareLimitMessage(entitlements), code: "share_limit" },
      { status: 402 },
    );
  }

  return NextResponse.json({ url: `${env.NEXT_PUBLIC_SITE_URL}/share/${data.share_token}` });
}
