import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

export const runtime = "nodejs";

async function requireAdmin(): Promise<{ user: User } | { response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  return { user };
}

const upsertSchema = z.object({
  day_key: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.string().trim().max(20).default("morning"),
  title: z.string().trim().max(200).default(""),
  body: z.string().trim().max(8000).default(""),
  platform: z.string().trim().max(40).optional().nullable(),
  campaign: z.string().trim().max(80).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_calendar_entries")
    .select("*")
    .order("day_key", { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: "List failed." }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const supabase = await createClient();
  const row = {
    ...parsed.data,
    user_id: gate.user.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("marketing_calendar_entries")
    .upsert(row, { onConflict: "day_key,slot" })
    .select("*")
    .single();
  if (error) {
    console.error("[marketing-calendar]", error);
    return NextResponse.json({ error: "Upsert failed." }, { status: 500 });
  }
  return NextResponse.json({ entry: data });
}
