import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HōMI — Decision Readiness Intelligence",
    short_name: "HōMI",
    description:
      "HōMI measures your true readiness for life's biggest decisions across Financial Reality, Emotional Truth, and Perfect Timing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    dir: "ltr",
    categories: ["finance", "lifestyle", "productivity"],
    background_color: "#0a1628",
    theme_color: "#0a1628",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Dedicated full-bleed asset: the standard icon is a rounded rect with
      // transparent corners, which Android's adaptive-icon masks would crop.
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "Your readiness dashboard",
      },
      {
        name: "Tools",
        url: "/tools",
        description: "Readiness calculators and tools",
      },
    ],
  };
}
