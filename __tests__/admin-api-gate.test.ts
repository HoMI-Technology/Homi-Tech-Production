import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walkRoutes(dir: string, acc: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkRoutes(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

describe("admin API gate matches the console layout", () => {
  it("every /api/admin route uses the shared three-layer requireAdmin", () => {
    const routes = walkRoutes(join(process.cwd(), "app", "api", "admin"));
    expect(routes.length).toBeGreaterThan(0);
    for (const file of routes) {
      const src = readFileSync(file, "utf8");
      expect(src, file).toContain('from "@/lib/auth/require-admin"');
      expect(src, file).not.toMatch(/async function requireAdmin/);
    }
  });

  it("shared helper evaluates role + allowlist + MFA", () => {
    const src = readFileSync(join(process.cwd(), "lib", "auth", "require-admin.ts"), "utf8");
    expect(src).toContain("evaluateAdminAccess");
    expect(src).toContain("parseAdminEmails");
    expect(src).toContain("deriveNextLevel");
  });
});
