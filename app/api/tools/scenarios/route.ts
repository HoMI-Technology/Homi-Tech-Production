/**
 * /api/tools/scenarios — list + create saved tool scenarios (Phase 4).
 *
 * The tier cap (entitlements.maxScenarios) is enforced HERE, server-side,
 * before insert — the count query and the cap check both happen against the
 * user's own rows (RLS), and the 402 tells the truth: free saves one
 * scenario, comparing futures is a paid feature. Anonymous requests get a
 * 401 and the client falls back to its local "browser only" store.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserEntitlements } from "@/lib/entitlements";
import { rateLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

const snapshotSchema = z.object({
  monthlyIncome: z.number().min(0).max(10_000_000),
  monthlyExpenses: z.number().min(0).max(10_000_000),
  monthlyDebtPayments: z.number().min(0).max(10_000_000),
  liquidSavings: z.number().min(0).max(1_000_000_000),
  totalDebt: z.number().min(0).max(1_000_000_000),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  lensId: z.string().trim().min(1).max(40),
  inputs: z
    .record(z.string().max(40), z.number().min(-1_000_000_000).max(1_000_000_000))
    .refine((r) => Object.keys(r).length <= 20, "at most 20 inputs"),
  cfmSnapshot: snapshotSchema.nullish(),
  clientUpdatedAt: z.number().min(0),
});

export async function GET() {
  const supabase = await createClient();
  const { userId } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to sync scenarios." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tool_scenarios")
    .select("id, name, lens_id, inputs, cfm_snapshot, client_updated_at, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[scenarios] list failed", { reason: error.message });
    return NextResponse.json({ error: "Could not load scenarios." }, { status: 500 });
  }

  return NextResponse.json({ scenarios: data ?? [] });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`scenarios:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scenario.", issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = await createClient();
  const { userId, entitlements } = await getUserEntitlements(supabase);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to sync scenarios." }, { status: 401 });
  }

  // Server-side cap enforcement — the honest gate. Free gets one scenario
  // (name a future); comparison needs two, so it lives on paid tiers.
  const { count, error: countError } = await supabase
    .from("tool_scenarios")
    .select("id", { count: "exact", head: true });
  if (countError) {
    console.error("[scenarios] count failed", { reason: countError.message });
    return NextResponse.json({ error: "Could not save the scenario." }, { status: 500 });
  }
  if ((count ?? 0) >= entitlements.maxScenarios) {
    return NextResponse.json(
      {
        error:
          entitlements.maxScenarios <= 1
            ? "Free saves one scenario. Comparing futures side by side is a Plus feature."
            : `Your plan saves up to ${entitlements.maxScenarios} scenarios. Delete one to save another.`,
      },
      { status: 402 },
    );
  }

  const { name, lensId, inputs, cfmSnapshot, clientUpdatedAt } = parsed.data;
  const { data, error } = await supabase
    .from("tool_scenarios")
    .insert({
      user_id: userId,
      name,
      lens_id: lensId,
      inputs,
      cfm_snapshot: cfmSnapshot ?? null,
      client_updated_at: Math.round(clientUpdatedAt),
    })
    .select("id, name, lens_id, inputs, cfm_snapshot, client_updated_at, created_at")
    .single();

  if (error) {
    console.error("[scenarios] insert failed", { reason: error.message });
    return NextResponse.json({ error: "Could not save the scenario." }, { status: 500 });
  }

  return NextResponse.json({ scenario: data }, { status: 201 });
}
