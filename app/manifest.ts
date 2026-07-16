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
      // Threshold Compass + HōMI wordmark lockup. The scalable SVG (compass
      // only) is deliberately omitted here so every installed-PWA surface
      // renders the full wordmark lockup from these PNGs rather than the
      // bare compass a launcher might otherwise prefer from the SVG.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Full-bleed variant with the lockup pulled into the maskable safe zone
      // so Android's adaptive-icon mask (circle/squircle) never crops it.
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
