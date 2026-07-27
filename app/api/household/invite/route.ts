import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().max(200),
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

  return NextResponse.json({
    ok: true,
    invite: {
      email: invite.email,
      token: invite.token,
      expires_at: invite.expires_at,
      acceptPath: `/household?invite=${invite.token}`,
    },
  });
}
