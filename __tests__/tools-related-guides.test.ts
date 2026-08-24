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

/**
 * Wiring guard (GAMMA review S1): a dropped `relatedGuide={LENS.relatedGuide}`
 * on a page, or a broken ToolShell conditional, must fail the suite — the
 * dead-link checks above cannot see rendering.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ToolShell } from "@/components/tools/ToolShell";

describe("related-guide rendering and page wiring", () => {
  it("ToolShell renders the link when given, and nothing when absent", () => {
    const withGuide = renderToStaticMarkup(
      createElement(ToolShell, {
        title: "T",
        subtitle: "S",
        relatedGuide: { href: "/guides/build-first-playbook", label: "The Build First Playbook" },
        children: null,
      } as never),
    );
    expect(withGuide).toContain("Related guide");
    expect(withGuide).toContain('href="/guides/build-first-playbook"');
    expect(withGuide).toContain("The Build First Playbook");

    const without = renderToStaticMarkup(
      createElement(ToolShell, { title: "T", subtitle: "S", children: null } as never),
    );
    expect(without).not.toContain("Related guide");
  });

  it("every lens with a relatedGuide has its page passing the prop", () => {
    for (const lens of lensesWithGuides) {
      const slug = lens.path.split("/").pop()!;
      const page = readFileSync(
        join(process.cwd(), "app", "(product)", "tools", slug, "page.tsx"),
        "utf8",
      );
      expect(page, `${lens.path} page does not wire relatedGuide`).toContain(
        "relatedGuide={LENS.relatedGuide}",
      );
    }
  });
});
