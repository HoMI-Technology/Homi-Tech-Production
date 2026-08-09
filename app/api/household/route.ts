import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

const INFRA = new Set(["42P01", "PGRST205"]);

/** GET — current user's household + members */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-get:${ip}`, {
    limit: 30,
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

  const { data: membership, error: mErr } = await supabase
    .from("household_members")
    .select("household_id, role, display_name, last_score, last_verdict, last_assessment_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) {
    if (mErr.code && INFRA.has(mErr.code)) {
      return NextResponse.json({ household: null, members: [], configured: false });
    }
    return NextResponse.json({ error: "Could not load household." }, { status: 500 });
  }

  if (!membership) {
    return NextResponse.json({ household: null, members: [], configured: true });
  }

  const { data: household } = await supabase
    .from("households")
    .select("id, name, created_by, created_at")
    .eq("id", membership.household_id)
    .maybeSingle();

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, display_name, last_score, last_verdict, last_assessment_at, joined_at")
    .eq("household_id", membership.household_id);

  return NextResponse.json({
    household,
    members: members ?? [],
    me: membership,
    configured: true,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
});

/** POST — create household and join as owner */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-post:${ip}`, {
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already belong to a household." }, { status: 409 });
  }

  const name = parsed.data.name ?? "Our household";
  const { data: hh, error: hhErr } = await supabase
    .from("households")
    .insert({ name, created_by: user.id })
    .select("id, name, created_by, created_at")
    .single();

  if (hhErr || !hh) {
    if (hhErr?.code && INFRA.has(hhErr.code)) {
      return NextResponse.json({ error: "Household tables not migrated yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not create household." }, { status: 500 });
  }

  const { error: memErr } = await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: user.id,
    role: "owner",
    display_name: parsed.data.displayName ?? "Partner A",
  });

  if (memErr) {
    return NextResponse.json({ error: "Could not join household." }, { status: 500 });
  }

  return NextResponse.json({ household: hh, ok: true });
}
