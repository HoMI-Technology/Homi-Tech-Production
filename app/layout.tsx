import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { fraunces, inter, jetbrainsMono } from "@/app/fonts";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CONSENT_BOOT_SCRIPT } from "@/components/consent/consent-shared";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AppleSplashLinks } from "@/components/pwa/AppleSplashLinks";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { SITE_URL } from "@/lib/seo/site";
import { COLORS } from "@/lib/brand";

import { ClientProviders } from "@/components/layout/ClientProviders";
import { ErrorBoundary as UXErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HōMI · Decision Readiness Intelligence™",
    template: "%s · HōMI",
  },
  description:
    "HōMI is Decision Readiness Intelligence™ — a decision companion that helps you evaluate your readiness for life's biggest decisions. Not 'can you afford it?' — 'are you ready for it?'",
  applicationName: "HōMI",
  keywords: [
    "decision readiness",
    "home buying readiness",
    "financial reality",
    "emotional truth",
    "perfect timing",
    "decision companion",
  ],
  openGraph: {
    title: "HōMI · Decision Readiness Intelligence™",
    description:
      "Readiness, not eligibility. Decision Readiness Intelligence™ across Financial Reality, Emotional Truth, and Perfect Timing.",
    siteName: "HōMI",
    type: "website",
    images: [
      {
        url: "/og-v2.png",
        width: 1200,
        height: 630,
        alt: "The HōMI Threshold Compass above the HōMI wordmark — Decision Readiness Intelligence™. Know When You're Ready.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@homi_tech",
    creator: "@homi_tech",
    title: "HōMI · Decision Readiness Intelligence™",
    description:
      "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself.",
    images: [
      {
        url: "/og-v2.png",
        alt: "The HōMI Threshold Compass above the HōMI wordmark — Decision Readiness Intelligence™. Know When You're Ready.",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon-v2.svg", type: "image/svg+xml" },
      { url: "/icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512-v2.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon-v2.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-512-v2.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "HōMI",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: COLORS.navy,
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) on notched iPhones / installed PWA.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <AppleSplashLinks />
      </head>
      <body suppressHydrationWarning className="field grain min-h-screen">
        <script dangerouslySetInnerHTML={{ __html: CONSENT_BOOT_SCRIPT }} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-slate-surface focus:px-4 focus:py-2 focus:text-light"
        >
          Skip to content
        </a>
        <ToastProvider>
          <UXErrorBoundary
            name="client-providers"
            fallback={<div id="main-fallback">{children}</div>}
          >
            <ClientProviders>{children}</ClientProviders>
          </UXErrorBoundary>
        </ToastProvider>
        <CookieConsent />
        <AnalyticsScripts />
        <PageViewBeacon />
        <ServiceWorkerRegister />
        <AttributionCapture />
        {process.env.VERCEL === "1" && <SpeedInsights />}
        {process.env.VERCEL === "1" && <Analytics />}
      </body>
    </html>
  );
}
