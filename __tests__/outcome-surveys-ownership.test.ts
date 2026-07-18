import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

/**
 * Guard for migration 00022 (outcome_surveys cross-tenant IDOR fix — the same
 * class as the score_shares fix in 00011). CI-runnable invariant pin, in the
 * style of __tests__/profiles-privilege-guard.test.ts: an edit can't silently
 * drop the assessment-ownership check or recreate the policy without it.
 */
const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "00022_outcome_surveys_ownership.sql"),
  "utf8",
);

describe("00022_outcome_surveys_ownership.sql", () => {
  it("replaces the 00010 policy rather than stacking a second one", () => {
    expect(sql).toMatch(/drop policy if exists "outcome_surveys_owner_all" on outcome_surveys/);
    expect(sql).toMatch(/create policy "outcome_surveys_owner_all"\s+on outcome_surveys for all/);
  });

  it("requires the referenced assessment to belong to the caller", () => {
    expect(sql).toMatch(/from assessments a/);
    expect(sql).toMatch(/a\.id = outcome_surveys\.assessment_id/);
    expect(sql).toMatch(/a\.user_id = \(select auth\.uid\(\)\)/);
  });

  it("still allows survey rows with no assessment attached", () => {
    expect(sql).toMatch(/assessment_id is null/);
  });

  it("keeps the user_id ownership scope on both USING and WITH CHECK", () => {
    expect(sql).toMatch(/using \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(sql).toMatch(/with check \([\s\S]*user_id = \(select auth\.uid\(\)\)/);
  });

  it("never weakens RLS (no disable, no permissive-to-anon grant)", () => {
    expect(sql).not.toMatch(/disable row level security/i);
    expect(sql).not.toMatch(/to anon\b/i);
  });

  it("ships a rollback note", () => {
    expect(sql).toContain("ROLLBACK");
  });
});
