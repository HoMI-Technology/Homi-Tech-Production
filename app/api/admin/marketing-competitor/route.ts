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

const createSchema = z.object({
  account: z.string().trim().max(80).default(""),
  hook: z.string().trim().min(1).max(400),
  posted_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  tags: z.array(z.string().max(30)).max(8).optional().default([]),
  impressions: z.number().int().min(0).optional().nullable(),
});

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_competitor_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "List failed." }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
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
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketing_competitor_log")
    .insert({
      ...parsed.data,
      user_id: gate.user.id,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[marketing-competitor]", error);
    return NextResponse.json({ error: "Insert failed." }, { status: 500 });
  }
  return NextResponse.json({ post: data }, { status: 201 });
}

const deleteSchema = z.object({
  id: z.string().uuid().optional(),
  /** When true, wipe the full log (admin only). */
  clear_all: z.boolean().optional(),
});

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
  if (!parsed.data.id && !parsed.data.clear_all) {
    return NextResponse.json({ error: "id or clear_all required." }, { status: 400 });
  }

  const supabase = await createClient();
  if (parsed.data.clear_all) {
    // Delete all rows the admin can see (RLS scopes to admin).
    const { error } = await supabase
      .from("marketing_competitor_log")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("[marketing-competitor:clear]", error);
      return NextResponse.json({ error: "Clear failed." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("marketing_competitor_log")
    .delete()
    .eq("id", parsed.data.id!);
  if (error) {
    console.error("[marketing-competitor:delete]", error);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
