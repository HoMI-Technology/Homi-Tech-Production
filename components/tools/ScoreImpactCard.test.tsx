// @vitest-environment jsdom
/**
 * ScoreImpactCard — reusable tool score-preview surface.
 *
 * Guards the honesty contract:
 * 1. No stored assessment → empty state pointing at /assessment, no fetch.
 * 2. A preview always renders the mandated "Projected — re-take the
 *    assessment to confirm" label next to server-computed numbers.
 * 3. Null overrides → the card hides itself entirely.
 * 4. Scoring failure → an honest error line, never an invented score.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { AssessmentInputs } from "@/lib/scoring/public";
import { ScoreImpactCard } from "./ScoreImpactCard";
import { SCORE_IMPACT_PROJECTED_LABEL } from "@/lib/tools/score-preview";

const BASELINE_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 4,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 7,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.15,
  downPaymentProgress: 0.5,
};

function seedStoredAssessment() {
  window.localStorage.setItem(
    "homi:last-assessment",
    JSON.stringify({
      inputs: BASELINE_INPUTS,
      result: { score: 62.2, verdict: "BUILD_FIRST" },
      completedAt: new Date().toISOString(),
      kind: "full",
    }),
  );
}

const SERVER_PAYLOAD = {
  score: 71.6,
  verdict: "ALMOST_THERE",
  financial: { debtToIncome: 8, downPayment: 6, emergencyFund: 7, creditHealth: 9, total: 30 },
  emotional: {
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 7,
    fomoCheck: 6,
    total: 28,
    singleRedistribution: false,
  },
  timing: { timeHorizon: 5, savingsRate: 4, downPaymentProgress: 4.6, total: 13.6 },
  warnings: [],
  hardStops: [],
  keyInsight: "insight",
  nextSteps: ["a"],
};

function stubFetch(payload: Record<string, unknown> = SERVER_PAYLOAD, status = 200) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function flushDebounce() {
  // The card's debounce timer + the scoring fetch both resolve outside React
  // events; act() lets those state updates land.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(800);
  });
}

describe("ScoreImpactCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the take-the-assessment empty state when nothing is stored", async () => {
    const fetchMock = stubFetch();
    render(<ScoreImpactCard buildOverrides={() => ({ debtToIncomeRatio: 0.1 })} />);
    await flushDebounce();

    expect(screen.getByText("Score Impact Preview")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /take the assessment/i })).toHaveAttribute(
      "href",
      "/assessment",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders baseline → projected with the mandated honesty label", async () => {
    seedStoredAssessment();
    const fetchMock = stubFetch();
    render(
      <ScoreImpactCard
        note="Assumes you finish this payoff plan."
        buildOverrides={() => ({ debtToIncomeRatio: 0.1, emergencyFundMonths: 9 })}
      />,
    );
    await flushDebounce();
    // Let the fetch promise chain settle.
    await flushDebounce();

    expect(screen.getByText(SCORE_IMPACT_PROJECTED_LABEL)).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(screen.getByText("72")).toBeInTheDocument();
    expect(screen.getByText("ALMOST THERE")).toBeInTheDocument();
    expect(screen.getByText("+10 pts")).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/scoring");
    const body = JSON.parse(String(init?.body));
    expect(body.debtToIncomeRatio).toBe(0.1);
    expect(body.emergencyFundMonths).toBe(9);
    expect(body.creditScore).toBe(750);
  });

  it("renders nothing when the tool has nothing grounded to project", async () => {
    seedStoredAssessment();
    const fetchMock = stubFetch();
    const { container } = render(<ScoreImpactCard buildOverrides={() => null} />);
    await flushDebounce();

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows an honest error and no numbers when scoring fails", async () => {
    seedStoredAssessment();
    stubFetch({ error: "Scoring failed. Try again in a moment." }, 500);
    render(<ScoreImpactCard buildOverrides={() => ({ debtToIncomeRatio: 0.1 })} />);
    await flushDebounce();
    await flushDebounce();

    expect(screen.getByText(/couldn't project this plan/i)).toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(screen.queryByText("72")).not.toBeInTheDocument();
    // The honesty label still frames the card.
    expect(screen.getByText(SCORE_IMPACT_PROJECTED_LABEL)).toBeInTheDocument();
  });
});
