/**
 * Permanent bundle / Lighthouse regression locks.
 *
 * These are *source* guards, not runtime LHCI: they fail in `vitest` (CI
 * verify job) the moment someone reintroduces a static import that blew the
 * §11 script budget or statically imported CompanionWidget.
 *
 * Architecture (do not "simplify"):
 * 1. instrumentation-client — dynamic import @sentry/nextjs inside DSN guard
 * 2. product layout — CompanionHost only (never static CompanionWidget)
 * 3. CompanionHost — dynamic import("./CompanionWidget") on user intent
 * 4. ClientProviders — LazyMotion + m, never bare `motion` for page chrome
 *
 * Research basis: Next.js lazy-loading docs (load modal only on click),
 * Motion LazyMotion guide (~34kb → ~4.6kb initial), LHCI resource-summary
 * counts all scripts transferred during the audit including idle-deferred
 * chunks — only interaction-gated imports stay off the budget.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

// Strip block and line comments so docs examples do not false-positive.
function codeOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("perf bundle guards (Lighthouse §11 + E2E coexistence)", () => {
  it("instrumentation-client never static-imports @sentry/nextjs", () => {
    const code = codeOnly(src("instrumentation-client.ts"));
    expect(code).not.toMatch(/import\s+[^;]*from\s+["']@sentry\/nextjs["']/);
    expect(code).toMatch(/import\s*\(\s*["']@sentry\/nextjs["']\s*\)/);
  });

  it("product layout mounts CompanionHost, never static CompanionWidget", () => {
    const code = codeOnly(src("app/(product)/layout.tsx"));
    expect(code).toMatch(/CompanionHost/);
    expect(code).toMatch(/from\s+["']@\/components\/companion\/CompanionHost["']/);
    expect(code).not.toMatch(/from\s+["']@\/components\/companion\/CompanionWidget["']/);
  });

  it("CompanionHost loads CompanionWidget only via dynamic import()", () => {
    const code = codeOnly(src("components/companion/CompanionHost.tsx"));
    expect(code).toMatch(/import\s*\(\s*["']\.\/CompanionWidget["']\s*\)/);
    // No static named/default import of the heavy widget module.
    expect(code).not.toMatch(
      /import\s+(?:type\s+)?\{[^}]*CompanionWidget[^}]*\}\s+from\s+["']\.\/CompanionWidget["']/,
    );
    expect(code).not.toMatch(/import\s+CompanionWidget\s+from\s+["']\.\/CompanionWidget["']/);
    // Launcher must keep the E2E-facing accessible name for signed-in users.
    // (string may live in JSX — check raw source)
    expect(src("components/companion/CompanionHost.tsx")).toMatch(/Open HōMI Companion/);
  });

  it("ClientProviders uses LazyMotion + m, not preloaded motion for transitions", () => {
    const code = codeOnly(src("components/layout/ClientProviders.tsx"));
    expect(code).toMatch(/LazyMotion/);
    expect(code).toMatch(/\bm\.div\b/);
    expect(code).toMatch(/motion-features/);
    // Named import of the preloaded `motion` component (~34kb).
    const namedImports = [...code.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']framer-motion["']/g)];
    for (const match of namedImports) {
      const names = match[1].split(",").map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim(),
      );
      expect(names, `unexpected motion import: ${match[0]}`).not.toContain("motion");
    }
  });

  it("useReadinessAnchors seeds from public simulator only (engine stays off cold tools)", () => {
    const code = codeOnly(src("hooks/use-readiness.ts"));
    expect(code).toMatch(/from\s+["']@\/lib\/simulator\/public["']/);
    expect(code).toMatch(/seedBaseline/);
    // Must not pull the engine-backed simulator module (static or dynamic).
    expect(code).not.toMatch(/["']@\/lib\/simulator["']/);
    expect(code).not.toMatch(/["']@\/lib\/scoring["']/);
  });

  it("results page is a light guest shell (no verdict / Path / trail graph)", () => {
    const page = codeOnly(src("app/(product)/results/page.tsx"));
    expect(page).not.toMatch(/ResultsVerdictView/);
    expect(page).not.toMatch(/next\/dynamic/);
    expect(page).not.toMatch(/from\s+["']@\/components\/readiness["']/);
    expect(page).not.toMatch(/from\s+["']@\/components\/results\/ReasoningTrail["']/);
    expect(page).not.toMatch(/from\s+["']@\/components\/share\/ShareScoreButton["']/);
    expect(page).not.toMatch(/from\s+["']@\/lib\/conflict\/engine["']/);
  });

  it("housing readiness uses the batch API, not readiness-bands on the client", () => {
    const code = codeOnly(src("hooks/use-housing-readiness.ts"));
    expect(code).toMatch(/fetchSimulatorBatch/);
    expect(code).not.toMatch(/["']@\/lib\/tools\/readiness-bands["']/);
    expect(code).not.toMatch(/["']@\/lib\/simulator["']/);
  });
});
