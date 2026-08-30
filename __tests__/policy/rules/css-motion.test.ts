/**
 * T3 CSS token lock — motion kit and hard-stop frame live in globals.css.
 * Computed-style reduced-motion belongs in T4; this rule only pins the tokens.
 */
import { describe, expect, it } from "vitest";
import { readPolicyText } from "../../support/policy/project";
import { CSS_LOCK_FACTS } from "../../support/policy/source-lock-facts";

describe("css-lock facts", () => {
  it.each(CSS_LOCK_FACTS.map((fact) => [fact.id, fact] as const))(
    "%s",
    (_id, fact) => {
      const full = readPolicyText(fact.file);
      const slice =
        fact.afterMarker !== undefined
          ? full.slice(
              full.indexOf(fact.afterMarker),
              fact.windowChars
                ? full.indexOf(fact.afterMarker) + fact.windowChars
                : undefined,
            )
          : full;
      const offenders: string[] = [];
      if (fact.afterMarker !== undefined && full.indexOf(fact.afterMarker) < 0) {
        offenders.push(`afterMarker missing ${fact.afterMarker}`);
      }
      for (const token of fact.mustContain) {
        if (!slice.includes(token)) offenders.push(`mustContain missing ${token}`);
      }
      for (const token of fact.mustNotContain ?? []) {
        if (slice.includes(token)) offenders.push(`mustNotContain present ${token}`);
      }
      expect(
        offenders,
        `css-lock ${fact.id} ${fact.file}\n${offenders.join("\n")}`,
      ).toEqual([]);
    },
  );
});
