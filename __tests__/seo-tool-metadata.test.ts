import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { toolMetadata } from "@/lib/seo/tool-seo";
import { LENSES } from "@/lib/tools/registry";

const ROOT = process.cwd();

/**
 * Public tool surfaces that need their own metadata: every /tools/ lens plus
 * /scenarios. These pages are "use client" and cannot export metadata, so a
 * server layout.tsx per directory carries it — without one the route ships
 * the root fallback (<title>HōMI</title>, no canonical), which is exactly
 * the defect this guard prevents from returning.
 */
const PUBLIC_LENS_PATHS = LENSES.filter(
  (l) => l.path.startsWith("/tools/") || l.path === "/scenarios",
).map((l) => l.path);

function layoutFile(path: string): string {
  const dir =
    path === "/scenarios"
      ? ["app", "(product)", "scenarios"]
      : ["app", "(product)", "tools", path.slice("/tools/".length)];
  return join(ROOT, ...dir, "layout.tsx");
}

describe("tool lens metadata", () => {
  it("every public lens directory ships a toolMetadata layout", () => {
    for (const path of PUBLIC_LENS_PATHS) {
      const file = layoutFile(path);
      expect(existsSync(file), `${path}: no layout.tsx`).toBe(true);
      expect(
        readFileSync(file, "utf8"),
        `${path}: layout.tsx does not call toolMetadata("${path}")`,
      ).toContain(`toolMetadata("${path}")`);
    }
  });

  it("emits a canonical, a real description, and the pinned brand card", () => {
    for (const path of PUBLIC_LENS_PATHS) {
      const meta = toolMetadata(path);
      expect(meta.alternates?.canonical, path).toBe(`https://homitechnology.com${path}`);
      expect(String(meta.description).length, path).toBeGreaterThan(30);
      const og = meta.openGraph as { images?: Array<{ url: string }> };
      expect(og?.images?.[0]?.url, path).toBe("/og-v5.png");
    }
  });

  it("mortgage keeps its redirect-placement canonical on affordability", () => {
    expect(readFileSync(layoutFile("/tools/mortgage"), "utf8")).toContain(
      'canonicalUrl("/tools/affordability")',
    );
  });

  it("throws on an unregistered path instead of shipping fallback metadata", () => {
    expect(() => toolMetadata("/tools/does-not-exist")).toThrow();
  });
});
