import { QuietHomeFooter } from "@/components/layout/QuietHomeFooter";
import { SitemapFooter } from "@/components/layout/SitemapFooter";
import { SiteFooterSwitch } from "@/components/layout/SiteFooterSwitch";

/**
 * Shared site footer. Pathname `/` renders the quiet three-row cut; every
 * other route keeps the five-column sitemap (Product / Learn / For Teams /
 * Legal + legal wall + copyright + socials + DRI pipe).
 */
export function SiteFooter() {
  return (
    <SiteFooterSwitch home={<QuietHomeFooter />} sitemap={<SitemapFooter />} />
  );
}
