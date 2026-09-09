import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/site";

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

/**
 * PR15 KEEP crawl set. Killed product/marketing extras must not appear here
 * so crawlers stop requesting URLs that only 307 to `/`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", "weekly", 1),
    entry("/waitlist", "monthly", 0.5),
    entry("/legal/privacy", "yearly", 0.3),
    entry("/legal/terms", "yearly", 0.3),
    entry("/legal/cookies", "yearly", 0.3),
  ];
}
