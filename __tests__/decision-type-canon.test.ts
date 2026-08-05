import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  ACTIVE_DECISION_TYPES,
  DECISION_TYPE_LABELS,
  type DecisionType,
} from "@/lib/assessment/types";
import { activeDecisionTypeSchema } from "@/lib/validation/assessment";

/**
 * Assessment decision-type canon (Plans.md 5.3).
 *
 * Scope: the ASSESSMENT vocabulary only. journal_entries.decision_type is a
 * deliberately separate vocabulary (career / purchase / investment / life —
 * see app/(product)/journal/page.tsx) and is NOT covered here.
 */

const CANON = Object.keys(DECISION_TYPE_LABELS) as DecisionType[];

// Directories that make up the assessment domain. A decision_type string
// literal anywhere in here must be a canon slug.
const ASSESSMENT_DOMAIN_DIRS = [
  "lib/assessment",
  "lib/questions",
  "components/assessment",
  "app/api/assessments",
];

function sourceFiles(dir: string): string[] {
  const abs = path.join(process.cwd(), dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => path.join(abs, f));
}

describe("assessment decision-type canon", () => {
  it("every active decision type is a canon slug", () => {
    for (const active of ACTIVE_DECISION_TYPES) {
      expect(CANON).toContain(active);
    }
  });

  it("activeDecisionTypeSchema accepts exactly the active set", () => {
    for (const active of ACTIVE_DECISION_TYPES) {
      expect(activeDecisionTypeSchema.safeParse(active).success).toBe(true);
    }
    const inactive = CANON.filter((t) => !(ACTIVE_DECISION_TYPES as string[]).includes(t));
    expect(inactive.length).toBeGreaterThan(0); // vacuity guard while verticals are pending
    for (const t of inactive) {
      expect(activeDecisionTypeSchema.safeParse(t).success).toBe(false);
    }
    expect(activeDecisionTypeSchema.safeParse("banana").success).toBe(false);
  });

  it("assessment-domain source uses only canon decision-type literals", () => {
    const offenders: string[] = [];
    for (const dir of ASSESSMENT_DOMAIN_DIRS) {
      for (const file of sourceFiles(dir)) {
        const src = fs.readFileSync(file, "utf8");
        for (const match of src.matchAll(/decision_?[tT]ype:\s*"([^"]+)"/g)) {
          if (!(CANON as string[]).includes(match[1])) {
            offenders.push(`${path.relative(process.cwd(), file)} → "${match[1]}"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
