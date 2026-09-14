import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { patchMilestoneBodySchema } from "@/lib/path/validation";
import { PATH_INFRA_MISSING, rowToPathMilestone } from "@/lib/path/db-map";
import type { PathMilestoneRow } from "@/types/database";

export const runtime = "nodejs";

/**
 * PATCH /api/path/milestones/[id] — status transitions only.
 *
 * Users mark milestones pending/active/done/skipped. Amounts, dates, and
 * provenance are never editable here: targets come from recorded data or
 * stay null — a user-edited target would break the honesty contract.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-milestone-write:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid milestone id." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = patchMilestoneBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Only a status transition (pending/active/done/skipped) is allowed." },
      { status: 400 },
    );
  }

  const status = parsed.data.status;
  const { data, error } = await supabase
    .from("path_milestones")
    .update({
      status,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code && PATH_INFRA_MISSING.has(error.code)) {
      // Deferred-fallback convention (same as finance routes): infra missing
      // is not an error state for the client — the write is deferred.
      return NextResponse.json({ deferred: true }, { status: 202 });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[path:milestone:patch:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not update the milestone.", correlationId },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
  }

  return NextResponse.json({ milestone: rowToPathMilestone(data as PathMilestoneRow) });
}
