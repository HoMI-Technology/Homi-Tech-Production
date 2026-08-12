import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreditState } from "@/lib/credit/store";

export interface RemoteCreditRow {
  id: string;
  score: number;
  utilization: number;
  on_time_streak_months: number;
  completed_at: string;
}

export function mapCreditRow(row: RemoteCreditRow): CreditState {
  return {
    score: row.score,
    utilization: row.utilization,
    onTimeStreakMonths: row.on_time_streak_months,
  };
}

export async function loadRemoteCredit(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ row: RemoteCreditRow | null; state: CreditState | null }> {
  const { data, error } = await supabase
    .from("credit_snapshots")
    .select("id, score, utilization, on_time_streak_months, completed_at")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return { row: null, state: null };
  const row = data as RemoteCreditRow;
  return { row, state: mapCreditRow(row) };
}

export async function saveRemoteCredit(
  supabase: SupabaseClient,
  userId: string,
  state: CreditState,
  existingId: string | null,
): Promise<string | null> {
  const now = new Date().toISOString();
  const body = {
    score: state.score,
    utilization: state.utilization,
    on_time_streak_months: state.onTimeStreakMonths,
    completed_at: now,
    updated_at: now,
  };
  if (existingId) {
    const { error } = await supabase
      .from("credit_snapshots")
      .update(body)
      .eq("id", existingId)
      .eq("user_id", userId);
    return error ? null : existingId;
  }
  const inserted = { id: crypto.randomUUID(), user_id: userId, ...body };
  const { data, error } = await supabase
    .from("credit_snapshots")
    .insert(inserted)
    .select("id")
    .maybeSingle();
  if (error) return null;
  return (data as { id: string } | null)?.id ?? inserted.id;
}