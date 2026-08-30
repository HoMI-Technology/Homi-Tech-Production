/**
 * T3 no-fixture-outside-demo — app/(product)/demo is the one sanctioned
 * fixture surface. Seed/demo helpers in other product pages are defects.
 */
import { SyntaxKind } from "ts-morph";
import { describe, expect, it } from "vitest";
import { listSourceFiles, repoPath } from "../../support/policy/project";

const BANNED = [
  "DEMO_FIXTURE",
  "fixtureUser",
  "seedDemoHousehold",
] as const;

describe("no-fixture-outside-demo", () => {
  it("product app routes outside demo do not declare sanctioned fixture identifiers", () => {
    const offenders: string[] = [];
    for (const sf of listSourceFiles("app/(product)")) {
      const rel = repoPath(sf);
      if (rel.startsWith("app/(product)/demo")) continue;
      for (const id of sf.getDescendantsOfKind(SyntaxKind.Identifier)) {
        const name = id.getText();
        if ((BANNED as readonly string[]).includes(name)) {
          offenders.push(`${rel}:${id.getStartLineNumber()} ${name}`);
        }
      }
    }
    expect(
      offenders,
      `no-fixture-outside-demo\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
