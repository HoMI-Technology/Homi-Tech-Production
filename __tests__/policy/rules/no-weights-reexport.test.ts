/**
 * T3 no-weights-reexport — lib/scoring/weights.ts is a C2 trade-secret
 * boundary. Nothing may re-export it.
 */
import { describe, expect, it } from "vitest";
import { listSourceFiles, repoPath } from "../../support/policy/project";

const WEIGHTS = "@/lib/scoring/weights";
const WEIGHTS_REL = "lib/scoring/weights";

describe("no-weights-reexport", () => {
  it("no module re-exports lib/scoring/weights", () => {
    const offenders: string[] = [];
    for (const prefix of ["app", "components", "lib", "hooks"]) {
      for (const sf of listSourceFiles(prefix)) {
        const rel = repoPath(sf);
        if (rel.startsWith(WEIGHTS_REL)) continue;
        for (const decl of sf.getExportDeclarations()) {
          const spec = decl.getModuleSpecifierValue();
          const fromWeights =
            spec === WEIGHTS ||
            spec === "./weights" ||
            spec === "../scoring/weights";
          if (!fromWeights) continue;
          const names = decl.getNamedExports().map((n) => n.getName());
          const star = decl.isNamespaceExport() || names.length === 0;
          const leaked = star
            ? ["*"]
            : names.filter((n) => n !== "PILLAR_MAX_POINTS");
          if (leaked.length > 0) {
            offenders.push(`${rel}:${decl.getStartLineNumber()} ${decl.getText().trim()}`);
          }
        }
      }
    }
    expect(
      offenders,
      `no-weights-reexport: weights.ts must stay un-re-exported\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
