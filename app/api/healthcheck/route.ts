import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Liveness + readiness probe.
 *
 * `ok` reflects process liveness; `database` reflects a real round-trip
 * to Supabase (a HEAD count against the public question_bank, which the
 * anon role can read). A degraded database returns HTTP 200 with
 * database:"error" so uptime monitors can distinguish app-down from
 * db-down instead of conflating them.
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

  return NextResponse.json({
    ok: true,
    database,
    latencyMs: Date.now() - startedAt,
    time: new Date().toISOString(),
    version: "1.0.0",
  });
}
