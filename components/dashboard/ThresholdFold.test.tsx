// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  FOLD_FLAGS_NONE_INVENTED,
  FOLD_LIQUID_CONNECTED_LABEL,
  FOLD_MONEY_CONNECTED_HEADING,
  FOLD_MONEY_DEPTH_LABEL,
  FOLD_MONEY_HREF,
  MONEY_WAIT_LINE,
  foldHardStopEyebrow,
  foldHomeHoldSentence,
  foldScoreAgeLine,
  hardStopEyebrow,
  homeHoldSentence,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  RUNWAY_HARD_STOP_PATH_TITLE,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { ThresholdFold } from "./ThresholdFold";
import { recordSaveStatus } from "@/lib/assessment/save-status";

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
  latest: { id: "live-61", overallScore: 61, scoredAt: "2026-08-29T12:00:00.000Z" },
  verdict: "NOT_YET" as const,
  lastMoney: {
    debtToIncomeRatio: 0.42,
    emergencyFundMonths: 0.5,
    savingsRate: 0.03,
    liquidDollars: null,
  },
  stopMessages: ["Emergency runway is under 1 month."],
  stopCode: "RUNWAY_UNDER_1_MONTH" as const,
  pathPrimary: {
    href: "/tools/runway",
    title: RUNWAY_HARD_STOP_PATH_TITLE,
  },
};

describe("ThresholdFold", () => {
  it("empty Home is — + Assess only — no Fraunces, no whisper, no age", () => {
    const { container } = render(
      <ThresholdFold {...base} latest={null} verdict={null} stopMessages={[]} />,
    );

    const fold = container.querySelector("[data-threshold-fold]");
    expect(fold).not.toBeNull();
    expect(fold?.getAttribute("data-home-instrument")).toBe("empty");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(fold?.querySelector(".font-display")).toBeNull();
    expect(screen.queryByText("Will you be okay?")).not.toBeInTheDocument();
    expect(screen.queryByText(/Readiness lives here/)).not.toBeInTheDocument();
    expect(screen.queryByText("One pass. Then you know.")).not.toBeInTheDocument();
    expect(screen.queryByText(/One measurement and this page has a build to show/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveTextContent("\u2014");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveClass("type-fold-score");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).not.toHaveClass("text-5xl");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).not.toHaveClass("sm:text-6xl");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveStyle({
      color: COLORS.light,
    });
    expect(screen.getByRole("link", { name: /^assess$/i })).toHaveAttribute("href", "/assessment");
    expect(container.querySelector("[data-home-fold-age]")).toBeNull();
    expect(screen.queryByText(/from Aug/)).not.toBeInTheDocument();
    expect(screen.queryByText(/from March/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved on this device only/)).not.toBeInTheDocument();
    expect(screen.queryByText(MONEY_WAIT_LINE)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(container.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
    expect(container.querySelector("[data-home-threshold-compass]")).toBeNull();
    expect(container.querySelector("[data-companion-fold-line]")).toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(container.querySelector("[data-home-money-below-fold]")).toBeNull();
    expect(screen.queryByText(/Checking in/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: FOLD_CONNECT_ACCOUNTS_LABEL })).not.toBeInTheDocument();
  });

  it("live 61 is HOME_HARDSTOP_CRAFT order: verdict label → one score+age line → hard stop → hold → Path", () => {
    const { container } = render(<ThresholdFold {...live61} />);

    expect(container.querySelector("[data-home-instrument]")).toHaveAttribute(
      "data-home-instrument",
      "threshold",
    );
    const numeral = screen.getByLabelText("Overall Decision Readiness Score 61 out of 100");
    expect(numeral).toHaveStyle({ color: COLORS.light });
    expect(numeral).not.toHaveStyle({ color: COLORS.crimson });
    expect(numeral).not.toHaveStyle({ color: COLORS.cyan });
    expect(numeral.style.textShadow).toBe("");
    expect(numeral).toHaveTextContent("61");
    expect(numeral).toHaveClass("type-fold-score");
    expect(numeral).toHaveClass("score-numeral");
    expect(numeral).not.toHaveClass("text-5xl");
    expect(numeral).not.toHaveClass("sm:text-6xl");
    expect(numeral).not.toHaveClass("font-semibold");

    expect(container.querySelector("[data-home-threshold-compass]")).toBeNull();
    expect(container.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(0);
    expect(container.querySelector("[data-home-fold-score-plate]")).toHaveTextContent("61");

    const verdict = container.querySelector("[data-home-fold-verdict]");
    const score = container.querySelector("[data-home-fold-score]");
    const age = container.querySelector("[data-home-fold-age]");
    const hardStop = screen.getByRole("alert");
    const path = screen.getByRole("link", {
      name: RUNWAY_HARD_STOP_FOLD_TITLE,
    });
    if (!verdict || !score || !age) throw new Error("expected verdict, score, and age");
    expect(verdict.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(score.compareDocumentPosition(age) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(age.compareDocumentPosition(hardStop) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(hardStop.compareDocumentPosition(path) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(verdict).toHaveTextContent("DO NOT PROCEED");
    expect(verdict).toHaveClass("type-fold-verdict");
    expect(verdict).not.toHaveClass("text-xl");
    expect(verdict).not.toHaveClass("text-4xl");
    expect(verdict).not.toHaveClass("sm:text-5xl");
    expect(age).toHaveClass("text-sm");
    expect(age).toHaveClass("text-dim");
    expect(age).not.toHaveClass("text-light");
    expect(screen.getByLabelText("DO NOT PROCEED")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-home-fold-verdict]")).toHaveLength(1);
    expect(screen.queryAllByText("DO NOT PROCEED")).toHaveLength(1);
    expect(age).toHaveTextContent("from Aug 29");
    expect(age).not.toHaveTextContent("61");
    expect(age).not.toHaveTextContent("from August 29.");
    expect(age).not.toHaveTextContent("from March 15.");
    expect(foldScoreAgeLine(61, "2026-08-29T12:00:00.000Z")).toBe("from Aug 29");
    expect(container.querySelectorAll("[data-home-fold-score]")).toHaveLength(1);
    expect(screen.queryByText(/Saved on this device only/)).not.toBeInTheDocument();

    expect(hardStop).toHaveTextContent(hardStopEyebrow);
    expect(hardStop).toHaveTextContent("Hard stop · runway.");
    expect(hardStop).not.toHaveTextContent("Hard stop · Runway");
    expect(hardStop).toHaveTextContent(homeHoldSentence);
    expect(hardStop).not.toHaveTextContent("Emergency runway is under 1 month.");
    expect(hardStop).not.toHaveTextContent("61 — runway is a hard stop.");
    expect(container.querySelector("[data-home-hard-stop-eyebrow] .text-crimson")?.textContent).toBe(
      "runway.",
    );
    expect(hardStop.className).not.toMatch(/eyebrow/);
    expect(container.querySelectorAll("[data-home-hard-stop]")).toHaveLength(1);
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1);
    expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).toBe(
      hardStopEyebrow,
    );
    expect(container.querySelector("[data-home-hard-stop]")).toHaveClass("mt-6");
    expect(container.querySelector("[data-home-hard-stop]")).not.toHaveClass("mt-5");
    expect(container.querySelector("[data-home-hard-stop-eyebrow]")).toHaveClass("type-fold-hardstop");
    expect(container.querySelector("[data-home-hard-stop-eyebrow]")).toHaveClass("text-dim");
    expect(container.querySelector("[data-home-hard-stop-hold]")).toHaveClass("type-fold-hold");
    expect(container.querySelector("[data-home-hard-stop-hold]")).toHaveClass("text-light/90");

    expect(screen.queryByText(/· Hot/)).not.toBeInTheDocument();
    expect(screen.queryByText("Hot")).not.toBeInTheDocument();
    expect(screen.queryByText("Warm")).not.toBeInTheDocument();
    expect(screen.queryByText("Cold")).not.toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
    expect(screen.queryByText(/80–100|80-100/)).not.toBeInTheDocument();
    expect(screen.queryByText("CRAFT · NOT SHIP")).not.toBeInTheDocument();

    const money = container.querySelector("[data-home-money-below-fold]");
    expect(money).not.toBeNull();
    expect(money).toHaveTextContent(MONEY_WAIT_LINE);
    expect(container.querySelector("[data-home-fold-cash-empty]")).toHaveClass("text-dim");
    expect(container.querySelector("[data-home-fold-cash-empty]")).not.toHaveClass("text-light");
    expect(money).toHaveTextContent("Money");
    expect(container.querySelector("[data-home-fold-runway]")).toBeNull();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(path.compareDocumentPosition(money as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );

    expect(container.querySelector("[data-home-fold-override]")).toBeNull();
    expect(screen.queryByText(/61 — runway is a hard stop/)).not.toBeInTheDocument();
    expect(screen.queryByText(/61 — hard stop/)).not.toBeInTheDocument();

    expect(path).toHaveClass("btn-primary");
    expect(path).toHaveAttribute("data-path-fold-primary");
    expect(path).toHaveAttribute("href", "/tools/runway");
    expect(path).toHaveTextContent(RUNWAY_HARD_STOP_FOLD_TITLE);
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    expect(screen.queryByText(/Stabilize emergency runway to at least 1 month/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Grow emergency fund toward 3–6 months/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark done/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /full path/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /connect bank/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: FOLD_CONNECT_ACCOUNTS_LABEL })).toHaveAttribute(
      "href",
      FOLD_CONNECTIONS_HREF,
    );

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

  it("shows quiet money facts below the fold only when accounts are connected", () => {
    const { container } = render(
      <ThresholdFold
        {...live61}
        lastMoney={{
          ...live61.lastMoney,
          liquidDollars: 4200,
        }}
      />,
    );

    const money = container.querySelector("[data-home-money-below-fold]");
    expect(money).not.toBeNull();
    expect(money).not.toHaveTextContent(MONEY_WAIT_LINE);
    expect(money).toHaveTextContent(FOLD_MONEY_CONNECTED_HEADING);
    expect(container.querySelector("[data-home-fold-runway]")).toHaveTextContent("Under 1 month");
    expect(container.querySelector("[data-home-fold-runway]")).not.toHaveTextContent("0.5 mo");
    expect(container.querySelector("[data-home-fold-cash]")).toHaveTextContent(FOLD_LIQUID_CONNECTED_LABEL);
    expect(container.querySelector("[data-home-fold-cash]")).not.toHaveTextContent("4,200");
    expect(container.querySelector("[data-home-fold-cash]")?.className).not.toMatch(/text-4xl/);
    expect(container.querySelector("[data-home-fold-flags]")).toHaveTextContent(FOLD_FLAGS_NONE_INVENTED);
    expect(screen.getByRole("link", { name: FOLD_MONEY_DEPTH_LABEL })).toHaveAttribute(
      "href",
      FOLD_MONEY_HREF,
    );
    expect(screen.queryByRole("link", { name: FOLD_CONNECT_ACCOUNTS_LABEL })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-fold-connect]")).toBeNull();
  });

  it("omits age when the scored timestamp is missing — no invented date", () => {
    const { container } = render(
      <ThresholdFold
        {...live61}
        latest={{ id: "no-age", overallScore: 61, scoredAt: null }}
      />,
    );

    expect(container.querySelector("[data-home-fold-age]")).toBeNull();
    expect(screen.queryByText(/from Aug/)).not.toBeInTheDocument();
    expect(screen.queryByText(/from March/)).not.toBeInTheDocument();
    expect(foldScoreAgeLine(61, null)).toBeNull();
  });

  it("does not mount SaveStatusBanner on the scored first viewport", () => {
    recordSaveStatus("locked");
    render(<ThresholdFold {...live61} />);

    expect(screen.queryByText(/Saved on this device only/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it("remaps the stored 3–6 month grow-fund title to Companion fold voice while runway is a hard stop", () => {
    render(
      <ThresholdFold
        {...live61}
        stopCode="RUNWAY_UNDER_1_MONTH"
        pathPrimary={{
          href: "/tools/runway",
          title: "Grow emergency fund toward 3–6 months",
        }}
      />,
    );

    expect(screen.getByRole("link", { name: RUNWAY_HARD_STOP_FOLD_TITLE })).toBeInTheDocument();
    expect(screen.queryByText(/Grow emergency fund toward 3–6 months/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stabilize emergency runway to at least 1 month/)).not.toBeInTheDocument();
  });

  it.each([
    ["DTI_OVER_50", "DTI is above 50%."] as const,
    ["HOUSING_RATIO_OVER_45", "Housing ratio is above 45%."] as const,
    ["CREDIT_UNDER_620", "Credit is below 620."] as const,
  ] satisfies ReadonlyArray<readonly [Exclude<FoldHardStopCode, "RUNWAY_UNDER_1_MONTH">, string]>)(
    "keeps the live Path grow-fund title when %s is the hard stop",
    (code, engineMessage) => {
      render(
        <ThresholdFold
          {...base}
          latest={{ id: `path-${code}`, overallScore: 61, scoredAt: "2026-08-29T12:00:00.000Z" }}
          verdict="NOT_YET"
          stopMessages={[engineMessage]}
          stopCode={code}
          lastMoney={{
            debtToIncomeRatio: 0.51,
            emergencyFundMonths: 0.5,
            savingsRate: 0.01,
            liquidDollars: null,
          }}
          pathPrimary={{
            href: "/tools/runway",
            title: "Grow emergency fund toward 3–6 months",
          }}
        />,
      );

      expect(
        screen.getByRole("link", { name: /Grow emergency fund toward 3–6 months/ }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", {
          name: /Stabilize emergency runway to at least 1 month/i,
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: RUNWAY_HARD_STOP_FOLD_TITLE })).not.toBeInTheDocument();
    },
  );

  it.each([
    ["RUNWAY_UNDER_1_MONTH", "Emergency runway is under 1 month."] as const,
    ["DTI_OVER_50", "DTI is above 50%."] as const,
    ["HOUSING_RATIO_OVER_45", "Housing ratio is above 45%."] as const,
    ["CREDIT_UNDER_620", "Credit is below 620."] as const,
  ] satisfies ReadonlyArray<readonly [FoldHardStopCode, string]>)(
    "renders %s eyebrow and hold once — no third score echo",
    (code, engineMessage) => {
      const { container } = render(
        <ThresholdFold
          {...base}
          latest={{ id: `stop-${code}`, overallScore: 61, scoredAt: "2026-08-29T12:00:00.000Z" }}
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
      expect(container.querySelector("[data-home-fold-override]")).toBeNull();
      expect(screen.queryByText(/is a hard stop/)).not.toBeInTheDocument();
      expect(screen.queryByText(engineMessage)).not.toBeInTheDocument();
      if (code !== "RUNWAY_UNDER_1_MONTH") {
        expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).not.toBe(
          hardStopEyebrow,
        );
        expect(container.querySelector("[data-home-hard-stop-hold]")?.textContent).not.toBe(
          homeHoldSentence,
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

  it("unknown or missing stop code is Neutral — Hard stop. once, hold omitted, no third echo", () => {
    const { container } = render(
      <ThresholdFold
        {...base}
        latest={{ id: "unknown-stop", overallScore: 61 }}
        verdict="NOT_YET"
        stopMessages={["A hard stop is active."]}
        stopCode={null}
        lastMoney={{
          debtToIncomeRatio: 0.42,
          emergencyFundMonths: 0.5,
          savingsRate: 0.03,
          liquidDollars: null,
        }}
      />,
    );

    expect(container.querySelector("[data-home-hard-stop-eyebrow]")?.textContent).toBe(
      "Hard stop.",
    );
    expect(container.querySelector("[data-home-hard-stop-hold]")).toBeNull();
    expect(container.querySelector("[data-home-fold-override]")).toBeNull();
    expect(screen.queryByText("61 — hard stop.")).not.toBeInTheDocument();
    expect(container.querySelector("[data-home-hard-stop-eyebrow] .text-crimson")).toBeNull();
    expect(container.querySelector("[data-home-hard-stop]")?.textContent).not.toMatch(
      /runway/i,
    );
    expect(
      screen.queryByText("Runway is the hold. Build the fund before anything else."),
    ).not.toBeInTheDocument();
  });

  it("places the public verdict word before the hard-stop sentence", () => {
    const { container } = render(
      <ThresholdFold
        {...base}
        latest={{ id: "a2", overallScore: 61, scoredAt: "2026-08-29T12:00:00.000Z" }}
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
    if (!banner || !verdict) throw new Error("expected verdict before hard stop");
    expect(verdict.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
