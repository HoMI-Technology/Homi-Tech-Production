// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import {
  CASH_EMPTY_LABEL,
  foldHardStopEyebrow,
  foldHardStopOverrideLine,
  foldHomeHoldSentence,
  hardStopEyebrow,
  homeHoldSentence,
  RUNWAY_HARD_STOP_PATH_TITLE,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { ThresholdFold } from "./ThresholdFold";

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const base = {
  assessmentsFailed: false,
  pathPrimary: null as { href: string; title: string } | null,
};

const live61 = {
  ...base,
  latest: { id: "live-61", overallScore: 61 },
  verdict: "NOT_YET" as const,
  lastMoney: {
    debtToIncomeRatio: 0.42,
    emergencyFundMonths: 0.5,
    savingsRate: 0.03,
    liquidDollars: null,
  },
  stopMessages: ["Emergency runway is under 1 month."],
  pathPrimary: {
    href: "/tools/runway",
    title: RUNWAY_HARD_STOP_PATH_TITLE,
  },
};

describe("ThresholdFold", () => {
  it("empty-account is one Assess close on the compass — em dash, no fake 76", () => {
    const { container } = render(
      <ThresholdFold {...base} latest={null} verdict={null} stopMessages={[]} />,
    );

    const fold = container.querySelector("[data-threshold-fold]");
    expect(fold).not.toBeNull();
    expect(fold?.getAttribute("data-home-instrument")).toBe("empty");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveTextContent("—");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveStyle({
      color: COLORS.light,
    });
    expect(screen.getByRole("link", { name: /^assess$/i })).toHaveAttribute("href", "/assessment");
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(1);
    expect(container.querySelector("[data-companion-fold-line]")).toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(screen.queryByText(/Checking in/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
  });

  it("live 61 is plated cyan, DNP without Hot, honest cash empty, Path SSOT", () => {
    const { container } = render(<ThresholdFold {...live61} />);

    expect(container.querySelector("[data-home-instrument]")).toHaveAttribute(
      "data-home-instrument",
      "threshold",
    );
    const numeral = screen.getByLabelText("Overall Decision Readiness Score 61 out of 100");
    expect(numeral).toHaveStyle({ color: COLORS.cyan });
    expect(numeral).not.toHaveStyle({ color: COLORS.crimson });
    expect(numeral.style.textShadow).toBe("");
    expect(container.querySelector("[data-home-fold-score-plate]")).not.toBeNull();
    expect(container.querySelector("[data-home-threshold-compass]")?.textContent).toContain("61");

    const hardStop = screen.getByRole("alert");
    expect(hardStop).toHaveTextContent(hardStopEyebrow);
    expect(hardStop).toHaveTextContent(homeHoldSentence);
    expect(hardStop).not.toHaveTextContent("Emergency runway is under 1 month.");
    expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.className).not.toMatch(
      /text-crimson/,
    );
    expect(hardStop.className).not.toMatch(/eyebrow/);
    expect(container.querySelectorAll("[data-home-hard-stop]")).toHaveLength(1);
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1);
    expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).toBe(
      hardStopEyebrow,
    );
    expect(container.querySelector("[data-home-hard-stop-hold]")?.textContent).toBe(
      homeHoldSentence,
    );

    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(screen.queryByText(/· Hot/)).not.toBeInTheDocument();
    expect(screen.queryByText("Hot")).not.toBeInTheDocument();
    expect(screen.queryByText("Warm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cold")).not.toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
    expect(screen.queryByText(/80–100|80-100/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("DO NOT PROCEED")).toBeInTheDocument();

    expect(container.querySelector("[data-home-fold-runway]")).toHaveTextContent("0.5 mo");
    expect(container.querySelector("[data-home-fold-cash]")).toHaveTextContent(CASH_EMPTY_LABEL);
    expect(container.querySelector("[data-home-fold-cash]")).not.toHaveTextContent("—");
    expect(container.querySelector("[data-home-fold-cash]")?.className).not.toMatch(/text-4xl/);
    expect(screen.queryByText("0")).not.toBeInTheDocument();

    expect(container.querySelector("[data-home-fold-override]")).toHaveTextContent(
      "61 — runway is a hard stop.",
    );
    expect(container.querySelector("[data-home-fold-override]")?.textContent).not.toMatch(
      /35\s*[·/]\s*35\s*[·/]\s*30/,
    );
    expect(container.querySelector("[data-home-fold-override]")?.textContent).not.toMatch(
      /80|65|50|49/,
    );

    const path = screen.getByRole("link", {
      name: /Stabilize emergency runway to at least 1 month/i,
    });
    expect(path).toHaveClass("btn-primary");
    expect(path).toHaveAttribute("data-path-fold-primary");
    expect(path).toHaveAttribute("href", "/tools/runway");
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    expect(screen.queryByText(/Grow emergency fund toward 3–6 months/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark done/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /full path/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /connect bank/i })).not.toBeInTheDocument();

    expect(container.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(1);
    expect(container.querySelector("[data-companion-fold-line]")).toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(container.querySelector("[data-home-money-tile]")).toBeNull();
    expect(screen.queryByText(/Checking in 30 days/i)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(container.querySelector("[data-celebrate]")).toBeNull();
    expect(container.querySelector("[data-hard-stop]")?.getAttribute("style")).toContain(
      COLORS.cyan,
    );
  });

  it("remaps the stored 3–6 month grow-fund title to Path SSOT while runway is a hard stop", () => {
    render(
      <ThresholdFold
        {...live61}
        pathPrimary={{
          href: "/tools/runway",
          title: "Grow emergency fund toward 3–6 months",
        }}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Stabilize emergency runway to at least 1 month/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Grow emergency fund toward 3–6 months/)).not.toBeInTheDocument();
  });

  it.each([
    ["RUNWAY_UNDER_1_MONTH", "Emergency runway is under 1 month."] as const,
    ["DTI_OVER_50", "DTI is above 50%."] as const,
    ["HOUSING_RATIO_OVER_45", "Housing ratio is above 45%."] as const,
    ["CREDIT_UNDER_620", "Credit is below 620."] as const,
  ] satisfies ReadonlyArray<readonly [FoldHardStopCode, string]>)(
    "renders %s eyebrow, hold, and override from the T0 contract",
    (code, engineMessage) => {
      const { container } = render(
        <ThresholdFold
          {...base}
          latest={{ id: `stop-${code}`, overallScore: 61 }}
          verdict="NOT_YET"
          stopMessages={[engineMessage]}
          stopCode={code}
          lastMoney={{
            debtToIncomeRatio: 0.51,
            emergencyFundMonths: 0.5,
            savingsRate: 0.01,
            liquidDollars: null,
          }}
        />,
      );

      expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).toBe(
        foldHardStopEyebrow(code),
      );
      expect(container.querySelector("[data-home-hard-stop-hold]")?.textContent).toBe(
        foldHomeHoldSentence(code),
      );
      expect(container.querySelector("[data-home-fold-override]")?.textContent).toBe(
        foldHardStopOverrideLine(61, code),
      );
      expect(container.querySelector("[data-home-fold-override]")?.textContent).not.toMatch(
        /0\.5\s*mo|<1 month|at least 1 month/,
      );
      expect(screen.queryByText(engineMessage)).not.toBeInTheDocument();
      if (code !== "RUNWAY_UNDER_1_MONTH") {
        expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).not.toBe(
          hardStopEyebrow,
        );
        expect(container.querySelector("[data-home-hard-stop-hold]")?.textContent).not.toBe(
          homeHoldSentence,
        );
        expect(container.querySelector("[data-home-fold-override]")?.textContent).not.toBe(
          foldHardStopOverrideLine(61),
        );
        expect(container.querySelector("[data-home-fold-override]")?.textContent).not.toMatch(
          /at least 1 month/i,
        );
      } else {
        expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).toBe(
          hardStopEyebrow,
        );
        expect(container.querySelector("[data-home-hard-stop-hold]")?.textContent).toBe(
          homeHoldSentence,
        );
      }
    },
  );

  it("hard-stop sentence sits above the public verdict word", () => {
    const { container } = render(
      <ThresholdFold
        {...base}
        latest={{ id: "a2", overallScore: 61 }}
        verdict="NOT_YET"
        stopMessages={["Emergency runway is under 1 month."]}
        lastMoney={{
          debtToIncomeRatio: 0.5,
          emergencyFundMonths: 0.5,
          savingsRate: 0.01,
          liquidDollars: null,
        }}
      />,
    );

    const banner = container.querySelector("[data-home-hard-stop]");
    const verdict = container.querySelector("[data-home-fold-verdict]");
    if (!banner || !verdict) throw new Error("expected hard stop above verdict");
    expect(banner.compareDocumentPosition(verdict) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
