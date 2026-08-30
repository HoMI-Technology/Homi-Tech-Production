/**
 * T3 naming-law — surfaces say "Decision Readiness Score", never HōMI-Score.
 */
import { SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { sourceFile } from "../../support/policy/project";
import {
  DECISION_READINESS_SURFACES,
  NAMING_LAW_BANNED,
  NAMING_LAW_SURFACES,
} from "../../support/policy/source-lock-facts";

const STRING_KINDS = [
  SyntaxKind.StringLiteral,
  SyntaxKind.JsxText,
  SyntaxKind.NoSubstitutionTemplateLiteral,
  SyntaxKind.TemplateHead,
  SyntaxKind.TemplateMiddle,
  SyntaxKind.TemplateTail,
] as const;

function surfaceStrings(rel: string): Array<{ line: number; text: string }> {
  const sf = sourceFile(rel);
  const out: Array<{ line: number; text: string }> = [];
  for (const kind of STRING_KINDS) {
    for (const node of sf.getDescendantsOfKind(kind)) {
      out.push({ line: node.getStartLineNumber(), text: node.getText() });
    }
  }
  return out;
}

describe("naming-law", () => {
  it("rescued surfaces never say HōMI-Score / Homie Score", () => {
    const offenders: string[] = [];
    for (const rel of NAMING_LAW_SURFACES) {
      for (const { line, text } of surfaceStrings(rel)) {
        for (const banned of NAMING_LAW_BANNED) {
          if (text.includes(banned)) {
            offenders.push(`${rel}:${line} ${banned}`);
          }
        }
      }
    }
    expect(
      offenders,
      `naming-law: surfaces must say "Decision Readiness Score"\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("score-bearing surfaces name the instrument Decision Readiness Score", () => {
    const missing: string[] = [];
    for (const rel of DECISION_READINESS_SURFACES) {
      const texts = surfaceStrings(rel).map((s) => s.text);
      if (!texts.some((t) => t.includes("Decision Readiness Score"))) {
        missing.push(rel);
      }
    }
    expect(
      missing,
      `naming-law: missing "Decision Readiness Score"\n${missing.join("\n")}`,
    ).toEqual([]);
  });
});
