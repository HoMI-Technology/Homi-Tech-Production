import { expect, test } from "@playwright/test";
import { signInViaUi } from "./helpers/auth";
import { dismissCookieConsent } from "./helpers/consent";

const email = process.env.E2E_TEST_EMAIL ?? "";
const password = process.env.E2E_TEST_PASSWORD ?? "";

/**
 * Path to Ready — seeded localStorage (no full assessment drive).
 * Asserts /path surface, step completion, and results path card presence.
 */

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
    financial: {
      debtToIncome: 8,
      downPayment: 8,
      emergencyFund: 1,
      creditHealth: 6,
      total: 23,
    },
    emotional: {
      lifeStability: 7,
      confidenceLevel: 6,
      partnerAlignment: 8,
      fomoCheck: 6,
      total: 27,
      singleRedistribution: false,
    },
    timing: {
      timeHorizon: 8,
      savingsRate: 8,
      downPaymentProgress: 8,
      total: 24,
    },
    warnings: [],
    hardStops: [
      {
        code: "RUNWAY_UNDER_1_MONTH",
        message: "Emergency runway under one month.",
      },
    ],
  },
  completedAt: new Date().toISOString(),
  kind: "full",
};

const SAMPLE_PATH = {
  id: "e2e-path-1",
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
  steps: [
    {
      id: "e2e-step-1",
      title: "Stabilize emergency runway to at least 1 month",
      kind: "deadline",
      daysFromNow: 3,
      reasonCode: "RUNWAY_UNDER_1_MONTH",
      href: "/tools/runway",
      notes: "Protective gate — educational only.",
      fundingTarget: 5000,
      fundingLabel: "Cash still needed for 1-month runway",
      status: "pending",
      completedAt: null,
    },
    {
      id: "e2e-step-2",
      title: "Re-take the assessment and update your path",
      kind: "review",
      daysFromNow: 45,
      reasonCode: "REASSESS",
      href: "/assessment",
      notes: "Reassess when the gate moves.",
      fundingTarget: null,
      fundingLabel: null,
      status: "pending",
      completedAt: null,
    },
  ],
};

test.describe("Path to Ready (seeded)", () => {
  test("path page shows binding progress and completes a step", async ({ page }) => {
    test.setTimeout(90_000);

    await page.addInitScript(
      ({ assessment, path }) => {
        localStorage.setItem("homi:last-assessment", JSON.stringify(assessment));
        localStorage.setItem("homi:readiness-path", JSON.stringify(path));
        localStorage.setItem("homi:readiness-path:updated-at", String(Date.now()));
      },
      { assessment: SAMPLE_ASSESSMENT, path: SAMPLE_PATH },
    );

    await page.goto("/path");
    await dismissCookieConsent(page);

    await expect(page.getByRole("heading", { name: "Your path" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Emergency runway|Binding constraint/i).first()).toBeVisible();
    // Exact match rather than `.first()`: the step title also appears inside
    // the path-coach summary line and the "what does this mean" advisor
    // deep-link. In DOM order the summary comes first, so `.first()` turns this
    // green while asserting against the coach board instead of the step itself.
    await expect(
      page.getByText("Stabilize emergency runway to at least 1 month", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Mark done" }).first().click();

    // Status chip or completion should update
    await expect(page.getByText(/done/i).first()).toBeVisible({ timeout: 10_000 });

    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem("homi:readiness-path");
      if (!raw) return null;
      try {
        return JSON.parse(raw) as {
          steps?: Array<{ id: string; status?: string }>;
        };
      } catch {
        return null;
      }
    });
    expect(stored?.steps?.[0]?.status).toBe("done");
  });

  test("Home Build auto-generates Path to Ready for non-ready verdict", async ({ page }) => {
    test.skip(
      !email || !password,
      "Set E2E_TEST_EMAIL/E2E_TEST_PASSWORD to run signed-in Path to Ready on Home.",
    );
    test.setTimeout(90_000);

    await page.addInitScript(
      ({ assessment }) => {
        localStorage.setItem("homi:last-assessment", JSON.stringify(assessment));
        localStorage.removeItem("homi:readiness-path");
      },
      { assessment: SAMPLE_ASSESSMENT },
    );

    await signInViaUi(page, email, password);
    await page.goto("/dashboard");
    await dismissCookieConsent(page);

    // Auto-path on Home fold hydrate — Path operate lives on Build, not /results.
    await expect(page.getByText("Path to Ready").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/Your sequenced path|Binding constraint|runway|next move/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
