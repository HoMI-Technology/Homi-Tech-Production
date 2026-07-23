import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { computeScore, scoreToVerdict } from "@/lib/scoring";

/**
 * Security input-sanitization audit
 * ==================================
 *
 * These tests verify that critical code paths reject or gracefully handle
 * malformed / malicious inputs (NaN, Infinity, injection attempts).
 * They read source files directly (like the existing architecture and
 * migration guard tests) so they pin invariants without requiring a live DB.
 */

const ROOT = path.resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// 1. Scoring engine — NaN / Infinity handling
// ---------------------------------------------------------------------------

describe("scoring engine — numeric edge cases", () => {
  const safeBase = {
    debtToIncomeRatio: 0.25,
    downPaymentPercent: 0.2,
    emergencyFundMonths: 6,
    creditScore: 750,
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 9,
    fomoLevel: 3,
    timeHorizonMonths: 18,
    savingsRate: 0.22,
    downPaymentProgress: 0.85,
  } as const;

  it("does not crash on Infinity inputs — clamp should bound them", () => {
    const result = computeScore({
      ...safeBase,
      debtToIncomeRatio: Infinity,
      creditScore: Infinity,
      emergencyFundMonths: Infinity,
    });
    // Infinity should be clamped to the max boundary; score must remain a
    // finite number (not Infinity or NaN).
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("does not crash on -Infinity inputs — clamp should bound them", () => {
    const result = computeScore({
      ...safeBase,
      debtToIncomeRatio: -Infinity,
      creditScore: -Infinity,
      emergencyFundMonths: -Infinity,
    });
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("rejects NaN inputs gracefully (score must be a real number)", () => {
    // NOTE: The engine's internal clamp does not explicitly guard against
    // NaN, so NaN propagates through the calculation. This test documents
    // the vulnerability so a future hardening PR can address it.
    const result = computeScore({
      ...safeBase,
      debtToIncomeRatio: NaN,
    });
    // Current behaviour: NaN leaks through clamp and produces NaN.
    // Desired behaviour: clamp should return the lower bound (or 0) for NaN.
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it("rejects NaN credit score gracefully", () => {
    const result = computeScore({
      ...safeBase,
      creditScore: NaN,
    });
    expect(Number.isNaN(result.score)).toBe(false);
  });

  it("verdict derivation does not crash on NaN score", () => {
    // Defensive: even if the score were somehow NaN, the verdict helper
    // should not throw.
    expect(() => scoreToVerdict(NaN)).not.toThrow();
    expect(() => scoreToVerdict(Infinity)).not.toThrow();
    expect(() => scoreToVerdict(-Infinity)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. API routes — Zod validation coverage
// ---------------------------------------------------------------------------

describe("API route Zod validation", () => {
  const routesToCheck = [
    "app/api/checkout/route.ts",
    "app/api/email/route.ts",
    "app/api/assessments/route.ts",
    "app/api/waitlist/route.ts",
    "app/api/goals/route.ts",
    "app/api/plaid/sync/route.ts",
  ];

  it.each(routesToCheck)("%s imports zod and defines a body schema", (routePath) => {
    const fullPath = path.join(ROOT, routePath);
    const source = fs.readFileSync(fullPath, "utf8");
    expect(source).toContain('import { z } from "zod"');
    expect(source).toContain("z.object");
  });

  it.each(routesToCheck)("%s uses safeParse (not parse) to avoid throwing on bad input", (routePath) => {
    const fullPath = path.join(ROOT, routePath);
    const source = fs.readFileSync(fullPath, "utf8");
    expect(source).toContain(".safeParse(");
  });

  it("checkout route restricts tier to known enum values", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/api/checkout/route.ts"), "utf8");
    expect(source).toContain('z.enum(["plus", "pro", "family"])');
  });

  it("email route restricts template to known enum values", () => {
    const source = fs.readFileSync(path.join(ROOT, "app/api/email/route.ts"), "utf8");
    expect(source).toContain('z.enum(["welcome", "verdict", "reassessment", "waitlist"])');
  });
});

// ---------------------------------------------------------------------------
// 3. No raw SQL concatenation in API routes
// ---------------------------------------------------------------------------

describe("API routes — no raw SQL concatenation", () => {
  const apiDir = path.join(ROOT, "app/api");

  function getAllTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllTsFiles(full));
      } else if (entry.name.endsWith(".ts")) {
        files.push(full);
      }
    }
    return files;
  }

  const routeFiles = getAllTsFiles(apiDir);

  it("all API route files use Supabase query builder (no raw SQL string concatenation)", () => {
    // Dangerous patterns:
    //  - template literals inside .rpc(`, .query(`, etc.
    //  - string concatenation of SQL fragments
    //  - direct use of .raw( or sql``
    const dangerousPatterns = [
      /\+\s*['"`][\s\S]*?\b(select|insert|update|delete|drop|alter)\b/i,
      /\$\{[^}]*\}[^`]*?\b(select|insert|update|delete|drop|alter)\b/i,
      /\.raw\s*\(/i,
      /sql\s*`/i,
    ];

    for (const file of routeFiles) {
      const source = fs.readFileSync(file, "utf8");
      for (const pattern of dangerousPatterns) {
        expect(
          pattern.test(source),
          `Possible raw SQL concatenation in ${path.relative(ROOT, file)}`,
        ).toBe(false);
      }
    }
  });

  it("all API route files use .from() / .select() / .eq() builder patterns for DB access", () => {
    // Every file that touches the DB should use the typed Supabase builder.
    const dbAccessFiles = routeFiles.filter((f) => {
      const source = fs.readFileSync(f, "utf8");
      return source.includes("supabase") || source.includes("createClient");
    });

    expect(dbAccessFiles.length).toBeGreaterThan(0);

    for (const file of dbAccessFiles) {
      const source = fs.readFileSync(file, "utf8");
      // Must use at least one builder method
      const hasBuilderMethod =
        /\.from\s*\(/.test(source) ||
        /\.select\s*\(/.test(source) ||
        /\.insert\s*\(/.test(source) ||
        /\.update\s*\(/.test(source) ||
        /\.upsert\s*\(/.test(source) ||
        /\.delete\s*\(/.test(source);

      expect(
        hasBuilderMethod,
        `DB access in ${path.relative(ROOT, file)} should use Supabase query builder`,
      ).toBe(true);
    }
  });
});
