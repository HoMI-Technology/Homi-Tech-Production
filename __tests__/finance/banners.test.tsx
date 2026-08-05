// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { AssessmentResult } from "@/lib/scoring/engine";
import { HardStopBanner } from "@/components/finance/HardStopBanner";
import { WarningsBanner } from "@/components/finance/WarningsBanner";

function makeResult(
  hardStops: AssessmentResult["hardStops"],
  warnings: AssessmentResult["warnings"],
): AssessmentResult {
  return {
    score: 45,
    verdict: "NOT_YET",
    financial: {
      debtToIncome: 0,
      downPayment: 0,
      emergencyFund: 0,
      creditHealth: 0,
      total: 0,
    },
    emotional: {
      lifeStability: 0,
      confidenceLevel: 0,
      partnerAlignment: 0,
      fomoCheck: 0,
      total: 0,
      singleRedistribution: false,
    },
    timing: {
      timeHorizon: 0,
      savingsRate: 0,
      downPaymentProgress: 0,
      total: 0,
    },
    hardStops,
    warnings,
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HardStopBanner", () => {
  it("renders hard-stop messages when present", () => {
    render(
      <HardStopBanner
        result={makeResult(
          [
            {
              code: "DTI_OVER_50",
              message:
                "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises.",
            },
          ],
          [],
        )}
      />,
    );

    expect(screen.getByText("A red line, not a rejection.")).toBeDefined();
    expect(
      screen.getByText(
        /Your debt-to-income ratio is above 50%/,
      ),
    ).toBeDefined();
  });

  it("renders nothing when there are no hard stops", () => {
    const { container } = render(<HardStopBanner result={makeResult([], [])} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("WarningsBanner", () => {
  it("renders warning messages when present", () => {
    render(
      <WarningsBanner
        result={makeResult([], [
          {
            code: "FOMO_WARNING",
            message:
              "All emotional indicators are at their optimal values. Take a moment to honestly reassess.",
          },
        ])}
      />,
    );

    expect(
      screen.getByText(
        /All emotional indicators are at their optimal values/,
      ),
    ).toBeDefined();
  });

  it("renders nothing when there are no warnings", () => {
    const { container } = render(<WarningsBanner result={makeResult([], [])} />);
    expect(container.firstChild).toBeNull();
  });
});
