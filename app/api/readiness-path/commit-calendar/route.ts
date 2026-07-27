import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  formatPathEventNotes,
  normalizeReadinessPath,
  pathStepEventDate,
  parsePathMarker,
} from "@/lib/readiness/path";

export const runtime = "nodejs";

const INFRA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

const putBodySchema = z.object({
  path: z.unknown(),
});

/**
 * POST /api/readiness-path/commit-calendar
 * One-click: persist path (if table exists) + insert calendar events for steps.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`readiness-path-commit:${ip}`, {
    limit: 20,
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = putBodySchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const path = normalizeReadinessPath(body.data.path);
  if (!path || path.steps.length === 0) {
    return NextResponse.json({ error: "No path steps to commit." }, { status: 400 });
  }

  const committedAt = new Date().toISOString();
  const pathWithCommit = { ...path, calendarCommittedAt: committedAt };

  // Best-effort path persist
  await supabase.from("user_readiness_path").upsert(
    {
      user_id: user.id,
      path: pathWithCommit,
      client_updated_at: Date.now(),
    },
    { onConflict: "user_id" },
  );

  const { data: existing, error: fetchError } = await supabase
    .from("calendar_events")
    .select("id, notes")
    .eq("user_id", user.id);

  if (fetchError) {
    const correlationId = crypto.randomUUID();
    console.error(`[readiness-path-commit:fetch:${correlationId}]`, fetchError.message);
    return NextResponse.json(
      { error: "Could not read calendar.", correlationId },
      { status: 500 },
    );
  }

  const existingStepIds = new Set(
    (existing ?? [])
      .map((ev) => parsePathMarker(ev.notes as string | null))
      .filter(
        (m): m is { pathId: string; stepId: string } =>
          m != null && m.pathId === path.id,
      )
      .map((m) => m.stepId),
  );

  const rows = path.steps
    .filter((step) => !existingStepIds.has(step.id))
    .map((step) => ({
      user_id: user.id,
      title: step.title,
      kind: step.kind,
      event_date: pathStepEventDate(step),
      notes: formatPathEventNotes(pathWithCommit, step),
      completed: (step.status ?? "pending") === "done",
    }));

  let inserted = 0;
  if (rows.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("calendar_events")
      .insert(rows)
      .select("id");

    if (insertError) {
      if (insertError.code && INFRA_MISSING_CODES.has(insertError.code)) {
        return NextResponse.json(
          { error: "Calendar is not available yet." },
          { status: 503 },
        );
      }
      const correlationId = crypto.randomUUID();
      console.error(`[readiness-path-commit:insert:${correlationId}]`, insertError.message);
      return NextResponse.json(
        { error: "Could not add path milestones.", correlationId },
        { status: 500 },
      );
    }
    inserted = insertedRows?.length ?? rows.length;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped: path.steps.length - rows.length,
    path: pathWithCommit,
  });
}
