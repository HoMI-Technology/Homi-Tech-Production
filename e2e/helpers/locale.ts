import type { BrowserContext, Page } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Cookie next-intl reads first — pins unprefixed English routes in E2E. */
export function englishLocaleCookie(baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000") {
  return {
    name: "NEXT_LOCALE",
    value: "en",
    url: baseURL,
    sameSite: "Lax" as const,
  };
}

export async function pinEnglishLocale(context: BrowserContext): Promise<void> {
  await context.addCookies([englishLocaleCookie()]);
}

/** Pin locale on the default context and every navigation in this page. */
export async function pinEnglishLocalePage(page: Page): Promise<void> {
  await pinEnglishLocale(page.context());
  await page.addInitScript(() => {
    document.cookie = "NEXT_LOCALE=en; path=/; max-age=31536000; samesite=lax";
  });
}
