import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Structural guard for the rule in hooks/useQuotaGate.ts:
 *
 *   A 402 carrying a `quota` payload renders as chrome, never as a chat turn.
 *
 * This test exists because that rule was enforced by diligence and diligence failed
 * twice. `gateCompanion` guards four API routes; the payment ask was fixed on some
 * clients and missed on others — most recently AgentChat, which rendered it BOTH as
 * an agent's chat turn and again as an error line, on a live route.
 *
 * The failure mode is "enumerate the call sites, fix a subset, believe it's done."
 * Nobody can be relied on to re-enumerate. So: any client module that POSTs to a
 * quota-gated route must go through the hook. Adding a fifth conversational surface
 * without it fails the build instead of shipping a payment ask in a persona's voice.
 */

/** Routes whose handlers call gateCompanion — keep in sync with lib/advisor/quota.ts. */
const GATED_ROUTES = ["/api/advisor", "/api/agents", "/api/twin", "/api/trinity"];

const SEARCH_ROOTS = ["components", "app", "hooks"];
const SKIP_DIRS = new Set(["node_modules", ".next", "__tests__", "dist"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = SEARCH_ROOTS.flatMap((r) => {
  try {
    return walk(r);
  } catch {
    return [];
  }
});

/** Strip comments, so prose about `demoContext: true` can never satisfy a code check. */
export function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/**
 * Client modules that POST to a gated route — i.e. can actually receive the 402.
 *
 * The demo-traffic exemption is evaluated PER CALL SITE on comment-stripped source.
 * An earlier version regex-matched the whole raw file, so a doc comment mentioning
 * `demoContext: true` exempted the entire module — including any real, non-demo call
 * inside it. That is exactly the accidental silencing this guard exists to prevent.
 */
function callersOfGatedRoutes(): Array<{ file: string; src: string }> {
  const hits: Array<{ file: string; src: string }> = [];

  for (const file of FILES) {
    // Route handlers implement the gate; they don't consume it.
    if (file.includes(join("app", "api"))) continue;

    const raw = readFileSync(file, "utf8");
    const src = stripComments(raw);
    if (!/method:\s*"POST"/.test(src)) continue;

    // The file qualifies if ANY gated-route call site is not a demo post.
    let hasRealCall = false;
    for (const route of GATED_ROUTES) {
      let from = 0;
      for (;;) {
        const at = src.indexOf(`"${route}"`, from);
        if (at === -1) break;
        from = at + 1;
        // The fetch options object follows the URL; a demo post declares it there.
        if (!/demoContext:\s*true/.test(src.slice(at, at + 800))) hasRealCall = true;
      }
    }
    if (hasRealCall) hits.push({ file, src: raw });
  }

  return hits;
}

describe("quota gate coverage", () => {
  const callers = callersOfGatedRoutes();

  it("finds the conversational surfaces at all (guard is not vacuously passing)", () => {
    // If this drops to zero, detection is broken — not the codebase clean.
    expect(callers.length).toBeGreaterThanOrEqual(3);
  });

  it.each(GATED_ROUTES)("%s is still gated by gateCompanion server-side", (route) => {
    const src = readFileSync(join("app", route.replace(/^\//, ""), "route.ts"), "utf8");
    expect(src).toMatch(/gateCompanion/);
  });

  it.each(GATED_ROUTES)("%s: any demo bypass it declares really skips the gate", (route) => {
    // Exempting demoContext callers is only sound while the route actually skips
    // gateCompanion for demo traffic. Checked for EVERY gated route — an earlier
    // version checked only /api/advisor, while /api/agents has the same bypass.
    const src = readFileSync(join("app", route.replace(/^\//, ""), "route.ts"), "utf8");
    if (!src.includes("demoContext")) return; // no bypass to validate
    expect(src).toMatch(/if \(!demoContext\) \{[\s\S]{0,400}gateCompanion/);
  });

  it("a doc comment mentioning demoContext cannot exempt a real call site", () => {
    // Regression: ArtifactPlayground.tsx:38 is prose containing "demoContext: true".
    // Whole-file matching let that silence the guard for the entire module.
    const proseThenRealCall = [
      "/** posts with `demoContext: true` instead of a real payload */",
      'await fetch("/api/agents", { method: "POST", body: "{}" });',
    ].join("\n");
    expect(stripComments(proseThenRealCall)).not.toMatch(/demoContext:\s*true/);
  });

  it("every client that can receive a 402 routes it through useQuotaGate", () => {
    const offenders = callers
      .filter(({ src }) => !src.includes("useQuotaGate"))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it("no client hand-rolls the 402 branch INSTEAD of using the hook", () => {
    // A `status === 402` check is only acceptable alongside the hook — e.g. the
    // widget's legacy CTA fallback for a payload predating the structured field.
    // Hand-rolling it *instead* of the hook is how the rule drifted the first time.
    const offenders = callers
      .filter(({ src }) => /status\s*===\s*402/.test(src) && !src.includes("useQuotaGate"))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
