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
 * A human (or a model) cannot be relied on to re-enumerate. So: any client module
 * that POSTs to a quota-gated route must go through the hook. Adding a fifth
 * conversational surface without it now fails the build instead of shipping a
 * payment ask in the Companion's voice.
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

/**
 * Client modules that POST to a gated route — i.e. can actually receive the 402.
 *
 * `demoContext: true` callers are exempt, and the exemption is *verified* below
 * rather than allowlisted: app/api/advisor/route.ts skips gateCompanion entirely
 * for demo traffic, so the public /artifact playground can never see a 402. If that
 * ever changes, the guard in `demo bypass is real` fails and this exemption with it.
 */
function callersOfGatedRoutes(): Array<{ file: string; src: string }> {
  const hits: Array<{ file: string; src: string }> = [];
  for (const file of FILES) {
    // Route handlers implement the gate; they don't consume it.
    if (file.includes(join("app", "api"))) continue;
    const src = readFileSync(file, "utf8");
    const targetsGated = GATED_ROUTES.some((r) => src.includes(`"${r}"`) || src.includes(`'${r}'`));
    if (!targetsGated || !/method:\s*"POST"/.test(src)) continue;
    if (/demoContext:\s*true/.test(src)) continue;
    hits.push({ file, src });
  }
  return hits;
}

describe("quota gate coverage", () => {
  const callers = callersOfGatedRoutes();

  it("finds the conversational surfaces at all (guard is not vacuously passing)", () => {
    // If this drops to zero the detection below is broken, not the codebase clean.
    expect(callers.length).toBeGreaterThanOrEqual(3);
  });

  it.each(GATED_ROUTES)("%s is still gated by gateCompanion server-side", (route) => {
    // "/api/advisor" -> "app/api/advisor/route.ts"
    const src = readFileSync(join("app", route.replace(/^\//, ""), "route.ts"), "utf8");
    expect(src).toMatch(/gateCompanion/);
  });

  it("the demo bypass is real, so exempting demoContext callers is sound", () => {
    // The public /artifact playground posts demoContext:true and is therefore
    // excluded above. That is only valid while the route actually skips the gate.
    const route = readFileSync(join("app", "api", "advisor", "route.ts"), "utf8");
    expect(route).toMatch(/if \(!demoContext\) \{[\s\S]{0,400}gateCompanion/);
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
