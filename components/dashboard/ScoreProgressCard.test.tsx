// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoreProgressCard } from "./ScoreProgressCard";

const DAY_MS = 1000 * 60 * 60 * 24;

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ScoreProgressCard", () => {
  it("shows the current score, verdict label, and cost of the next band", () => {
    render(
      <ScoreProgressCard
        score={64}
        verdict="BUILD_FIRST"
        scoreDate="2026-08-01T12:00:00Z"
      />,
    );

    expect(screen.getByText("64")).toBeInTheDocument();
    expect(screen.getByText("BUILD FIRST")).toBeInTheDocument();
    expect(screen.getByText("1 point to ALMOST THERE")).toBeInTheDocument();
    expect(screen.getByText(/Score from Aug 1, 2026/)).toBeInTheDocument();
  });

  it("names the READY band and its price from ALMOST_THERE", () => {
    render(
      <ScoreProgressCard score={72} verdict="ALMOST_THERE" scoreDate="2026-08-01T12:00:00Z" />,
    );
    expect(screen.getByText("8 points to READY")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-label",
      "Progress toward READY",
    );
  });

  it("READY is the ceiling — no invented band above it", () => {
    render(<ScoreProgressCard score={91} verdict="READY" scoreDate="2026-08-01T12:00:00Z" />);
    expect(screen.getByText("Top band reached")).toBeInTheDocument();
    expect(screen.queryByText(/points? to /)).not.toBeInTheDocument();
  });

  it("shows the delta badge only when a previous assessment exists", () => {
    const { unmount } = render(
      <ScoreProgressCard
        score={64}
        verdict="BUILD_FIRST"
        scoreDate="2026-08-01T12:00:00Z"
        previousScore={60}
        previousDate="2026-06-01T12:00:00Z"
      />,
    );
    expect(screen.getByText("+4 since Jun 1")).toBeInTheDocument();
    unmount();

    render(<ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate="2026-08-01T12:00:00Z" />);
    expect(screen.queryByText(/since Jun/)).not.toBeInTheDocument();
  });

  it("money freshness is honest: current when saved today", () => {
    window.localStorage.setItem("homi:finance:saved-at", new Date().toISOString());
    render(
      <ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate="2026-08-01T12:00:00Z" />,
    );
    expect(screen.getByText(/Money data current/)).toBeInTheDocument();
  });

  it("money freshness states its age in days", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * DAY_MS).toISOString();
    window.localStorage.setItem("homi:finance:saved-at", fiveDaysAgo);
    render(
      <ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate="2026-08-01T12:00:00Z" />,
    );
    expect(screen.getByText(/Money data 5 days old/)).toBeInTheDocument();
  });

  it("uses the freshest stamp across the snapshot and the budget ledger", () => {
    window.localStorage.setItem(
      "homi:finance:saved-at",
      new Date(Date.now() - 9 * DAY_MS).toISOString(),
    );
    window.localStorage.setItem(
      "homi:budget-ledger:updated-at",
      String(Date.now() - 2 * DAY_MS),
    );
    render(
      <ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate="2026-08-01T12:00:00Z" />,
    );
    expect(screen.getByText(/Money data 2 days old/)).toBeInTheDocument();
  });

  it("admits when no money data has ever been saved", () => {
    render(
      <ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate="2026-08-01T12:00:00Z" />,
    );
    expect(screen.getByText(/Money data not saved yet/)).toBeInTheDocument();
  });

  it("omits the score-from segment when the assessment carries no date", () => {
    render(<ScoreProgressCard score={64} verdict="BUILD_FIRST" scoreDate={null} />);
    expect(screen.queryByText(/Score from/)).not.toBeInTheDocument();
  });
});
