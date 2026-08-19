"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Client leaf so the shared SiteFooter can keep a server sitemap cut on every
 * route except `/`, where the quiet home footer mounts.
 */
export function SiteFooterSwitch({
  home,
  sitemap,
}: {
  home: ReactNode;
  sitemap: ReactNode;
}) {
  const pathname = usePathname();
  return pathname === "/" ? home : sitemap;
}
