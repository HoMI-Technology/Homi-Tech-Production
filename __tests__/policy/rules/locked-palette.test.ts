/**
 * T3 locked-palette — the TS token file pins the six brand hexes.
 *
 * Overlap: __tests__/brand-colors.test.ts (withAlpha + COLORS shape) and
 * scripts/brand-check.mjs. Root files stay. This rule is the migration seat
 * for hex-in-source checks; it does not delete or rewrite those guards.
 */
import { SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { sourceFile } from "../../support/policy/project";

const CANON: Record<string, string> = {
  cyan: "#22d3ee",
  emerald: "#34d399",
  yellow: "#facc15",
  amber: "#fab633",
  crimson: "#f24822",
  navy: "#0a1628",
};

describe("locked-palette", () => {
  it("lib/brand/index.ts COLORS literals match the brand canon", () => {
    const sf = sourceFile("lib/brand/index.ts");
    const colors = sf.getVariableDeclarationOrThrow("COLORS");
    const init = colors.getInitializer();
    const text = init?.getText() ?? "";
    const missing: string[] = [];
    for (const [name, hex] of Object.entries(CANON)) {
      const re = new RegExp(`${name}:\\s*"${hex}"`);
      if (!re.test(text)) missing.push(`${name} ${hex}`);
    }
    expect(missing, `locked-palette: COLORS drifted\n${missing.join("\n")}`).toEqual([]);
  });

  it("COLORS object uses only 6-digit hex string literals", () => {
    const sf = sourceFile("lib/brand/index.ts");
    const colors = sf.getVariableDeclarationOrThrow("COLORS");
    const init = colors.getInitializer();
    const bad: string[] = [];
    if (init) {
      for (const lit of init.getDescendantsOfKind(SyntaxKind.StringLiteral)) {
        const v = lit.getLiteralValue();
        if (!/^#[0-9a-f]{6}$/i.test(v)) {
          bad.push(`${lit.getStartLineNumber()} ${v}`);
        }
      }
    }
    expect(bad, `locked-palette: non-hex COLORS value\n${bad.join("\n")}`).toEqual([]);
  });
});
