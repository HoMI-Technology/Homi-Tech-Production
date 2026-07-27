import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
  sendEmail: z.boolean().optional(),
});

/** POST — create invite token for partner email */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-invite:${ip}`, {
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
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json(
      { error: "Only the household owner can invite." },
      { status: 403 },
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
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
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

  return NextResponse.json({
    ok: true,
    emailSent,
    invite: {
      email: invite.email,
      token: invite.token,
      expires_at: invite.expires_at,
      acceptPath,
      acceptUrl,
    },
  });
}
