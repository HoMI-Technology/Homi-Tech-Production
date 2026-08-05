/**
 * Planner client graph must never value-import server-only scoring modules.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["lib/planner", "components/planner"];
const FORBIDDEN =
  /from\s+["']@\/lib\/scoring\/(engine|weights|insights|shadow)["']/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("planner scoring import guard", () => {
  it("does not import server-only scoring modules from planner tree", () => {
    const files = ROOTS.flatMap((r) => walk(r));
    expect(files.length).toBeGreaterThan(5);
    const offenders: string[] = [];
    for (const file of files) {
      const code = readFileSync(file, "utf8");
      // type-only imports from public/engine types are ok if `import type`
      const lines = code.split("\n");
      for (const line of lines) {
        if (line.includes("import type")) continue;
        if (FORBIDDEN.test(line)) offenders.push(`${file}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
