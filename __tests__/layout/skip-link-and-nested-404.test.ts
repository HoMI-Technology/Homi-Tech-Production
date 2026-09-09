import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("one skip link per document", () => {
  it("root layout keeps Skip to content → #main", () => {
    const root = read("app/layout.tsx");
    expect(root).toContain('href="#main"');
    expect(root).toContain("Skip to content");
    expect(root.match(/Skip to content/g)).toHaveLength(1);
  });

  it("marketing and product layouts do not add a second skip control", () => {
    const marketing = read("app/(marketing)/layout.tsx");
    const product = read("app/(product)/layout.tsx");
    expect(marketing).not.toContain("skip-link");
    expect(marketing).not.toContain("Skip to content");
    expect(product).not.toContain("skip-link");
    expect(product).not.toContain("Skip to content");
  });
});

describe("nested 404 chrome", () => {
  it("keeps SiteHeader + SiteFooter on the root not-found for unmatched URLs", () => {
    const root = read("app/not-found.tsx");
    expect(root).toContain("SiteHeader");
    expect(root).toContain("SiteFooter");
    expect(root).toContain("NotFoundContent");
    expect(root).toContain('id="main"');
  });

  it("uses content-only group not-found files under marketing and product", () => {
    for (const rel of ["app/(marketing)/not-found.tsx", "app/(product)/not-found.tsx"]) {
      expect(existsSync(resolve(process.cwd(), rel)), rel).toBe(true);
      const src = read(rel);
      expect(src).toContain("NotFoundContent");
      expect(src).not.toMatch(/import\s*\{[^}]*\bSiteHeader\b/);
      expect(src).not.toMatch(/import\s*\{[^}]*\bSiteFooter\b/);
      expect(src).not.toContain("<SiteHeader");
      expect(src).not.toContain("<SiteFooter");
      expect(src).not.toContain('id="main"');
    }
  });
});
