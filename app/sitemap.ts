import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homitechnology.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/how-it-works",
    "/method",
    "/assessment",
    "/shadow-score",
    "/tools",
    "/guides",
    "/pricing",
    "/about",
    "/b2b",
    "/partner",
    "/employee",
    "/waitlist",
    "/legal/privacy",
    "/legal/terms",
    "/legal/disclaimer",
    "/legal/acceptable-use",
    "/legal/cookies",
    "/legal/dmca",
    "/legal/subprocessors",
  ];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
