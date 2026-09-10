import { test, expect } from "@playwright/test";
import { expectKillToHome } from "./helpers/kill";

/**
 * KEEP acquisition surfaces plus KILL → `/` (PR15).
 * These need no account, so they're the CI-safe core of the E2E smoke.
 */

test("landing page loads with HōMI brand and Assess close", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/HōMI/);
  const cta = page.getByRole("link", { name: /^assess$/i }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/first-moment");
});

test("landing page does not expose the waitlist capture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#waitlist")).toHaveCount(0);
  await expect(page.locator("#landing-waitlist-email")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^get notified$/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^assess$/i }).first()).toBeVisible();
  await expect(page.getByText("Packet 2")).toHaveCount(0);
  await expect(page.getByText("Rehearse", { exact: true })).toHaveCount(0);
  const waitlist = page.getByRole("contentinfo").getByRole("link", { name: /^waitlist$/i });
  await expect(waitlist).toBeVisible();
  await expect(waitlist).toHaveAttribute("href", "/waitlist");
});

test("footer KEEP links: legal, support, waitlist, X, TikTok", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: /^privacy$/i })).toHaveAttribute(
    "href",
    "/legal/privacy",
  );
  await expect(footer.getByRole("link", { name: /^terms$/i })).toHaveAttribute("href", "/legal/terms");
  await expect(footer.getByRole("link", { name: /^cookies$/i })).toHaveAttribute(
    "href",
    "/legal/cookies",
  );
  await expect(footer.getByRole("link", { name: /^support$/i })).toHaveAttribute(
    "href",
    "mailto:support@homitechnology.com",
  );
  await expect(footer.getByRole("link", { name: /^waitlist$/i })).toHaveAttribute("href", "/waitlist");
  await expect(footer.getByRole("link", { name: /HōMI on X/i })).toBeVisible();
  await expect(footer.getByRole("link", { name: /HōMI on TikTok/i })).toBeVisible();
  await expect(footer.getByText(/educational guidance only/i)).toBeVisible();
});

test("waitlist page loads", async ({ page }) => {
  await page.goto("/waitlist");
  await expect(page).toHaveURL(/\/waitlist/);
  await expect(page.getByRole("heading", { name: /your turn/i })).toBeVisible();
});

test("KEEP legal pages load", async ({ page }) => {
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  await page.goto("/legal/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service", exact: true })).toBeVisible();
  await page.goto("/legal/cookies");
  await expect(page.getByRole("heading", { name: "Cookie Policy", exact: true })).toBeVisible();
});

test("extra legal folds to /legal/privacy", async ({ page }) => {
  await page.goto("/legal/disclaimer");
  expect(new URL(page.url()).pathname).toBe("/legal/privacy");
});

test("attribution: a ?ref link on `/` drops the first-touch cookie", async ({ page, context }) => {
  await page.goto("/?ref=ptr_e2e12345&utm_source=playwright");
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name === "homi_attr"))
    .toBe(true);
  const cookie = (await context.cookies()).find((c) => c.name === "homi_attr");
  expect(decodeURIComponent(cookie?.value ?? "")).toContain("ptr_e2e12345");
});

test("KILL product and extra marketing URLs land on `/`", async ({ page }) => {
  for (const path of [
    "/dashboard",
    "/home",
    "/assessment",
    "/first-moment",
    "/shadow-score",
    "/tools/mortgage",
    "/pricing",
    "/how-it-works",
    "/results",
    "/admin",
    "/partner/dashboard",
    `/shadow/${"f".repeat(32)}`,
  ]) {
    await expectKillToHome(page, path);
  }
});
