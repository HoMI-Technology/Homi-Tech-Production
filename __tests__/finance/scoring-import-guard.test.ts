/**
 * Finance client UI must type-import scoring types from the public seam only.
 * Never @/lib/scoring/engine (or weights/insights/shadow) — even as import type.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["components/finance"];
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

describe("finance scoring import guard", () => {
  it("does not import server-only scoring modules from finance components", () => {
    const files = ROOTS.flatMap((r) => walk(r));
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files) {
      const code = readFileSync(file, "utf8");
      for (const line of code.split("\n")) {
        if (FORBIDDEN.test(line)) offenders.push(`${file}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("type-imports AssessmentResult from the public seam when needed", () => {
    const files = ROOTS.flatMap((r) => walk(r));
    const publicImporters = files.filter((file) => {
      const code = readFileSync(file, "utf8");
      return /from\s+["']@\/lib\/scoring\/public["']/.test(code);
    });
    expect(publicImporters.length).toBeGreaterThan(0);
  });
});
