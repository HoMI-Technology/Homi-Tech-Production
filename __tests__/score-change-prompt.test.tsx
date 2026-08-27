// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ScoreChangePrompt } from "@/components/dashboard/ScoreChangePrompt";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";

const DISMISS_KEY = "homi:score-trigger-dismissed";

function seedFinance(overrides: Partial<FinanceState>) {
  window.localStorage.setItem(
    "homi:finance",
    JSON.stringify({ ...DEFAULT_FINANCE_STATE, ...overrides }),
  );
}

function seedAssessment(inputs: Record<string, unknown>, completedAt = "2026-08-01T00:00:00.000Z") {
  window.localStorage.setItem(
    "homi:last-assessment",
    JSON.stringify({
      inputs,
      result: { verdict: "ALMOST_THERE", score: 70 },
      completedAt,
      kind: "full",
    }),
  );
}

/** Assessment baseline: DTI 30% / EF 2mo / savings 8% — all band 1. */
const BASELINE_INPUTS = { debtToIncomeRatio: 0.3, emergencyFundMonths: 2, savingsRate: 0.08 };

/** Finance numbers that keep every metric in band 1. */
const SAME_BANDS: Partial<FinanceState> = {
  monthlyIncome: 5000,
  monthlyExpenses: 3000,
  monthlyDebtPayments: 1600,
  liquidSavings: 9600,
};

/** Finance numbers that drop DTI to 5% — a new (better) band; EF ~1.4mo and savings 7% stay in band 1. */
const DTI_CROSSED: Partial<FinanceState> = {
  monthlyIncome: 5000,
  monthlyExpenses: 4400,
  monthlyDebtPayments: 250,
  liquidSavings: 6500,
};

describe("ScoreChangePrompt", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when there is no stored assessment", () => {
    seedFinance(DTI_CROSSED);
    const { container } = render(<ScoreChangePrompt />);
    expect(container.querySelector("[data-score-change-prompt]")).toBeNull();
  });

  it("renders nothing when finance numbers stay in the same bands", () => {
    seedAssessment(BASELINE_INPUTS);
    seedFinance(SAME_BANDS);
    const { container } = render(<ScoreChangePrompt />);
    expect(container.querySelector("[data-score-change-prompt]")).toBeNull();
  });

  it("prompts a quick re-check when DTI crosses into a new band", () => {
    seedAssessment(BASELINE_INPUTS);
    seedFinance(DTI_CROSSED);
    render(<ScoreChangePrompt />);

    expect(screen.getByText(/Your financial picture changed/)).toBeTruthy();
    expect(screen.getByText(/DTI moved to a new scoring band/)).toBeTruthy();
    expect(screen.getByText(/for the better/)).toBeTruthy();

    const cta = screen.getByRole("link", { name: "Quick re-check" });
    expect(cta.getAttribute("href")).toBe("/assessment?mode=quick");
  });

  it("lists every metric that crossed a band", () => {
    seedAssessment(BASELINE_INPUTS);
    // EF: 20000/(3000+1600) ≈ 4.3mo → band 2; savings: 400/5000 = 8% → band 1; DTI 32% → band 1.
    seedFinance({ ...SAME_BANDS, liquidSavings: 20000 });
    render(<ScoreChangePrompt />);
    expect(screen.getByText(/Emergency fund moved to a new scoring band/)).toBeTruthy();
  });

  it("stays dismissed for the same change but re-prompts on a new one", () => {
    seedAssessment(BASELINE_INPUTS);
    seedFinance(DTI_CROSSED);

    const first = render(<ScoreChangePrompt />);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(first.container.querySelector("[data-score-change-prompt]")).toBeNull();
    expect(window.localStorage.getItem(DISMISS_KEY)).not.toBeNull();

    // Same change, fresh mount — no nagging.
    const second = render(<ScoreChangePrompt />);
    expect(second.container.querySelector("[data-score-change-prompt]")).toBeNull();
    second.unmount();

    // A NEW crossing (emergency fund drops below 1 month) produces a new signature.
    seedFinance({ ...DTI_CROSSED, liquidSavings: 1000 });
    render(<ScoreChangePrompt />);
    expect(screen.getByText(/Your financial picture changed/)).toBeTruthy();
  });
});
