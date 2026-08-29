// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
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

describe("ThresholdFold", () => {
  it("empty-account is one Assess close on the compass — em dash, no fake 76", () => {
    const { container } = render(
      <ThresholdFold {...base} latest={null} verdict={null} stopMessages={[]} />,
    );

    const fold = container.querySelector("[data-threshold-fold]");
    expect(fold).not.toBeNull();
    expect(fold?.getAttribute("data-home-instrument")).toBe("empty");
    expect(screen.getByLabelText("Decision Readiness Score Unknown")).toHaveTextContent("—");
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

  it("live 61 sits in the keyhole with DNP, Hot, runway once, one Path CTA", () => {
    const { container } = render(
      <ThresholdFold
        {...base}
        latest={{ id: "live-61", overallScore: 61 }}
        verdict="NOT_YET"
        lastMoney={{
          debtToIncomeRatio: 0.42,
          emergencyFundMonths: 0.5,
          savingsRate: 0.03,
          liquidDollars: null,
        }}
        stopMessages={["Emergency runway is under 1 month."]}
        pathPrimary={{
          href: "/tools/runway",
          title: "Stabilize emergency runway to at least 1 month",
        }}
      />,
    );

    expect(container.querySelector("[data-home-instrument]")).toHaveAttribute(
      "data-home-instrument",
      "threshold",
    );
    expect(screen.getByLabelText("Overall Decision Readiness Score 61 out of 100")).toHaveStyle({
      color: COLORS.crimson,
    });
    expect(container.querySelector("[data-home-threshold-compass]")?.textContent).toContain("61");

    const hardStop = screen.getByRole("alert");
    expect(hardStop).toHaveTextContent("Hard stop · Emergency runway is under 1 month.");
    expect(container.querySelectorAll("[data-home-hard-stop]")).toHaveLength(1);
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1);

    expect(screen.getByText("DO NOT PROCEED")).toBeInTheDocument();
    expect(screen.getByText(/· Hot/)).toBeInTheDocument();
    expect(screen.queryByText("NOT_YET")).not.toBeInTheDocument();
    expect(screen.queryByText("Not yet")).not.toBeInTheDocument();
    expect(screen.queryByText(/80–100|80-100/)).not.toBeInTheDocument();

    expect(container.querySelector("[data-home-fold-runway]")).toHaveTextContent("0.5 mo");
    expect(container.querySelector("[data-home-fold-cash]")).toHaveTextContent("Cash");
    expect(container.querySelector("[data-home-fold-cash]")).toHaveTextContent("—");
    expect(container.querySelector("[data-home-fold-cash]")?.className).not.toMatch(/text-4xl/);

    const path = screen.getByRole("link", {
      name: /Stabilize emergency runway to at least 1 month/i,
    });
    expect(path).toHaveClass("btn-primary");
    expect(path).toHaveAttribute("data-path-fold-primary");
    expect(path).toHaveAttribute("href", "/tools/runway");
    expect(container.querySelectorAll(".btn-primary")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /mark done/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /full path/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open money/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /connect bank/i })).not.toBeInTheDocument();

    expect(container.querySelectorAll("svg[aria-label*='Threshold Compass']")).toHaveLength(1);
    expect(container.querySelector("[data-companion-fold-line]")).toBeNull();
    expect(container.querySelector("[data-home-score-rail]")).toBeNull();
    expect(container.querySelector("[data-home-money-standing]")).toBeNull();
    expect(screen.queryByText(/Checking in 30 days/i)).not.toBeInTheDocument();
    expect(screen.queryByText("76")).not.toBeInTheDocument();
    expect(container.querySelector("[data-celebrate]")).toBeNull();
  });

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
