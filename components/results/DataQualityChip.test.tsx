// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DataQualityChip } from "./DataQualityChip";
import { saveFinanceState, DEFAULT_FINANCE_STATE } from "@/lib/finance/store";
import { displayedScoreFromRaw, BAND_FACTOR } from "@/lib/readiness/confidence";

describe("DataQualityChip", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders assessment-only medium confidence when no money picture is saved", async () => {
    render(
      <DataQualityChip rawScore={80} assessmentCompletedAt={new Date().toISOString()} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/data quality confidence/i)).toHaveAttribute(
        "data-data-quality",
        "medium",
      );
    });

    expect(screen.getByText(/data quality · medium/i)).toBeTruthy();
    expect(screen.getByText(/assessment only/i)).toBeTruthy();
    expect(screen.getByText(/add a money picture/i)).toBeTruthy();
    expect(screen.getByText(String(displayedScoreFromRaw(80, BAND_FACTOR.medium)))).toBeTruthy();
    expect(screen.getByText(/raw score stays canonical/i)).toBeTruthy();
  });

  it("renders high confidence when a fresh money picture exists — no dampening copy", async () => {
    saveFinanceState({ ...DEFAULT_FINANCE_STATE });
    render(
      <DataQualityChip rawScore={71} assessmentCompletedAt={new Date().toISOString()} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/data quality confidence/i)).toHaveAttribute(
        "data-data-quality",
        "high",
      );
    });

    expect(screen.getByText(/data quality · high/i)).toBeTruthy();
    expect(screen.getByText(/assessment \+ finance/i)).toBeTruthy();
    expect(screen.queryByText(/raw score stays canonical/i)).toBeNull();
    expect(screen.queryByText(/add a money picture/i)).toBeNull();
  });
});
