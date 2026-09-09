import { expect, type Page } from "@playwright/test";

/** Assert a KILL URL followed redirects and landed on `/`. */
export async function expectKillToHome(page: Page, path: string): Promise<void> {
  await page.goto(path);
  expect(new URL(page.url()).pathname).toBe("/");
}
