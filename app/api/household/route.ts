import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { startRequest } from "@/lib/observe/http";

export const runtime = "nodejs";

const INFRA = new Set(["42P01", "PGRST205"]);

/** GET — current user's household + members */
export async function GET(request: Request) {
  const { json } = startRequest(request, "GET /api/household");
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-get:${ip}`, {
    limit: 30,
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

  const { data: membership, error: mErr } = await supabase
    .from("household_members")
    .select("household_id, role, display_name, last_score, last_verdict, last_assessment_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (mErr) {
    if (mErr.code && INFRA.has(mErr.code)) {
      return json({ household: null, members: [], configured: false });
    }
    return json(
      { error: "Could not load household." },
      { status: 500, event: "household_load_failed" },
    );
  }

  if (!membership) {
    return json({ household: null, members: [], configured: true });
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

  return json({
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
  const { json } = startRequest(request, "POST /api/household");
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`household-post:${ip}`, {
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: "Invalid body." },
      { status: 400, event: "household_create_invalid" },
    );
  }

  const { data: existing } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return json(
      { error: "You already belong to a household." },
      { status: 409, event: "household_create_conflict" },
    );
  }

  const name = parsed.data.name ?? "Our household";
  const { data: hh, error: hhErr } = await supabase
    .from("households")
    .insert({ name, created_by: user.id })
    .select("id, name, created_by, created_at")
    .single();

  if (hhErr || !hh) {
    if (hhErr?.code && INFRA.has(hhErr.code)) {
      return json(
        { error: "Household tables not migrated yet." },
        { status: 503, event: "household_not_migrated" },
      );
    }
    return json(
      { error: "Could not create household." },
      { status: 500, event: "household_create_failed" },
    );
  }

  const { error: memErr } = await supabase.from("household_members").insert({
    household_id: hh.id,
    user_id: user.id,
    role: "owner",
    display_name: parsed.data.displayName ?? "Partner A",
  });

  if (memErr) {
    return json(
      { error: "Could not join household." },
      { status: 500, event: "household_owner_seat_failed" },
    );
  }

  return json(
    { household: hh, ok: true },
    { event: "household_created" },
  );
}
