/**
 * Gate honesty: every lens's declared `gate` must match the entitlement the
 * lens page actually enforces.
 *
 * The regression this guards is a claims problem, not a styling one. The field
 * was hand-maintained as "free" | "plus" and drifted from the pages:
 *
 *   - 8 lenses declared "plus" while the wall was `advancedTools` (Pro+), so a
 *     Plus subscriber saw a "Plus+" badge, clicked, and hit a Pro paywall.
 *   - 5 lenses declared "plus" while enforcing nothing, deterring free users
 *     from tools they could already use.
 *   - `simulator` declared "free" while gating on advancedTools server-side.
 *
 * Any badge or upsell built from `lens.gate` inherits whatever this field says,
 * so it has to be checked against the source of enforcement rather than trusted.
 * Reading the page files is deliberate: the alternative (importing the pages)
 * pulls server components and Supabase clients into the test environment.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LENSES } from "@/lib/tools/registry";

const PRODUCT_ROOT = join(process.cwd(), "app", "(product)");

/** Route path ("/tools/mortgage") → its page source. */
function readPageSource(path: string): string {
  const rel = path.replace(/^\//, "");
  return readFileSync(join(PRODUCT_ROOT, rel, "page.tsx"), "utf8");
}

/**
 * True when the page enforces the advancedTools capability — either by wrapping
 * <AdvancedToolGate> or by branching on `entitlements.advancedTools` directly
 * (the simulator does the latter and renders an UpgradePanel with minTier pro).
 */
function enforcesAdvancedTools(source: string): boolean {
  return /AdvancedToolGate/.test(source) || /entitlements\.advancedTools/.test(source);
}

describe("lens gate honesty", () => {
  it("every lens page is readable at its declared path", () => {
    for (const lens of LENSES) {
      expect(() => readPageSource(lens.path), `${lens.id} has no page at ${lens.path}`).not.toThrow();
    }
  });

  it("declared gate matches the enforcement the page actually applies", () => {
    const lies: string[] = [];
    for (const lens of LENSES) {
      const enforced = enforcesAdvancedTools(readPageSource(lens.path));
      const declared = lens.gate === "pro";
      if (enforced !== declared) {
        lies.push(
          `${lens.id} (${lens.path}) declares gate "${lens.gate}" but ` +
            `${enforced ? "DOES" : "does NOT"} enforce advancedTools`,
        );
      }
    }
    expect(lies, `gate declarations disagree with enforcement:\n${lies.join("\n")}`).toEqual([]);
  });

  it("uses only the two real tiers — no legacy \"plus\" label", () => {
    for (const lens of LENSES) {
      expect(["free", "pro"], `${lens.id} has unknown gate "${lens.gate}"`).toContain(lens.gate);
    }
  });
});
