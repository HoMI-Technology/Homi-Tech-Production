import { defineRouting } from "next-intl/routing";

/**
 * Central i18n routing config (Module A — feat/i18n).
 *
 * `en` is the default locale and stays unprefixed (`/`, `/pricing`, …) so
 * every existing URL keeps working. `es` is served under `/es/...`.
 * Locale detection is cookie-first (NEXT_LOCALE), then Accept-Language;
 * middleware.ts composes this routing with the existing auth/CSP gate.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: {
    name: "NEXT_LOCALE",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
});

export type AppLocale = (typeof routing.locales)[number];

/** Display names for the language switcher — always in the target language. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
};
