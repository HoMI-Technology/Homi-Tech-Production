import { describe, expect, it } from "vitest";

import { LENSES } from "@/lib/tools/registry";
import { getAllGuideSlugs } from "@/components/marketing/guides-data";

/**
 * Dead-link guard for registry-driven tool → guide cross-references.
 * Every relatedGuide.href must resolve to a real destination: either a
 * data-driven guide (/guides/<slug> with slug in guides-data) or one of
 * the two dedicated guide pages. This keeps the registry from drifting
 * when guides are renamed or removed.
 */

const DEDICATED_GUIDE_PATHS = ["/guides/hard-stops", "/guides/glossary"];

const lensesWithGuides = LENSES.filter((lens) => lens.relatedGuide !== undefined);

describe("tool → guide cross-links", () => {
  it("has at least one lens with a related guide", () => {
    expect(lensesWithGuides.length).toBeGreaterThan(0);
  });

  it.each(lensesWithGuides.map((lens) => [lens.id, lens.relatedGuide!] as const))(
    "%s: href starts with /guides/ and label is non-empty",
    (_id, relatedGuide) => {
      expect(relatedGuide.href.startsWith("/guides/")).toBe(true);
      expect(relatedGuide.label.trim().length).toBeGreaterThan(0);
    },
  );

  it.each(lensesWithGuides.map((lens) => [lens.id, lens.relatedGuide!] as const))(
    "%s: href resolves to a real guide destination",
    (_id, relatedGuide) => {
      const validPaths = new Set([
        ...getAllGuideSlugs().map((slug) => `/guides/${slug}`),
        ...DEDICATED_GUIDE_PATHS,
      ]);
      expect(validPaths.has(relatedGuide.href)).toBe(true);
    },
  );

  it("hrefs carry no query, hash, or trailing slash", () => {
    for (const lens of lensesWithGuides) {
      const href = lens.relatedGuide!.href;
      expect(href).not.toMatch(/[?#]/);
      expect(href.endsWith("/")).toBe(false);
    }
  });
});
