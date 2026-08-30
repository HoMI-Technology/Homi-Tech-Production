/**
 * T3 protected-copy — four verbatim brand phrases stay byte-identical
 * in the token modules that own them.
 */
import { describe, expect, it } from "vitest";
import { fileFacts } from "../../support/policy/source-facts";

const PHRASES = [
  {
    file: "lib/brand/index.ts",
    phrase: "Know when you're ready. Move when it matters.",
  },
  {
    file: "lib/brand/index.ts",
    phrase: "Decision Readiness Intelligence™",
  },
  {
    file: "lib/brand/index.ts",
    phrase: "DO NOT PROCEED",
  },
  {
    file: "components/home/walk-copy.ts",
    phrase: "Will you be okay?",
  },
] as const;

describe("protected-copy", () => {
  it.each(PHRASES.map((p) => [p.phrase, p] as const))(
    "%s",
    (_label, { file, phrase }) => {
      const facts = fileFacts(file);
      expect(
        facts.strings.some((s) => s.includes(phrase)),
        `protected-copy: ${file} lost ${JSON.stringify(phrase)}`,
      ).toBe(true);
    },
  );
});
