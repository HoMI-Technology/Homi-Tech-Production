/**
 * Typed Supabase double for T2 boundary tests.
 * Fake only the external boundary — never an owned HōMI module.
 */

export type SupabaseUser = { id: string } | null;

export type QueryError = { code?: string; message: string } | null;

export type SupabaseDoubleState = {
  user: SupabaseUser;
  selectError: QueryError;
  rows: Record<string, unknown>[];
};

export function emptySupabaseState(): SupabaseDoubleState {
  return {
    user: null,
    selectError: null,
    rows: [],
  };
}
