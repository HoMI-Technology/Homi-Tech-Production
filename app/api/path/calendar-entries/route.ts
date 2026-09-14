import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { planToCalendarEntries } from "@/lib/path/calendar-bridge";
import { loadActivePlan } from "@/lib/path/server-plans";
import type { PathMilestoneDraft } from "@/lib/path/types";

export const runtime = "nodejs";

/**
 * GET /api/path/calendar-entries — read-only projection of the active
 * path's dated milestones into calendar-entry-shaped objects (the
 * calendar_events shape: title / kind / event_date / notes / completed).
 *
 * The calendar schema has no amount/funding/depends_on columns (assumption
 * A9), so provenance and the confidence cap travel in the notes block with
 * a parseable marker. Nothing is persisted here — the calendar composes
 * these entries client-side; path milestones stay the single source.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`path-calendar-read:${ip}`, { limit: 30, windowMs: 60_000 });
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

  const active = await loadActivePlan(supabase);
  if (!active) {
    return NextResponse.json({ entries: [] });
  }

  const drafts: PathMilestoneDraft[] = active.milestones.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    kind: m.kind,
    targetDate: m.targetDate,
    targetAmountCents: m.targetAmountCents,
    fundingSource: m.fundingSource ?? {
      basis: "insufficient_data",
      metric: null,
      valueCents: null,
      completeness: null,
      confidenceCap: 0.35,
    },
    toolSlug: m.toolSlug,
    dependsOn: m.dependsOn,
    sortOrder: m.sortOrder,
    status: "pending",
  }));
  const statusById = new Map(active.milestones.map((m) => [m.id, m.status]));

  return NextResponse.json({
    entries: planToCalendarEntries(drafts, active.plan.id, statusById),
  });
}
