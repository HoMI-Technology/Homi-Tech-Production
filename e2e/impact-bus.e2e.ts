import { expect, test, type Page } from "@playwright/test";
import { dismissCookieConsent } from "./helpers/consent";

/**
 * Impact Bus (PR #127) — anonymous, seeded-localStorage flows only. No auth
 * user, no service-role key, no Stripe, no production Supabase writes.
 *
 * Two tiers, selected by NEXT_PUBLIC_FF_IMPACT_BUS (forwarded to the dev
 * server by playwright.config.ts):
 *  - "@flag-off": Path completion works with zero Impact Bus surface;
 *  - "@flag-on":  toast/transport/analytics contract with the bus enabled.
 *
 * The session-expiry collision case (S10/P14) is covered deterministically in
 * components/readiness/ImpactToast.test.tsx — the session toast only mounts
 * for signed-in users, which anonymous e2e cannot become without live
 * secrets.
 */

const IMPACT_BUS_ON = process.env.NEXT_PUBLIC_FF_IMPACT_BUS === "true";
const LAST_IMPACT_KEY = "homi:last-impact:v1";
const LEGACY_LAST_IMPACT_KEY = "homi:last-impact";
const IMPACT_EVENT_NAME = "homi:impact:v1";

// window.__homiEvents is declared globally by lib/analytics.ts.
declare global {
  interface Window {
    __impactEvents?: number[];
  }
}

const SAMPLE_ASSESSMENT = {
  inputs: {
    debtToIncomeRatio: 0.25,
    downPaymentPercent: 0.2,
    emergencyFundMonths: 0.5,
    creditScore: 750,
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 9,
    fomoLevel: 3,
    timeHorizonMonths: 18,
    savingsRate: 0.22,
    downPaymentProgress: 0.85,
    monthlyHousingRatio: 0.3,
  },
  result: {
    score: 42,
    verdict: "NOT_YET",
    financial: { debtToIncome: 8, downPayment: 8, emergencyFund: 1, creditHealth: 6, total: 23 },
    emotional: {
      lifeStability: 7,
      confidenceLevel: 6,
      partnerAlignment: 8,
      fomoCheck: 6,
      total: 27,
      singleRedistribution: false,
    },
    timing: { timeHorizon: 8, savingsRate: 8, downPaymentProgress: 8, total: 24 },
    warnings: [],
    hardStops: [{ code: "RUNWAY_UNDER_1_MONTH", message: "Emergency runway under one month." }],
  },
  completedAt: new Date().toISOString(),
  kind: "full",
};

type SeedStep = {
  id: string;
  title: string;
  reasonCode: string;
  status?: "pending" | "done" | "skipped";
  completedAt?: string | null;
};

function seedSteps(steps: SeedStep[]) {
  return steps.map((s, i) => ({
    id: s.id,
    title: s.title,
    kind: s.reasonCode === "REASSESS" ? "review" : "deadline",
    daysFromNow: 3 + i,
    reasonCode: s.reasonCode,
    href: s.reasonCode === "REASSESS" ? "/assessment" : "/tools/runway",
    notes: "Protective gate — educational only.",
    fundingTarget: null,
    fundingLabel: null,
    status: s.status ?? "pending",
    completedAt: s.completedAt ?? null,
  }));
}

function samplePath(steps: SeedStep[]) {
  return {
    id: "e2e-impact-path",
    version: 1,
    createdAt: new Date().toISOString(),
    assessmentCompletedAt: new Date().toISOString(),
    verdict: "NOT_YET",
    score: 42,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_only",
    disclaimer: "Educational readiness only.",
    mode: "build",
    calendarCommittedAt: null,
    steps: seedSteps(steps),
  };
}

async function seedAndInstrument(page: Page, steps: SeedStep[]): Promise<void> {
  await page.addInitScript(
    ({ assessment, path, eventName }) => {
      // Seed once per browser session — init scripts re-run on every
      // navigation, and re-seeding would silently reset completions the
      // replay/duplicate cases depend on.
      if (!sessionStorage.getItem("homi:e2e-impact-seeded")) {
        sessionStorage.setItem("homi:e2e-impact-seeded", "1");
        localStorage.setItem("homi:last-assessment", JSON.stringify(assessment));
        localStorage.setItem("homi:readiness-path", JSON.stringify(path));
        localStorage.setItem("homi:readiness-path:updated-at", String(Date.now()));
      }
      // Instrumentation is per-document: count real impact events.
      window.__impactEvents = [];
      window.addEventListener(eventName, () => {
        window.__impactEvents?.push(1);
      });
    },
    {
      assessment: SAMPLE_ASSESSMENT,
      path: samplePath(steps),
      eventName: IMPACT_EVENT_NAME,
    },
  );
}

async function gotoPath(page: Page, url = "/path"): Promise<void> {
  await page.goto(url);
  await dismissCookieConsent(page);
  await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible({
    timeout: 20_000,
  });
}

function toastRegion(page: Page) {
  return page
    .locator('[role="status"]')
    .filter({ has: page.getByRole("button", { name: "Dismiss Path progress" }) });
}

async function analyticsCount(page: Page, name: string): Promise<number> {
  return page.evaluate(
    (n) => (window.__homiEvents ?? []).filter((e) => e.event === n).length,
    name,
  );
}

async function impactEventCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__impactEvents?.length ?? 0);
}

async function storedStepStatus(page: Page, stepId: string): Promise<string | undefined> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem("homi:readiness-path");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { steps?: Array<{ id: string; status?: string }> };
    return parsed.steps?.find((s) => s.id === id)?.status;
  }, stepId);
}

async function sessionKey(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => sessionStorage.getItem(k), key);
}

// ---------------------------------------------------------------------------
// @flag-off — raw Path behavior with zero Impact Bus surface
// ---------------------------------------------------------------------------

test.describe("Impact Bus @flag-off contract", () => {
  test.skip(IMPACT_BUS_ON, "runs only with NEXT_PUBLIC_FF_IMPACT_BUS=false");

  test("@flag-off completion works with no toast, no transport, no impact event", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    await expect(page.getByText(/done/i).first()).toBeVisible({ timeout: 10_000 });
    expect(await storedStepStatus(page, "s1")).toBe("done");

    // Zero Impact Bus surface
    await expect(toastRegion(page)).toHaveCount(0);
    expect(await sessionKey(page, LAST_IMPACT_KEY)).toBeNull();
    expect(await impactEventCount(page)).toBe(0);

    // Transition analytics still fire exactly once, surface-tagged
    expect(await analyticsCount(page, "path_step_done")).toBe(1);
    expect(await analyticsCount(page, "path_first_step_done")).toBe(1);
    const done = await page.evaluate(
      () => (window.__homiEvents ?? []).find((e) => e.event === "path_step_done")?.props,
    );
    expect(done?.surface).toBe("path_page");

    // Skip stays on the raw flow: no done analytics, no toast
    await page.getByRole("button", { name: "Skip" }).first().click();
    await expect(page.getByText(/skipped/i).first()).toBeVisible({ timeout: 10_000 });
    expect(await storedStepStatus(page, "r1")).toBe("skipped");
    expect(await analyticsCount(page, "path_step_done")).toBe(1);
    await expect(toastRegion(page)).toHaveCount(0);
    expect(await impactEventCount(page)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// @flag-on — toast, transport, analytics
// ---------------------------------------------------------------------------

test.describe("Impact Bus @flag-on", () => {
  test.skip(!IMPACT_BUS_ON, "requires NEXT_PUBLIC_FF_IMPACT_BUS=true");

  test("@flag-on P1/P5: completion shows one honest toast, score untouched", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    const assessmentBefore = await page.evaluate(() =>
      localStorage.getItem("homi:last-assessment"),
    );
    await expect(page.getByText(/Score 42/).first()).toBeVisible();

    await page.getByRole("button", { name: "Mark done" }).first().click();

    // One toast; last actionable done + reassess pending → protective copy,
    // and never an all-Path-complete claim (P5).
    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText("Protective steps complete");
    await expect(toast).toContainText("Reassess when your real inputs change.");
    await expect(toast).not.toContainText(/Path complete|locked in|Score|\+\d/);

    // Score displayed and stored: exactly unchanged. (The header line also
    // shows "% resolved", which legitimately moves — assert the score token,
    // not the whole line.)
    await expect(page.getByText(/Score 42/).first()).toBeVisible();
    await expect(page.getByText(/Score (?!42\b)\d+/)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("homi:last-assessment"))).toBe(
      assessmentBefore,
    );

    // One transition, one impact event, one done + one first-step analytics
    expect(await storedStepStatus(page, "s1")).toBe("done");
    expect(await impactEventCount(page)).toBe(1);
    expect(await analyticsCount(page, "path_step_done")).toBe(1);
    expect(await analyticsCount(page, "path_first_step_done")).toBe(1);

    // Consume-once: the stored copy was cleared when the toast displayed
    expect(await sessionKey(page, LAST_IMPACT_KEY)).toBeNull();
  });

  test("@flag-on P2/P12: no duplicate transition, no replay on navigation", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    await expect(toastRegion(page)).toHaveCount(1);
    const completedAt = await page.evaluate(() => {
      const parsed = JSON.parse(localStorage.getItem("homi:readiness-path")!) as {
        steps: Array<{ id: string; completedAt: string | null }>;
      };
      return parsed.steps.find((s) => s.id === "s1")?.completedAt;
    });
    expect(completedAt).toBeTruthy();

    // The done step exposes no second Mark done control; count halves.
    await expect(page.getByRole("button", { name: "Mark done" })).toHaveCount(1);

    // Remount via navigation: no replay (stored transport was consumed).
    await page.goto("/dashboard");
    await gotoPath(page);
    await expect(toastRegion(page)).toHaveCount(0);
    const completedAtAfter = await page.evaluate(() => {
      const parsed = JSON.parse(localStorage.getItem("homi:readiness-path")!) as {
        steps: Array<{ id: string; completedAt: string | null }>;
      };
      return parsed.steps.find((s) => s.id === "s1")?.completedAt;
    });
    expect(completedAtAfter).toBe(completedAt);
  });

  test("@flag-on P3: skip produces no toast, no impact, no done analytics", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Skip" }).first().click();
    await expect(page.getByText(/skipped/i).first()).toBeVisible({ timeout: 10_000 });
    expect(await storedStepStatus(page, "s1")).toBe("skipped");
    await expect(toastRegion(page)).toHaveCount(0);
    expect(await impactEventCount(page)).toBe(0);
    expect(await analyticsCount(page, "path_step_done")).toBe(0);
    expect(await analyticsCount(page, "path_first_step_done")).toBe(0);
  });

  test("@flag-on P4: intermediate completion names the next actionable step", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText("Step marked complete");
    await expect(toast).toContainText("1 of 2 protective steps marked complete.");
    await expect(toast).toContainText("Next: Rebuild credit history.");
  });

  test("@flag-on P6: resolved-with-skips says Path reviewed with distinct counts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      {
        id: "s0",
        title: "Skipped earlier step",
        reasonCode: "PILLAR_EMOTIONAL",
        status: "skipped",
        completedAt: new Date().toISOString(),
      },
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText("Path reviewed");
    await expect(toast).toContainText("1 complete · 1 skipped.");
    await expect(toast).toContainText("Revisit skipped steps");
    await expect(toast).not.toContainText(/protective steps complete/i);
  });

  test("@flag-on P7: reassessment completion is silent and never 'No path progress'", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      {
        id: "s1",
        title: "Stabilize emergency runway",
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        status: "done",
        completedAt: new Date().toISOString(),
      },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    await expect(page.getByText(/done/i).first()).toBeVisible({ timeout: 10_000 });
    expect(await storedStepStatus(page, "r1")).toBe("done");
    await expect(toastRegion(page)).toHaveCount(0);
    await expect(page.getByText("No path progress")).toHaveCount(0);
    expect(await impactEventCount(page)).toBe(0);
    // Real transition → real analytics (reassessment policy), still no toast.
    expect(await analyticsCount(page, "path_step_done")).toBe(1);
  });

  test("@flag-on P8: finishing the last step yields Path-steps-complete copy", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      {
        id: "s1",
        title: "Stabilize emergency runway",
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        status: "done",
        completedAt: new Date().toISOString(),
      },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
    ]);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();
    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    await expect(toast).toContainText("Path steps complete");
    await expect(toast).not.toContainText(/Score|\+\d|readiness improved/i);
  });

  // /es/demo is not a locale route anymore — i18n was removed in #125 and
  // next.config.ts 308s (permanent: true) /es/:path* onto the unprefixed route. Visiting it
  // proves the legacy alias still lands on the isolated demo surface.
  for (const demoUrl of ["/demo", "/es/demo"]) {
    test(`@flag-on P9/P10: ${demoUrl} never shows a real impact and clears transport`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.addInitScript(
        ({ v1Key, legacyKey, impact }) => {
          // Freshly-stamped real impact waiting in the transport when the
          // demo surface mounts — it must be discarded, not displayed.
          sessionStorage.setItem(
            v1Key,
            JSON.stringify({ ...impact, at: new Date().toISOString() }),
          );
          sessionStorage.setItem(legacyKey, "{}");
        },
        {
          v1Key: LAST_IMPACT_KEY,
          legacyKey: LEGACY_LAST_IMPACT_KEY,
          impact: {
            v: 1,
            actionKind: "path_step_done",
            impactId: "e2e-demo-leak-check",
            pathId: "e2e-impact-path",
            pathMode: "build",
            stepId: "s1",
            reasonCode: "RUNWAY_UNDER_1_MONTH",
            stepTitle: "Stabilize emergency runway",
            before: {
              actionable: { total: 1, done: 0, skipped: 0, pending: 1 },
              reassessment: { total: 0, done: 0, skipped: 0, pending: 0 },
              completedRatio: 0,
              resolvedRatio: 0,
            },
            after: {
              actionable: { total: 1, done: 1, skipped: 0, pending: 0 },
              reassessment: { total: 0, done: 0, skipped: 0, pending: 0 },
              completedRatio: 1,
              resolvedRatio: 1,
            },
          },
        },
      );

      await page.goto(demoUrl);
      await dismissCookieConsent(page);
      await expect(page.getByText(/Demo data/i).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(toastRegion(page)).toHaveCount(0);
      await expect
        .poll(async () => sessionKey(page, LAST_IMPACT_KEY), { timeout: 10_000 })
        .toBeNull();
      expect(await sessionKey(page, LEGACY_LAST_IMPACT_KEY)).toBeNull();
    });
  }

  test("@flag-on P11: denied sessionStorage write still completes and notifies", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
    ]);
    await page.addInitScript((deniedKey) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function patched(key: string, value: string) {
        if (key === deniedKey) throw new Error("storage denied (e2e)");
        return original.call(this, key, value);
      };
    }, LAST_IMPACT_KEY);
    await gotoPath(page);

    await page.getByRole("button", { name: "Mark done" }).first().click();

    // Path completion survives; the event fallback still shows the toast.
    expect(await storedStepStatus(page, "s1")).toBe("done");
    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    await expect(toast).not.toContainText(/locked in|saved|synced/i);
    expect(await impactEventCount(page)).toBe(1);
    expect(await sessionKey(page, LAST_IMPACT_KEY)).toBeNull();

    // App remains functional
    await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible();
  });

  test("@flag-on P13: rapid sequential completions — latest impact wins", async ({ page }) => {
    test.setTimeout(90_000);
    await seedAndInstrument(page, [
      { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
      { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
      { id: "r1", title: "Re-take the assessment", reasonCode: "REASSESS" },
    ]);
    await gotoPath(page);

    // Two distinct steps completed back-to-back — target each step's own
    // control so a slow re-render can never double-click the same step.
    await page
      .locator("li", { hasText: "Stabilize emergency runway" })
      .getByRole("button", { name: "Mark done" })
      .click();
    await page
      .locator("li", { hasText: "Rebuild credit history" })
      .getByRole("button", { name: "Mark done" })
      .click();

    const toast = toastRegion(page);
    await expect(toast).toHaveCount(1);
    // Final state: both actionable done, reassess pending → protective copy,
    // and the earlier intermediate copy is gone.
    await expect(toast).toContainText("Protective steps complete");
    await expect(toast).not.toContainText("1 of 2");
    expect(await impactEventCount(page)).toBe(2);
    expect(await analyticsCount(page, "path_step_done")).toBe(2);
    expect(await analyticsCount(page, "path_first_step_done")).toBe(1);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("@flag-on P15: toast stays in the safe area without breaking mobile chrome", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await seedAndInstrument(page, [
        { id: "s1", title: "Stabilize emergency runway", reasonCode: "RUNWAY_UNDER_1_MONTH" },
        { id: "s2", title: "Rebuild credit history", reasonCode: "PILLAR_FINANCIAL" },
      ]);
      await gotoPath(page);

      await page.getByRole("button", { name: "Mark done" }).first().click();
      const toast = toastRegion(page);
      await expect(toast).toHaveCount(1);
      await expect(toast).toBeVisible();
      // Pause the auto-dismiss timer (hover parity) so the geometry checks
      // below can never race the 5.2s display window.
      await toast.hover();

      // No horizontal overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);

      // Companion is signed-in chrome — guests must not see the orb FAB.
      const launcher = page.getByRole("button", { name: "Open HōMI Companion" });
      await expect(launcher).toHaveCount(0);

      const toastBox = await toast.boundingBox();
      expect(toastBox).toBeTruthy();

      // Deferred 3.2/3.3 assertion: the toast is a fixed overlay — its screen
      // position must not move when the page scrolls. Regression guard for the
      // will-change containing-block bug (ClientProviders once held a
      // permanent will-change:transform, which pinned un-portaled fixed
      // descendants to the page instead of the viewport).
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect
        .poll(() => page.evaluate(() => window.scrollY), { timeout: 10_000 })
        .toBeGreaterThan(0);
      const toastBoxAfterScroll = await toast.boundingBox();
      expect(toastBoxAfterScroll).toBeTruthy();
      if (toastBox && toastBoxAfterScroll) {
        expect(Math.abs(toastBoxAfterScroll.x - toastBox.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(toastBoxAfterScroll.y - toastBox.y)).toBeLessThanOrEqual(1);
      }
    });
  });
});
