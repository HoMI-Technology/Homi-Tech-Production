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
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SERVER_STAMP_MODULES = [
  "lib/scoring/engine.ts",
  "lib/scoring/insights.ts",
  "lib/scoring/shadow.ts",
  "lib/scoring/weights.ts",
  "lib/supabase/admin.ts",
  "lib/stripe/server.ts",
  "lib/email/send.ts",
  "lib/plaid/client.ts",
  "lib/analytics/posthog.ts",
  "lib/push/send.ts",
  "lib/simulator.ts",
  "lib/readiness/preflight.ts",
  "lib/tools/readiness-bands.ts",
] as const;

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

  it("secret and server scoring-adjacent modules import server-only", () => {
    for (const rel of SERVER_STAMP_MODULES) {
      const code = codeOnly(src(rel));
      expect(code, rel).toMatch(/import\s+["']server-only["']/);
    }
  });

  it("scoring barrel does not value-re-export the engine", () => {
    const code = codeOnly(src("lib/scoring/index.ts"));
    expect(code).not.toMatch(/\bcomputeScore\b/);
    expect(code).not.toMatch(/\bgenerateKeyInsight\b/);
    expect(code).not.toMatch(/\bgenerateNextSteps\b/);
    expect(code).not.toMatch(/\bcomputeShadowScore\b/);
    expect(code).not.toMatch(/export\s*\{[^}]*\} from ["']\.\/engine["']/);
  });

  it("client components do not value-import the engine or scoring barrel computeScore", () => {
    const roots = ["components", "hooks", "lib", "app"];
    const offenders: string[] = [];

    function walk(dir: string): void {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) {
          if (name === "node_modules" || name === ".next") continue;
          walk(p);
        } else if (/\.(ts|tsx)$/.test(name)) {
          const text = readFileSync(p, "utf8");
          if (!/^["']use client["']/.test(text.trimStart()) && !/\n["']use client["']/.test(text)) {
            continue;
          }
          const rel = p.slice(root.length + 1);
          const decls = codeOnly(text).match(/import\s[\s\S]*?from\s+["'][^"']+["']/g) ?? [];
          for (const decl of decls) {
            if (/\bimport\s+type\b/.test(decl)) continue;
            if (/from\s+["']@\/lib\/scoring\/(?:engine|weights|insights|shadow)["']/.test(decl)) {
              offenders.push(`${rel}: ${decl.replace(/\s+/g, " ").trim()}`);
            }
            if (/from\s+["']@\/lib\/scoring["']/.test(decl) && /\bcomputeScore\b/.test(decl)) {
              offenders.push(`${rel}: ${decl.replace(/\s+/g, " ").trim()}`);
            }
          }
        }
      }
    }

    for (const r of roots) walk(join(root, r));
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("engine exports the bundle-proof sentinel", () => {
    expect(src("lib/scoring/engine.ts")).toContain(SENTINEL);
    expect(src("lib/scoring/engine.ts")).toMatch(/SCORING_ENGINE_SENTINEL/);
  });

  it("public + client-score stay free of server-only and computeScore", () => {
    for (const rel of [
      "lib/scoring/public.ts",
      "lib/scoring/client-score.ts",
      "lib/simulator/public.ts",
    ]) {
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
