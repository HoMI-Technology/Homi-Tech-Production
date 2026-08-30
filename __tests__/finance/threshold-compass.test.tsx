// @vitest-environment jsdom
/**
 * Dead finance ThresholdCompass still paints the four gauges — live fold uses brand copy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { computeScore, type AssessmentResult } from "@/lib/scoring/engine";
import { ThresholdCompass } from "@/components/finance/ThresholdCompass";

vi.mock("@/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({
    value,
    format,
    className,
  }: {
    value: number;
    format?: (n: number) => string;
    className?: string;
  }) => <span className={className}>{format ? format(value) : value}</span>,
}));

function mockMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
}

const readyResult: AssessmentResult = computeScore({
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
});

// Override credit to trip the CREDIT_UNDER_620 hard-stop.
const notYetInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 600,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};

const notYetResultFixed: AssessmentResult = computeScore(notYetInputs);

describe("ThresholdCompass", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the score and verdict label for a READY result", async () => {
    render(<ThresholdCompass result={readyResult} />);

    expect(await screen.findByText("92.0")).toBeInTheDocument();
    expect(screen.getByText("READY")).toBeInTheDocument();
    expect(
      screen.getByText("All three rings align. Your compass becomes a key."),
    ).toBeInTheDocument();
  });

  it("renders DO NOT PROCEED for a NOT_YET verdict", async () => {
    render(<ThresholdCompass result={notYetResultFixed} />);

    expect(await screen.findByText(notYetResultFixed.score.toFixed(1))).toBeInTheDocument();
    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(
      screen.getByText("Not yet is not no. It is clarity. It is protection."),
    ).toBeInTheDocument();
  });
});
