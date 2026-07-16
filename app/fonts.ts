import localFont from "next/font/local";

/**
 * Brand fonts via next/font/local, pointed at the same @fontsource-variable
 * files the old CSS @imports used — identical glyphs, radically better
 * loading:
 *
 *  · Preload: the woff2s start downloading with the HTML instead of being
 *    discovered after the stylesheet. Under slow networks the swap from
 *    fallback → webfont was re-triggering Largest Contentful Paint 1-2s
 *    after first paint on every marketing page (the last cause of the
 *    site-wide Lighthouse LCP failures).
 *  · Size-adjusted fallbacks: next/font metrics-matches Arial/Times so the
 *    swap doesn't shift layout (CLS).
 *
 * JetBrains Mono is numerals-only chrome (scores, deltas) — loaded the same
 * way but not preloaded, so it never competes with the text fonts for
 * first-paint bandwidth.
 */

export const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

export const fraunces = localFont({
  src: "../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-fraunces",
});

export const jetbrainsMono = localFont({
  src: "../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  display: "swap",
  variable: "--font-jbm",
  preload: false,
});
