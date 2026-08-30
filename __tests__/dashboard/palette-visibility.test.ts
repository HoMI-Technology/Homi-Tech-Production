/**
 * Jump-to destinations follow role gates and keep Companion /advisor off the palette.
 */
import { describe, it, expect } from "vitest";
import { visiblePaletteItems } from "@/lib/dashboard/palette-visibility";

describe("visiblePaletteItems", () => {
  it("hides admin and partner destinations for a plain user", () => {
    const items = visiblePaletteItems({ role: "user" });
    const hrefs = items.map((i) => i.href);
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/settings");
    // Catalog-union entries shared with AppHeader More (PR: nav parity).
    expect(hrefs).toContain("/path");
    expect(hrefs).not.toContain("/results");
    expect(hrefs).toContain("/household");
    expect(hrefs).toContain("/scenarios");
    expect(hrefs).toContain("/tools/preflight");
    // D3 household consolidation: /couples and /family merged into
    // /household — the standalone entries left the catalog.
    expect(hrefs).not.toContain("/couples");
    expect(hrefs).not.toContain("/family");
    expect(hrefs).not.toContain("/admin");
    expect(hrefs).not.toContain("/partner/dashboard");
    expect(hrefs).not.toContain("/employee/dashboard");
    expect(hrefs).not.toContain("/team");
    expect(hrefs).not.toContain("/advisor");
  });

  it("shows partner home for partner role", () => {
    const hrefs = visiblePaletteItems({ role: "partner" }).map((i) => i.href);
    expect(hrefs).toContain("/partner/dashboard");
    expect(hrefs).not.toContain("/admin");
  });

  it("shows employee home when employer_id is set", () => {
    const hrefs = visiblePaletteItems({
      role: "user",
      employerId: "org-1",
    }).map((i) => i.href);
    expect(hrefs).toContain("/employee/dashboard");
  });

  it("shows full role set for admin", () => {
    const hrefs = visiblePaletteItems({ role: "admin" }).map((i) => i.href);
    expect(hrefs).toContain("/admin");
    expect(hrefs).toContain("/admin/analytics");
    expect(hrefs).toContain("/partner/dashboard");
    expect(hrefs).toContain("/employee/dashboard");
    expect(hrefs).toContain("/team");
    expect(hrefs).not.toContain("/advisor");
  });
});
