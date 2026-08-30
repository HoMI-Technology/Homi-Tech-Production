// @vitest-environment jsdom
/**
 * Hard-stop and warning banners show the server messages or render nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HardStopBanner } from "@/components/finance/HardStopBanner";
import { WarningsBanner } from "@/components/finance/WarningsBanner";
import { assessmentResult } from "../support/factories/assessment-result";

function makeResult(
  hardStops: ReturnType<typeof assessmentResult>["hardStops"],
  warnings: ReturnType<typeof assessmentResult>["warnings"],
) {
  return assessmentResult({ hardStops, warnings });
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
    expect(screen.getByText(/Your debt-to-income ratio is above 50%/)).toBeDefined();
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
        result={makeResult(
          [],
          [
            {
              code: "FOMO_WARNING",
              message:
                "All emotional indicators are at their optimal values. Take a moment to honestly reassess.",
            },
          ],
        )}
      />,
    );

    expect(screen.getByText(/All emotional indicators are at their optimal values/)).toBeDefined();
  });

  it("renders nothing when there are no warnings", () => {
    const { container } = render(<WarningsBanner result={makeResult([], [])} />);
    expect(container.firstChild).toBeNull();
  });
});
