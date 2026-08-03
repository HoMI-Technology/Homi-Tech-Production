import type { MetadataRoute } from "next";

import { COLORS } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HōMI — Decision Readiness Intelligence™",
    short_name: "HōMI",
    description:
      "HōMI measures your true readiness for life's biggest decisions across Financial Reality, Emotional Truth, and Perfect Timing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    dir: "ltr",
    categories: ["finance", "lifestyle", "productivity"],
    background_color: COLORS.navy,
    theme_color: COLORS.navy,
    icons: [
      // Threshold Compass + HōMI wordmark lockup. The scalable SVG (compass
      // only) is deliberately omitted here so every installed-PWA surface
      // renders the full wordmark lockup from these PNGs rather than the
      // bare compass a launcher might otherwise prefer from the SVG.
      { src: "/icon-192-v2.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512-v2.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Full-bleed variant with the lockup pulled into the maskable safe zone
      // so Android's adaptive-icon mask (circle/squircle) never crops it.
      { src: "/icon-512-maskable-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "Your readiness dashboard",
        icons: [{ src: "/icon-192-v2.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Tools",
        url: "/tools",
        description: "Readiness calculators and tools",
        icons: [{ src: "/icon-192-v2.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    // Install-sheet previews (Android/desktop richer install UI). form_factor
    // "wide" drives the desktop/tablet layout, "narrow" the phone layout; a
    // manifest must carry at least one "wide" screenshot to get the richer
    // desktop install dialog at all. Captured from /how-it-works, which shows
    // the method end-to-end. All same-form-factor screenshots must share an
    // aspect ratio — narrow is 9:16, wide is 16:9.
    screenshots: [
      {
        src: "/screenshots/narrow-how-it-works.jpg",
        sizes: "540x960",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "How HōMI works — the method, three pillars, and honest verdict",
      },
      {
        src: "/screenshots/wide-how-it-works.jpg",
        sizes: "960x540",
        type: "image/jpeg",
        form_factor: "wide",
        label: "How HōMI works — the method, three pillars, and honest verdict",
      },
    ],
  };
}
