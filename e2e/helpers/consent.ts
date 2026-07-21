import type { Page } from "@playwright/test";

/** Dismiss the essential-cookies banner when it appears (blocks some clicks). */
export async function dismissCookieConsent(page: Page): Promise<void> {
  const accept = page.getByRole("button", { name: "Accept" });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}
