import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/env";
import { getUserEntitlements } from "@/lib/entitlements";
import { startRequest } from "@/lib/observe/http";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  sendEmail: z.boolean().optional(),
});

/** POST — create invite token for partner email */
export async function POST(request: Request) {
  const { json } = startRequest(request, "POST /api/household/invite");
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-invite:${ip}`, {
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
      { status: 400, event: "household_invite_invalid" },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Valid email required." },
      { status: 400, event: "household_invite_invalid" },
    );
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return json(
      { error: "Only the household owner can invite." },
      { status: 403, event: "household_invite_forbidden" },
    );
  }

  // CL-08: server-side seat cap from entitlements (Family = 5; lower tiers = 1).
  const { entitlements } = await getUserEntitlements(supabase);
  if (!entitlements.householdMode) {
    return json(
      {
        error: "Household invites are part of HōMI Family. Upgrade to invite members.",
        code: "household_locked",
      },
      { status: 402, event: "household_invite_failed", code: "household_locked" },
    );
  }

  const { count: memberCount } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", membership.household_id);

  const { count: pendingCount } = await supabase
    .from("household_invites")
    .select("id", { count: "exact", head: true })
    .eq("household_id", membership.household_id)
    .eq("status", "pending");

  const seatsUsed = (memberCount ?? 0) + (pendingCount ?? 0);
  if (seatsUsed >= entitlements.familySeats) {
    return json(
      {
        error: `This household is at the ${entitlements.familySeats}-seat limit for your plan.`,
        code: "family_seats_full",
        familySeats: entitlements.familySeats,
        seatsUsed,
      },
      { status: 402, event: "household_invite_failed", code: "family_seats_full" },
    );
  }

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

  const { data: invite, error } = await supabase
    .from("household_invites")
    .insert({
      household_id: membership.household_id,
      invited_by: user.id,
      email: parsed.data.email.toLowerCase(),
      token,
      status: "pending",
    })
    .select("id, email, token, expires_at, status")
    .single();

  if (error || !invite) {
    return json(
      { error: "Could not create invite." },
      { status: 500, event: "household_invite_failed" },
    );
  }

  const acceptPath = `/household?invite=${invite.token}`;
  const acceptUrl = `${env.NEXT_PUBLIC_SITE_URL}${acceptPath}`;
  let emailSent: boolean | "unconfigured" | "error" = false;

  if (parsed.data.sendEmail !== false) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      emailSent = "unconfigured";
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "HōMI <hello@homitechnology.com>",
            to: invite.email,
            subject: "You're invited to a HōMI household",
            html: `<p>You've been invited to share Decision Readiness as a household on HōMI.</p>
<p><a href="${acceptUrl}">Accept invite</a></p>
<p>This is educational readiness — not joint credit or a loan decision.</p>
<p>Link expires: ${invite.expires_at}</p>`,
          }),
        });
        emailSent = res.ok ? true : "error";
      } catch {
        emailSent = "error";
      }
    }
  }

  return json(
    {
      ok: true,
      emailSent,
      invite: {
        email: invite.email,
        token: invite.token,
        expires_at: invite.expires_at,
        acceptPath,
        acceptUrl,
      },
    },
    { event: "household_invite_created" },
  );
}
