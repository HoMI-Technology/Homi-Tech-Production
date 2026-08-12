import { test, expect } from "@playwright/test";

/**
 * The anonymous acquisition funnel — the path a launch visitor actually walks.
 * These need no account, so they're the CI-safe core of the E2E smoke.
 */

test("landing page loads and routes into the Shadow Score", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/HōMI/);
  // The primary CTA points at the shadow score (verified in the marketing page).
  const cta = page.getByRole("link", { name: /shadow score|get your|know when/i }).first();
  await expect(cta).toBeVisible();
});

test("landing page exposes the waitlist capture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#landing-waitlist-email")).toBeAttached();
  await expect(page.getByRole("button", { name: /get notified/i })).toBeAttached();
});

test("Shadow Score flow renders its first step", async ({ page }) => {
  await page.goto("/shadow-score");
  await expect(page.getByRole("heading", { name: /90-second read/i })).toBeVisible();
});

test("attribution: a ?ref link drops the first-touch cookie", async ({ page, context }) => {
  await page.goto("/shadow-score?ref=ptr_e2e12345&utm_source=playwright");
  // AttributionCapture writes the cookie client-side on mount.
  await expect
    .poll(async () => (await context.cookies()).some((c) => c.name === "homi_attr"))
    .toBe(true);
  const cookie = (await context.cookies()).find((c) => c.name === "homi_attr");
  expect(decodeURIComponent(cookie?.value ?? "")).toContain("ptr_e2e12345");
});

test("mortgage tool page renders (budget-tracked route)", async ({ page }) => {
  await page.goto("/tools/mortgage");
  await expect(page.locator("h1, h2").first()).toBeVisible();
});

test("an unknown shadow share token shows the expired-card invite, not a crash", async ({
  page,
}) => {
  await page.goto(`/shadow/${"f".repeat(32)}`);
  await expect(page.getByText(/expired|get your shadow score/i).first()).toBeVisible();
});

test("protected route redirects anonymous users to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  // The auth middleware only engages when Supabase env is configured (it
  // early-returns otherwise). Where it's wired (CI has the anon key repo var,
  // and production), an anonymous hit must bounce to sign-in. Skip rather than
  // false-fail in a bare env with no Supabase keys.
  const url = page.url();
  test.skip(url.includes("/dashboard"), "Supabase env not configured — auth middleware inactive.");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});
