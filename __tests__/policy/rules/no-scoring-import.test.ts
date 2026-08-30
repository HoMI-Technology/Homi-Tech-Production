/**
 * T3 no-scoring-logic-outside-lib-scoring — merge of finance/ + planner/
 * scoring-import-guard. Value-imports of engine/weights/insights/shadow
 * are forbidden. Finance components must type-import via the public seam
 * when they need AssessmentResult.
 */
import { describe, expect, it } from "vitest";
import { listSourceFiles, repoPath } from "../../support/policy/project";
import {
  SCORING_FORBIDDEN_MODULES,
  SCORING_IMPORT_GUARD_ROOTS,
  SCORING_PUBLIC_SEAM,
} from "../../support/policy/source-lock-facts";

describe("no-scoring-import-outside-public-seam", () => {
  it("finance and planner trees do not import server-only scoring modules", () => {
    const offenders: string[] = [];
    for (const root of SCORING_IMPORT_GUARD_ROOTS) {
      for (const sf of listSourceFiles(root)) {
        for (const decl of sf.getImportDeclarations()) {
          const spec = decl.getModuleSpecifierValue();
          if (
            SCORING_FORBIDDEN_MODULES.some((m) => spec === m || spec.startsWith(`${m}/`))
          ) {
            if (root.startsWith("lib/planner") || root.startsWith("components/planner")) {
              if (decl.isTypeOnly()) continue;
            }
            offenders.push(
              `${repoPath(sf)}:${decl.getStartLineNumber()} ${decl.getText().trim()}`,
            );
          }
        }
      }
    }
    expect(
      offenders,
      `no-scoring-import: server scoring modules leaked\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("at least one finance component type-imports from the public seam", () => {
    const importers = listSourceFiles("components/finance").filter((sf) =>
      sf.getImportDeclarations().some((d) => d.getModuleSpecifierValue() === SCORING_PUBLIC_SEAM),
    );
    expect(
      importers.length,
      `no-scoring-import: no finance file imports ${SCORING_PUBLIC_SEAM}`,
    ).toBeGreaterThan(0);
  });
});
