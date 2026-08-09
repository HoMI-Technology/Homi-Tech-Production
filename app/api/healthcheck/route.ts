import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Liveness + readiness probe.
 *
 * `ok` reflects process liveness; `database` reflects a real round-trip
 * to Supabase (a HEAD count against the public question_bank, which the
 * anon role can read). A degraded database returns HTTP 503 (not 200) so
 * status-code monitors page on a real outage instead of sleeping through it,
 * while the database:"error" body still distinguishes db-down from app-down
 * (no response at all). `version` carries the deploying commit SHA so you can
 * tell exactly which build is live.
 */
export async function GET() {
  let database: "ok" | "error" = "error";
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("question_bank")
      .select("id", { count: "exact", head: true });
    if (!error) database = "ok";
  } catch {
    database = "error";
  }

  const healthy = database === "ok";

  return NextResponse.json(
    {
      ok: healthy,
      database,
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_COMMIT_SHA ?? "dev",
    },
    { status: healthy ? 200 : 503 },
  );
}
