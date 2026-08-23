import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo/tool-seo";
import { canonicalUrl } from "@/lib/seo/site";

/**
 * Redirect-placement lens: the page still renders, but /tools/affordability
 * is canonical — matching the sitemap, which excludes /tools/mortgage for
 * exactly this reason (see TOOL_SLUGS filter in app/sitemap.ts).
 */
export const metadata: Metadata = {
  ...toolMetadata("/tools/mortgage"),
  alternates: { canonical: canonicalUrl("/tools/affordability") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
