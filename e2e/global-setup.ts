import { chromium, type FullConfig } from "@playwright/test";
import { englishLocaleCookie } from "./helpers/locale";

const LOCALE_STATE_PATH = "e2e/.locale-en.json";

/** Seeds storageState so every test context starts on English (unprefixed) routes. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.E2E_BASE_URL ??
    config.projects[0]?.use?.baseURL?.toString() ??
    "http://localhost:3000";

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([englishLocaleCookie(baseURL)]);
  await context.storageState({ path: LOCALE_STATE_PATH });
  await browser.close();
}
