import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export const ROBOTS_DISALLOW = [
  "/api/",
  "/admin",
  "/dashboard",
  "/auth/callback",
  "/advisor",
  "/decisions",
  "/genome",
  "/trinity",
  "/twin",
  "/money",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
