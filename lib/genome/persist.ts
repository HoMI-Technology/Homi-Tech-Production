import type { SupabaseClient } from "@supabase/supabase-js";
import type { BehavioralGenome } from "@/types/database";
import type { DimensionScore, GenomeAnswers } from "@/lib/genome/dimensions";

export interface StoredGenome {
  answers: GenomeAnswers;
  scores: DimensionScore[];
  completedAt: string;
}

function isAnswers(value: unknown): value is GenomeAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "number");
}

function isScores(value: unknown): value is DimensionScore[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as DimensionScore).key === "string" &&
        typeof (item as DimensionScore).name === "string" &&
        typeof (item as DimensionScore).score === "number",
    )
  );
}

export function mapGenomeRow(row: BehavioralGenome): StoredGenome | null {
  if (!isAnswers(row.answers) || !isScores(row.scores)) return null;
  return {
    answers: row.answers,
    scores: row.scores,
    completedAt: row.completed_at,
  };
}

export async function loadRemoteGenome(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ row: BehavioralGenome | null; stored: StoredGenome | null }> {
  const { data, error } = await supabase
    .from("behavioral_genome")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { row: null, stored: null };
  const row = data as BehavioralGenome;
  return { row, stored: mapGenomeRow(row) };
}

export async function saveRemoteGenome(
  supabase: SupabaseClient,
  userId: string,
  stored: StoredGenome,
  existingId: string | null,
): Promise<string | null> {
  const now = new Date().toISOString();
  if (existingId) {
    const { error } = await supabase
      .from("behavioral_genome")
      .update({
        answers: stored.answers,
        scores: stored.scores,
        completed_at: stored.completedAt,
        updated_at: now,
      })
      .eq("id", existingId)
      .eq("user_id", userId);
    return error ? null : existingId;
  }

  const inserted = {
    id: crypto.randomUUID(),
    user_id: userId,
    answers: stored.answers,
    scores: stored.scores,
    completed_at: stored.completedAt,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from("behavioral_genome")
    .insert(inserted)
    .select("id")
    .maybeSingle();
  if (!error) return (data as { id: string } | null)?.id ?? inserted.id;

  // Unique user_id already exists (another tab). Load and update that row.
  const existing = await loadRemoteGenome(supabase, userId);
  if (!existing.row) return null;
  const { error: updateError } = await supabase
    .from("behavioral_genome")
    .update({
      answers: stored.answers,
      scores: stored.scores,
      completed_at: stored.completedAt,
      updated_at: now,
    })
    .eq("id", existing.row.id)
    .eq("user_id", userId);
  return updateError ? null : existing.row.id;
}
