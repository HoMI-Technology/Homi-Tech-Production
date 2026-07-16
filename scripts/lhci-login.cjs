/**
 * LHCI puppeteer script — signs in before authenticated collections so
 * Lighthouse can measure the real dashboard (the surface the premium
 * redesign rebuilt, previously a CI blind spot).
 *
 * Wiring (see lighthouserc.dashboard.json + .github/workflows/lighthouse.yml):
 *  · Runs once per collect URL; no-ops for public pages.
 *  · Requires LHCI_TEST_EMAIL / LHCI_TEST_PASSWORD (a dedicated low-value
 *    test account — never a real user). In CI these come from repo secrets;
 *    the authenticated step is skipped entirely when they're absent.
 *  · The config must set settings.disableStorageReset: true or Lighthouse
 *    wipes the session cookies before measuring.
 *  · Sign-in is a client-side router.push, so we wait on the URL, not a
 *    document navigation.
 */

/* eslint-disable no-console */

const SIGN_IN_PATH = "/auth/sign-in";

module.exports = async (browser, context) => {
  const url = new URL(context.url);
  if (!url.pathname.startsWith("/dashboard")) return;

  const email = process.env.LHCI_TEST_EMAIL;
  const password = process.env.LHCI_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Authenticated Lighthouse collection needs LHCI_TEST_EMAIL and LHCI_TEST_PASSWORD (dedicated test account).",
    );
  }

  const page = await browser.newPage();
  try {
    await page.goto(new URL(SIGN_IN_PATH, url.origin).href, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    // An earlier run in this Chrome profile may already hold a session —
    // protected routes redirect signed-in visitors away from sign-in.
    if (!page.url().includes(SIGN_IN_PATH)) {
      console.log("lhci-login: session already active, skipping sign-in");
      return;
    }

    await page.waitForSelector("#email", { timeout: 15000 });
    await page.type("#email", email);
    await page.type("#password", password);
    await page.click('button[type="submit"]');

    // Success is a client-side redirect to the `next` target (/dashboard).
    await page.waitForFunction(
      (signInPath) => !window.location.pathname.startsWith(signInPath),
      { timeout: 30000 },
      SIGN_IN_PATH,
    );
    console.log(`lhci-login: signed in, landed on ${new URL(page.url()).pathname}`);
  } catch (err) {
    // Surface the on-page error message when sign-in failed — "check your
    // credentials" beats a bare timeout in CI logs.
    const formError = await page
      .$eval('[role="alert"]', (el) => el.textContent)
      .catch(() => null);
    throw new Error(
      `lhci-login failed${formError ? ` — sign-in page said: "${formError.trim()}"` : ""} (${err.message})`,
    );
  } finally {
    await page.close();
  }
};
