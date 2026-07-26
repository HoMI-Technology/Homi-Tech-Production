import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { fraunces, inter, jetbrainsMono } from "@/app/fonts";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { CookieConsent } from "@/components/consent/CookieConsent";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CONSENT_BOOT_SCRIPT } from "@/components/consent/consent-shared";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { AppleSplashLinks } from "@/components/pwa/AppleSplashLinks";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { PageViewBeacon } from "@/components/analytics/PageViewBeacon";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { SITE_URL } from "@/lib/seo/site";

import { ClientProviders } from "@/components/layout/ClientProviders";
import { UXErrorBoundary } from "@/components/layout/ErrorBoundary";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HōMI · Decision Readiness Intelligence™",
    template: "%s · HōMI",
  },
  description:
    "HōMI is Decision Readiness Intelligence™ — the first platform that measures your true readiness for life's biggest decisions. Not 'can you afford it?' — 'are you ready for it?'",
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
      "Everyone else tells you how. HōMI tells you if. Decision Readiness Intelligence™ across Financial Reality, Emotional Truth, and Perfect Timing.",
    siteName: "HōMI",
    type: "website",
    images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "The HōMI Threshold Compass above the HōMI wordmark — Decision Readiness Intelligence™. Know When You're Ready." }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@homi_tech",
    creator: "@homi_tech",
    title: "HōMI · Decision Readiness Intelligence™",
    description: "Credit scores look backward. HōMI looks at readiness now.",
    images: [{ url: "/og-v2.png", alt: "The HōMI Threshold Compass above the HōMI wordmark — Decision Readiness Intelligence™. Know When You're Ready." }],
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
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
};

/** Pre-render both locales for every static route. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Unknown locale prefixes (e.g. /fr/...) fall through to the 404.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enables static rendering while keeping per-request translations.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
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
        {/* Messages come from i18n/request.ts via the Next.js plugin — every
            client component under this layout can use useTranslations. */}
        <NextIntlClientProvider locale={locale}>
          <UXErrorBoundary name="client-providers" fallback={<div id="main-fallback">{children}</div>}>
            <ClientProviders>{children}</ClientProviders>
          </UXErrorBoundary>
        </NextIntlClientProvider>
        <CookieConsent />
        <AnalyticsScripts />
        <PageViewBeacon />
        <ServiceWorkerRegister />
        <AttributionCapture />
        {process.env.VERCEL === "1" && <SpeedInsights />}
      </body>
    </html>
  );
}
