/**
 * T3 source-lock — AST facts promoted from the six-dir grep suites.
 * Failure names the rule id, file, and the missing/banned token.
 */
import { describe, expect, it } from "vitest";
import { evaluateFact } from "../../support/policy/source-facts";
import { SOURCE_LOCK_FACTS } from "../../support/policy/source-lock-facts";

describe("source-lock facts", () => {
  it.each(SOURCE_LOCK_FACTS.map((fact) => [fact.id, fact] as const))(
    "%s",
    (_id, fact) => {
      const offenders = evaluateFact(fact);
      expect(
        offenders,
        `source-lock ${fact.id} ${fact.file}\n${offenders.join("\n")}`,
      ).toEqual([]);
    },
  );
});
