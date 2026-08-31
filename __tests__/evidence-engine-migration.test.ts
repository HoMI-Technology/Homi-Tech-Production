import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "20260831000001_evidence_engine.sql"),
  "utf8",
);

describe("20260831000001_evidence_engine.sql", () => {
  it("is additive and does not drop outcome_surveys", () => {
    expect(sql).toContain("create table if not exists assessment_outcome_baselines");
    expect(sql).toContain("create table if not exists outcome_survey_events");
    expect(sql).not.toMatch(/drop table if exists outcome_surveys/i);
    expect(sql).not.toMatch(/drop column if exists satisfaction/i);
  });

  it("forces RLS on new tables and scopes to the owner", () => {
    expect(sql).toMatch(/alter table assessment_outcome_baselines force row level security/);
    expect(sql).toMatch(/alter table outcome_survey_events force row level security/);
    expect(sql).toMatch(/user_id = \(select auth\.uid\(\)\)/);
  });

  it("makes baselines insert-only for authenticated users", () => {
    expect(sql).toContain('baselines_insert_own');
    expect(sql).toContain('baselines_select_own');
    expect(sql).not.toMatch(/baselines_update/);
  });

  it("rejects cross-user lineage", () => {
    expect(sql).toContain("enforce_assessment_lineage_same_user");
    expect(sql).toContain("assessment lineage must reference the same user");
  });

  it("does not store proprietary weights", () => {
    expect(sql.toLowerCase()).not.toContain("pillar weight");
    expect(sql).not.toMatch(/WEIGHTS/);
  });
});
