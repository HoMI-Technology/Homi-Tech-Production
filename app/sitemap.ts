import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { getAllPostSlugs } from "@/components/marketing/blog-data";
import { getAllGuideSlugs } from "@/components/marketing/guides-data";
import { getAllArticleSlugs } from "@/components/learning/learning-data";
import { LENSES } from "@/lib/tools/registry";

/**
 * Tool slugs derived from the lens registry (the single declarative contract
 * for every decision tool) — no hand-copied list to drift. Preflight is
 * excluded here because it is listed separately as a static route
 * (/tools/preflight) with its own priority.
 */
const TOOL_SLUGS = LENSES.map((lens) => lens.path)
  .filter((path) => path.startsWith("/tools/"))
  .map((path) => path.slice("/tools/".length))
  .filter((slug) => slug !== "preflight")
  .sort();

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  // Static marketing & product routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/method`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/b2b`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/partner`, changeFrequency: "monthly", priority: 0.7 },
    // Content hub consolidation (D5): /guides is THE hub. /blog and /learning
    // index pages permanently redirect there and are delisted; their [slug]
    // routes still render and stay in the dynamic sections below.
    { url: `${base}/guides`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/status`, changeFrequency: "monthly", priority: 0.4 },
    // Money Reality (signed-in). Public tools hub remains crawlable.
    { url: `${base}/money`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/tools`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/tools/preflight`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/scenarios`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/assessment`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/first-moment`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/shadow-score`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/employee`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.5 },
    // Legal
    { url: `${base}/legal/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/disclaimer`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/acceptable-use`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/cookies`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/dmca`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/subprocessors`, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Dynamic content routes
  const blogRoutes: MetadataRoute.Sitemap = getAllPostSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const guideRoutes: MetadataRoute.Sitemap = getAllGuideSlugs().map((slug) => ({
    url: `${base}/guides/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const learningRoutes: MetadataRoute.Sitemap = getAllArticleSlugs().map((slug) => ({
    url: `${base}/learning/${slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const toolRoutes: MetadataRoute.Sitemap = TOOL_SLUGS.map((slug) => ({
    url: `${base}/tools/${slug}`,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...blogRoutes, ...guideRoutes, ...learningRoutes, ...toolRoutes];
}
