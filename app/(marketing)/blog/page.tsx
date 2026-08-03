import { permanentRedirect } from "next/navigation";

/**
 * Content hub consolidation (D5): /guides is THE hub. The blog index folded
 * into /guides ("From the blog" section); individual posts still render at
 * /blog/[slug], so deep links keep working.
 */
export default function BlogHubPage() {
  permanentRedirect("/guides");
}
