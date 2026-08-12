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

// Founder week board uses Mon–Sun; ISO dates also accepted for future absolute weeks.
const DAY_KEY = z
  .string()
  .trim()
  .refine(
    (v) =>
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "day_key must be Mon–Sun or YYYY-MM-DD" },
  );

const upsertSchema = z.object({
  day_key: DAY_KEY,
  slot: z.string().trim().max(20).default("morning"),
  title: z.string().trim().max(200).default(""),
  body: z.string().trim().max(8000).default(""),
  platform: z.string().trim().max(40).optional().nullable(),
  campaign: z.string().trim().max(80).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().default({}),
});

const deleteSchema = z.object({
  day_key: DAY_KEY,
  slot: z.string().trim().max(20),
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

export async function DELETE(request: Request) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("marketing_calendar_entries")
    .delete()
    .eq("day_key", parsed.data.day_key)
    .eq("slot", parsed.data.slot);
  if (error) {
    console.error("[marketing-calendar:delete]", error);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
