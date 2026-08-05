/**
 * Plans.md 6.5 — engine/insights/shadow/weights are server-only.
 * Source guards + optional post-build client-chunk sentinel check.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const SENTINEL = "HOMI_SCORING_ENGINE_V1_SERVER_ONLY";

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("server-only enforcement (6.5)", () => {
  it("engine, insights, shadow, and weights import server-only", () => {
    for (const rel of [
      "lib/scoring/engine.ts",
      "lib/scoring/insights.ts",
      "lib/scoring/shadow.ts",
      "lib/scoring/weights.ts",
    ]) {
      const code = codeOnly(src(rel));
      expect(code, rel).toMatch(/import\s+["']server-only["']/);
    }
  });

  it("engine exports the bundle-proof sentinel", () => {
    expect(src("lib/scoring/engine.ts")).toContain(SENTINEL);
    expect(src("lib/scoring/engine.ts")).toMatch(/SCORING_ENGINE_SENTINEL/);
  });

  it("public + client-score stay free of server-only and computeScore", () => {
    for (const rel of ["lib/scoring/public.ts", "lib/scoring/client-score.ts", "lib/simulator/public.ts"]) {
      const code = codeOnly(src(rel));
      expect(code, rel).not.toMatch(/import\s+["']server-only["']/);
      expect(code, rel).not.toMatch(/\bcomputeScore\b/);
    }
  });

  it("vitest configs alias server-only to the no-op stub", () => {
    for (const rel of [
      "vitest.config.ts",
      "vitest.acceptance.config.ts",
      "vitest.architecture.config.ts",
    ]) {
      expect(src(rel), rel).toMatch(/server-only/);
      expect(src(rel), rel).toMatch(/test\/stubs\/server-only/);
    }
  });
});

function walkFiles(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else if (/\.(js|css|map)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("client chunk sentinel (6.5 — requires next build)", () => {
  it("client static chunks do not contain the engine sentinel", () => {
    const staticDir = join(root, ".next", "static");
    if (!existsSync(staticDir)) {
      // verify job runs vitest before next build — skip when no artifacts.
      expect(true).toBe(true);
      return;
    }
    const files = walkFiles(staticDir);
    const hits: string[] = [];
    for (const file of files) {
      try {
        const text = readFileSync(file, "utf8");
        if (text.includes(SENTINEL)) hits.push(file);
      } catch {
        // binary or unreadable
      }
    }
    expect(hits, `sentinel leaked into: ${hits.join(", ")}`).toEqual([]);
  });
});
