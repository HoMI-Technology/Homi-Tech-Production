import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import en from "../messages/en.json";
import es from "../messages/es.json";

/**
 * Static catalogs avoid webpack dynamic-JSON races under concurrent
 * `next dev` compilation (Playwright CI was seeing intermittent
 * `JSON.parse` failures on `/[locale]/*` when messages were
 * `await import(\`../messages/${locale}.json\`)`).
 */
const catalogs = { en, es } as const;

/**
 * Per-request next-intl config: resolves the negotiated locale and loads
 * its message catalog. Unknown locales fall back to English so deep product
 * pages (not yet translated) keep rendering English copy.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: catalogs[locale as keyof typeof catalogs] ?? catalogs.en,
  };
});
