import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getEntitlements } from "@/lib/entitlements";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(20).max(80),
  displayName: z.string().trim().min(1).max(40).optional(),
});

/** POST — accept invite and join household as partner */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-accept:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
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
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid invite token." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "Leave or stay — you already have a household." },
      { status: 409 },
    );
  }

  const { data: invite } = await supabase
    .from("household_invites")
    .select("id, household_id, status, expires_at, email, invited_by")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "Invite not found or not pending." }, { status: 404 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "Your account has no email address." }, { status: 403 });
  }
  if (invite.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return NextResponse.json(
      { error: "Invite was sent to a different email address." },
      { status: 403 },
    );
  }

  // CL-08: seat cap at accept time from owner's plan (not the invitee's).
  let seatLimit = 1;
  const admin = createAdminClient();
  if (admin && invite.invited_by) {
    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("subscription_tier")
      .eq("id", invite.invited_by)
      .maybeSingle();
    const ownerEnt = getEntitlements(ownerProfile?.subscription_tier as string | null);
    if (!ownerEnt.householdMode) {
      return NextResponse.json(
        {
          error: "This household's owner no longer has Family household access.",
          code: "household_locked",
        },
        { status: 402 },
      );
    }
    seatLimit = ownerEnt.familySeats;
  }

  const { count: memberCount } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", invite.household_id);

  if ((memberCount ?? 0) >= seatLimit) {
    return NextResponse.json(
      {
        error: "This household is full for the owner's plan.",
        code: "family_seats_full",
      },
      { status: 402 },
    );
  }

  const { error: joinErr } = await supabase.from("household_members").insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: "partner",
    display_name: parsed.data.displayName ?? "Partner B",
  });
  if (joinErr) {
    return NextResponse.json({ error: "Could not join household." }, { status: 500 });
  }

  await supabase.from("household_invites").update({ status: "accepted" }).eq("id", invite.id);

  return NextResponse.json({ ok: true, household_id: invite.household_id });
}
