import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { getEntitlements } from "@/lib/entitlements";
import { startRequest } from "@/lib/observe/http";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(20).max(80),
  displayName: z.string().trim().min(1).max(40).optional(),
});

/** POST — accept invite and join household as partner */
export async function POST(request: Request) {
  const { json } = startRequest(request, "POST /api/household/accept");
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-accept:${ip}`, {
    limit: 10,
    windowMs: 60_000,
  });
  if (!allowed) {
    return json(
      { error: "Too many requests." },
      { status: 429, event: "household_rate_limited" },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return json(
      { error: "Not authenticated." },
      { status: 401, event: "household_auth_rejected" },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Invalid body." },
      { status: 400, event: "household_accept_invalid" },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid invite token." },
      { status: 400, event: "household_accept_invalid" },
    );
  }

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return json(
      { error: "Leave or stay — you already have a household." },
      { status: 409, event: "household_accept_conflict" },
    );
  }

  const { data: invite } = await supabase
    .from("household_invites")
    .select("id, household_id, status, expires_at, email, invited_by")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return json(
      { error: "Invite not found or not pending." },
      { status: 404, event: "household_accept_missing" },
    );
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return json(
      { error: "Invite expired." },
      { status: 410, event: "household_accept_expired" },
    );
  }
  if (!user.email) {
    return json(
      { error: "Your account has no email address." },
      { status: 403, event: "household_accept_forbidden" },
    );
  }
  if (invite.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    return json(
      { error: "Invite was sent to a different email address." },
      { status: 403, event: "household_accept_forbidden" },
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
      return json(
        {
          error: "This household's owner no longer has Family household access.",
          code: "household_locked",
        },
        { status: 402, event: "household_accept_failed", code: "household_locked" },
      );
    }
    seatLimit = ownerEnt.familySeats;
  }

  const { count: memberCount } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", invite.household_id);

  if ((memberCount ?? 0) >= seatLimit) {
    return json(
      {
        error: "This household is full for the owner's plan.",
        code: "family_seats_full",
      },
      { status: 402, event: "household_accept_failed", code: "family_seats_full" },
    );
  }

  const { error: joinErr } = await supabase.from("household_members").insert({
    household_id: invite.household_id,
    user_id: user.id,
    role: "partner",
    display_name: parsed.data.displayName ?? "Partner B",
  });
  if (joinErr) {
    return json(
      { error: "Could not join household." },
      { status: 500, event: "household_accept_failed" },
    );
  }

  await supabase.from("household_invites").update({ status: "accepted" }).eq("id", invite.id);

  return json(
    { ok: true, household_id: invite.household_id },
    { event: "household_accepted" },
  );
}
