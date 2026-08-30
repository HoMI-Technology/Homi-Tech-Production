/**
 * T3 macron-integrity — user-visible strings use HōMI (U+014D), never
 * HoMI / HOMI / Homi (except the legal entity) and never a combining mark.
 *
 * Overlap: scripts/brand-check.mjs already scans the tree. This rule is the
 * migration target for the six-dir suites; the root brand-check stays.
 */
import { SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { listSourceFiles, repoPath } from "../../support/policy/project";

const SCOPES = [
  "components/dashboard",
  "components/finance",
  "components/layout",
  "components/marketing",
  "components/planner",
  "lib/dashboard",
  "lib/finance",
  "lib/layout",
  "lib/planner",
  "lib/observe",
] as const;

const BANNED = [
  { re: /HoMI/, message: 'Misspelled "HoMI" — use HōMI (U+014D)' },
  { re: /HOMI/, message: 'Misspelled "HOMI" — use HōMI (U+014D)' },
  { re: /o\u0304/, message: "Decomposed macron (o + U+0304) — use U+014D" },
] as const;

describe("macron-integrity", () => {
  it("six-dir product strings do not misspell HōMI", () => {
    const offenders: string[] = [];
    for (const scope of SCOPES) {
      for (const sf of listSourceFiles(scope)) {
        for (const kind of [
          SyntaxKind.StringLiteral,
          SyntaxKind.NoSubstitutionTemplateLiteral,
          SyntaxKind.JsxText,
        ]) {
          for (const node of sf.getDescendantsOfKind(kind)) {
            const text = node.getText();
            if (text.includes("Homi Technologies")) continue;
            for (const rule of BANNED) {
              if (rule.re.test(text)) {
                offenders.push(
                  `${repoPath(sf)}:${node.getStartLineNumber()} ${rule.message}`,
                );
              }
            }
          }
        }
      }
    }
    expect(
      offenders,
      `macron-integrity\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
