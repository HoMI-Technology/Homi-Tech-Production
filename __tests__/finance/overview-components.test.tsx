// @vitest-environment jsdom
/**
 * Overview chrome tests — retargeted to planner SignalsStrip / NudgeRail
 * after finance Wave B delete (Budget Planner absorption).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { KpiCard } from "@/components/ui/KpiCard";
import { SignalsStrip } from "@/components/planner/SignalsStrip";
import { NudgeRail } from "@/components/planner/NudgeRail";
import type { PlannerSignal } from "@/lib/planner/signals";
import type { BehaviorNudge } from "@/lib/planner/nudges";

vi.mock("@/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({ value, format }: { value: number; format?: (n: number) => string }) => (
    <span>{format ? format(value) : value}</span>
  ),
}));

beforeEach(() => {
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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Cash" value={1200} />);
    expect(screen.getByText("Cash")).toBeTruthy();
  });
});

describe("planner SignalsStrip", () => {
  const signal: PlannerSignal = {
    id: "sig-1",
    severity: "amber",
    kind: "bill",
    title: "1 overdue bill",
    body: "Electric past due.",
    actionLabel: "Pay bills",
    actionTab: "banking",
    meta: "IF-THEN",
  };

  it("renders signals and dismisses", () => {
    const onDismiss = vi.fn();
    const onAction = vi.fn();
    render(<SignalsStrip signals={[signal]} onDismiss={onDismiss} onAction={onAction} />);
    expect(screen.getByText("1 overdue bill")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Dismiss 1 overdue bill"));
    expect(onDismiss).toHaveBeenCalledWith("sig-1");
  });

  it("empty state when no signals", () => {
    render(<SignalsStrip signals={[]} onDismiss={() => {}} onAction={() => {}} />);
    expect(screen.getByText(/No active signals/i)).toBeTruthy();
  });
});

describe("planner NudgeRail", () => {
  const nudge: BehaviorNudge = {
    id: "n1",
    kind: "protect_decision",
    priority: 1,
    title: "Protect the decision first",
    body: "Clear hard-stops before stretch.",
    actionLabel: "Open Plan",
    actionTab: "plan",
    chip: "Protection",
  };

  it("renders primary nudge and action", () => {
    const onAction = vi.fn();
    render(<NudgeRail nudges={[nudge]} onAction={onAction} />);
    expect(screen.getByText("Protect the decision first")).toBeTruthy();
    fireEvent.click(screen.getByText(/Open Plan/i));
    expect(onAction).toHaveBeenCalled();
  });
});
