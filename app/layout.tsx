import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HōMI · Know When You're Ready",
    template: "%s · HōMI",
  },
  description:
    "HōMI is Decision Readiness Intelligence™ — the first platform that measures your true readiness for life's biggest decisions. Not 'can you afford it?' — 'are you ready for it?'",
  applicationName: "HōMI",
  alternates: { canonical: "/" },
  keywords: [
    "decision readiness",
    "home buying readiness",
    "financial reality",
    "emotional truth",
    "perfect timing",
    "decision companion",
  ],
  openGraph: {
    title: "HōMI · Know When You're Ready",
    description:
      "Everyone else tells you how. HōMI tells you if. Decision Readiness Intelligence™ across Financial Reality, Emotional Truth, and Perfect Timing.",
    siteName: "HōMI",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "HōMI Threshold Compass — Credit scores look backward. HōMI looks at readiness now." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HōMI · Know When You're Ready",
    description: "Credit scores look backward. HōMI looks at readiness now.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "HōMI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="field grain min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-surface focus:px-4 focus:py-2 focus:text-light"
        >
          Skip to content
        </a>
        {children}
        <CookieConsent />
        <AnalyticsScripts />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
