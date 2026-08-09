import { test, expect, type Page } from "@playwright/test";
import { dismissCookieConsent } from "./helpers/consent";

/**
 * Decision Lab smoke — codifies the manual passes that used to gate a tools
 * release (saved-vs-illustrative, the synthesis hand-off, the readiness band,
 * and honest scenario drift).
 *
 * Anonymous and local-only by design, like the CI-safe core of this suite:
 * `/tools` and `/scenarios` are PUBLIC product routes
 * (lib/auth/protected-routes.ts), and the Affordability lens plus the
 * saved-scenarios section of /scenarios are ungated, so every assertion here runs
 * without a session, secrets, or a live database — green on forks and in CI.
 *
 * State is seeded straight into the browser stores the app already reads
 * (homi:finance, homi:scenarios), so the specs drive the real components
 * without walking the full finance dashboard first. Keys mirror
 * lib/finance/store.ts, lib/tools/cfm.ts, lib/tools/scenarios.ts, and
 * lib/tools/digest.ts — these tests fail loudly if any of them drift.
 *
 * Not covered here (deliberate): the two-scenario comparison matrix. The
 * anonymous local store caps at one scenario (LOCAL_SCENARIO_CAP), so compare
 * needs a signed-in account; its math is covered by the unit suite
 * (__tests__/tools-scenarios.test.ts, compareScenarios). Drift — the
 * canon-critical "staleness is displayed, never silently refreshed" behavior —
 * IS covered below.
 */

const FINANCE_KEY = "homi:finance";
const FINANCE_STAMP_KEY = "homi:finance:updated-at";
const FINANCE_SAVED_AT_KEY = "homi:finance:saved-at";
const SCENARIOS_KEY = "homi:scenarios";
const DIGEST_KEY = "homi:lens-digest";

/** A saved money picture. income is deliberately 7200 so the drift spec can
 *  anchor a scenario at 6000 and see exactly one field named. */
const SEEDED_FINANCE = {
  monthlyIncome: 7200,
  monthlyExpenses: 3000,
  liquidSavings: 21000,
  totalDebt: 15000,
  monthlyDebtPayments: 500,
};

/** Seed saved finance state before the app mounts (partial — merged over
 *  DEFAULT_FINANCE_STATE by loadFinanceState). */
async function seedFinance(
  page: Page,
  finance: Record<string, number> = SEEDED_FINANCE,
): Promise<void> {
  await page.addInitScript(
    (args: { key: string; stampKey: string; savedKey: string; value: Record<string, number> }) => {
      localStorage.setItem(args.key, JSON.stringify(args.value));
      localStorage.setItem(args.stampKey, String(Date.now()));
      localStorage.setItem(args.savedKey, new Date().toISOString());
    },
    {
      key: FINANCE_KEY,
      stampKey: FINANCE_STAMP_KEY,
      savedKey: FINANCE_SAVED_AT_KEY,
      value: finance,
    },
  );
}

/** Guarantee a clean, illustrative starting point (no saved homi:* state). */
async function clearHomiStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("homi:")) localStorage.removeItem(k);
    }
  });
}

test.describe("Decision Lab — saved numbers vs illustrative", () => {
  test("no saved finance → illustrative strip, and no 'your numbers' tags", async ({ page }) => {
    await clearHomiStorage(page);
    await page.goto("/tools/affordability");
    await dismissCookieConsent(page);

    await expect(page.getByText("These are illustrative numbers.", { exact: false })).toBeVisible();
    // The "your numbers" tag only renders on CFM-seeded fields — none here.
    await expect(page.getByText("your numbers", { exact: true })).toHaveCount(0);
  });

  test("saved finance → 'built on your numbers', and seeded fields are tagged", async ({
    page,
  }) => {
    await seedFinance(page);
    await page.goto("/tools/affordability");
    await dismissCookieConsent(page);

    await expect(page.getByText("Built on your numbers", { exact: false })).toBeVisible();
    // income (derived) and debts (core.monthlyDebtPayments) seed from the CFM,
    // so at least one field carries the "your numbers" tag.
    await expect(page.getByText("your numbers", { exact: true }).first()).toBeVisible();
  });
});

test.describe("Decision Lab — synthesis hand-off", () => {
  test("digest lands in sessionStorage and the button opens the Companion", async ({ page }) => {
    await seedFinance(page);
    await page.goto("/tools/affordability");
    await dismissCookieConsent(page);

    const synth = page.getByRole("button", { name: "What does this change for me?" });
    await expect(synth).toBeVisible();

    // The lens publishes its precomputed digest for the Companion to read —
    // numeric-only, page-scoped. The AI never calculates; it reads this.
    await expect
      .poll(async () => page.evaluate((k) => window.sessionStorage.getItem(k), DIGEST_KEY))
      .toBeTruthy();
    const digest = JSON.parse(
      (await page.evaluate((k) => window.sessionStorage.getItem(k), DIGEST_KEY)) as string,
    );
    expect(digest.lensId).toBe("affordability");
    expect(digest.path).toBe("/tools/affordability");

    // Clicking opens the Companion dock with the synthesis question pre-seeded.
    await synth.click();
    await expect(page.getByRole("dialog", { name: "HōMI Companion" })).toBeVisible();
  });
});

test.describe("Decision Lab — readiness band", () => {
  test("renders magnitude language only (no digits), with the honest no-assessment note", async ({
    page,
  }) => {
    await seedFinance(page);
    await page.goto("/tools/affordability");
    await dismissCookieConsent(page);

    const heading = page.getByRole("heading", { name: "Readiness impact" });
    await expect(heading).toBeVisible();
    const band = heading.locator("xpath=ancestor::div[contains(@class,'glass')][1]");

    // Finance saved but no assessment on file → the band says so plainly
    // instead of inventing anchors.
    await expect(band.getByText("No assessment on file", { exact: false })).toBeVisible();

    // Canon: readiness impact is magnitude + direction ONLY — never a number,
    // never a weight. The whole band must contain no digit.
    const bandText = await band.innerText();
    expect(bandText).not.toMatch(/[0-9]/);
  });

  test("stays hidden entirely when there is no saved finance", async ({ page }) => {
    await clearHomiStorage(page);
    await page.goto("/tools/affordability");
    await dismissCookieConsent(page);

    // The page renders (illustrative), but the band never speaks on air.
    await expect(page.getByText("These are illustrative numbers.", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness impact" })).toHaveCount(0);
  });
});

test.describe("Decision Lab — scenario staleness", () => {
  test("drift is named on the card, never silently refreshed", async ({ page }) => {
    // Current income is 7200; the scenario was anchored at 6000 with every
    // other field unchanged — so exactly the income drift must be named.
    const scenario = {
      id: "e2e-decision-lab-1",
      name: "House at $420k",
      lensId: "mortgage",
      inputs: {
        price: 420000,
        downPayment: 84000,
        rate: 6.5,
        termYears: 30,
        taxInsRate: 1.5,
        hoaMonthly: 0,
      },
      cfmSnapshot: {
        monthlyIncome: 6000,
        monthlyExpenses: 3000,
        monthlyDebtPayments: 500,
        liquidSavings: 21000,
        totalDebt: 15000,
      },
      savedAt: new Date().toISOString(),
      origin: "local",
    };

    await seedFinance(page); // income 7200; other fields match the snapshot
    await page.addInitScript(
      (args: { key: string; value: unknown }) =>
        localStorage.setItem(args.key, JSON.stringify([args.value])),
      { key: SCENARIOS_KEY, value: scenario },
    );

    // D2: saved scenarios live on the canonical /scenarios page (#saved section).
    await page.goto("/scenarios#saved");
    await dismissCookieConsent(page);

    await expect(page.getByText("House at $420k")).toBeVisible();
    // Anonymous local scenarios are honestly labeled.
    await expect(page.getByText("this browser only", { exact: false })).toBeVisible();

    // The drift banner names the changed field and its prior value — and offers
    // a refresh rather than rewriting the saved decision.
    const banner = page.locator("p", { hasText: "Saved when your" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("income");
    await expect(banner).toContainText("$6,000");
    await expect(banner).toContainText("since changed");
  });
});
