import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/site";
import { getAllPostSlugs } from "@/components/marketing/blog-data";
import { getAllGuideSlugs } from "@/components/marketing/guides-data";
import { getAllArticleSlugs } from "@/components/learning/learning-data";
import { LENSES } from "@/lib/tools/registry";

/**
 * Public tool lenses from the registry — no hand-copied list to drift.
 * Redirect placements (e.g. /tools/mortgage → /tools/affordability) stay out.
 * Preflight is listed separately as a static route with its own priority.
 */
const TOOL_SLUGS = LENSES.filter(
  (lens) => lens.path.startsWith("/tools/") && lens.placement !== "redirect",
)
  .map((lens) => lens.path.slice("/tools/".length))
  .filter((slug) => slug !== "preflight")
  .sort();

/** lastmod omitted — a generated timestamp per build is not a real last-change. */
function entry(
  path: string,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: canonicalUrl(path),
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // Static marketing & content routes. Not listed: /money (auth), /employee,
  // /waitlist, /status (system-status), /assessment (Assess is /first-moment),
  // /plan (noindex until it is a real public page), /tools/mortgage (canonicals
  // to /tools/affordability).
  const staticRoutes: MetadataRoute.Sitemap = [
    entry("/", "weekly", 1),
    entry("/about", "monthly", 0.8),
    entry("/how-it-works", "monthly", 0.9),
    entry("/method", "monthly", 0.8),
    entry("/b2b", "monthly", 0.7),
    entry("/partner", "monthly", 0.7),
    entry("/developers", "monthly", 0.6),
    // Content hub consolidation (D5): /guides is THE hub. /blog and /learning
    // index pages permanently redirect there and are delisted; their [slug]
    // routes still render and stay in the dynamic sections below.
    entry("/guides", "weekly", 0.8),
    entry("/pricing", "monthly", 0.7),
    entry("/tools", "monthly", 0.8),
    entry("/tools/preflight", "monthly", 0.6),
    entry("/scenarios", "monthly", 0.6),
    entry("/first-moment", "monthly", 0.8),
    entry("/shadow-score", "monthly", 0.7),
    entry("/legal/privacy", "yearly", 0.3),
    entry("/legal/terms", "yearly", 0.3),
    entry("/legal/disclaimer", "yearly", 0.3),
    entry("/legal/acceptable-use", "yearly", 0.3),
    entry("/legal/cookies", "yearly", 0.3),
    entry("/legal/dmca", "yearly", 0.3),
    entry("/legal/subprocessors", "yearly", 0.3),
  ];

  const blogRoutes: MetadataRoute.Sitemap = getAllPostSlugs().map((slug) =>
    entry(`/blog/${slug}`, "monthly", 0.6),
  );

  const guideRoutes: MetadataRoute.Sitemap = getAllGuideSlugs().map((slug) =>
    entry(`/guides/${slug}`, "monthly", 0.6),
  );

  const learningRoutes: MetadataRoute.Sitemap = getAllArticleSlugs().map((slug) =>
    entry(`/learning/${slug}`, "monthly", 0.6),
  );

  const toolRoutes: MetadataRoute.Sitemap = TOOL_SLUGS.map((slug) =>
    entry(`/tools/${slug}`, "monthly", 0.5),
  );

  return [...staticRoutes, ...blogRoutes, ...guideRoutes, ...learningRoutes, ...toolRoutes];
}
