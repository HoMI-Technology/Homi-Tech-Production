import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { netWorthTrend, type NetWorthSnapshotPoint } from "@/lib/finance/networth";
import { FINANCE_LEDGER_INFRA_MISSING } from "@/lib/finance/db-map";

export const runtime = "nodejs";

const MAX_SNAPSHOTS = 366;

/**
 * GET /api/finance/networth — the caller's persisted net-worth snapshots
 * (oldest → newest) plus WoW/MoM trend deltas. Deltas are null when no real
 * prior snapshot falls inside the comparison window — the series is never
 * interpolated. Honest-empty (`snapshots: []`) when nothing is persisted.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-networth-read:${ip}`, {
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

  const { data, error } = await supabase
    .from("finance_net_worth_snapshots")
    .select(
      "id, snapshot_date, total_assets_cents, total_liabilities_cents, net_worth_cents, source, breakdown, created_at",
    )
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true })
    .limit(MAX_SNAPSHOTS);

  if (error) {
    if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
      return NextResponse.json({ snapshots: [], trend: null, deferred: true });
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-networth:list:${correlationId}]`, error.message);
    return NextResponse.json(
      { error: "Could not load net worth history.", correlationId },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as {
    id: string;
    snapshot_date: string;
    total_assets_cents: number | string;
    total_liabilities_cents: number | string;
    net_worth_cents: number | string;
    source: string;
    breakdown: Record<string, unknown>;
    created_at: string;
  }[];

  const snapshots = rows.map((row) => ({
    id: row.id,
    snapshotDate: row.snapshot_date,
    totalAssetsCents: Number(row.total_assets_cents),
    totalLiabilitiesCents: Number(row.total_liabilities_cents),
    netWorthCents: Number(row.net_worth_cents),
    source: row.source,
    completeness:
      (row.breakdown as { completeness?: string } | null)?.completeness ?? null,
    createdAt: row.created_at,
  }));

  const points: NetWorthSnapshotPoint[] = snapshots.map((s) => ({
    snapshotDate: s.snapshotDate,
    netWorthCents: s.netWorthCents,
  }));

  return NextResponse.json({ snapshots, trend: netWorthTrend(points) });
}
