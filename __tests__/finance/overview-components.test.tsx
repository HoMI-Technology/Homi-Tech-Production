// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { FinanceSignal, FinanceNudge } from "@/lib/advisor/fallback";
import { KpiCard } from "@/components/ui/KpiCard";
import { SignalsStrip } from "@/components/finance/SignalsStrip";
import { NudgeRail } from "@/components/finance/NudgeRail";

vi.mock("@/components/ui/AnimatedNumber", () => ({
  AnimatedNumber: ({
    value,
    format,
  }: {
    value: number;
    format?: (n: number) => string;
  }) => <span>{format ? format(value) : value}</span>,
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
  it("renders label, formatted value, and caption", () => {
    render(
      <KpiCard
        label="Savings Rate"
        value={15.5}
        format={(n) => `${n.toFixed(1)}%`}
        caption="of gross income"
      />,
    );

    expect(screen.getByText("Savings Rate")).toBeDefined();
    expect(screen.getByText("15.5%")).toBeDefined();
    expect(screen.getByText("of gross income")).toBeDefined();
  });

  it("renders a positive delta chip", () => {
    render(
      <KpiCard
        label="Net Worth"
        value={25000}
        format={(n) => `$${n.toLocaleString()}`}
        delta={{ text: "+3.2% vs last month", positive: true }}
      />,
    );

    const chip = screen.getByText("+3.2% vs last month");
    expect(chip).toBeDefined();
    expect(chip.className).toContain("text-emerald");
  });

  it("renders a negative delta chip", () => {
    render(
      <KpiCard
        label="Runway"
        value={2.5}
        format={(n) => `${n.toFixed(1)} mo`}
        delta={{ text: "-0.8 mo", positive: false }}
      />,
    );

    const chip = screen.getByText("-0.8 mo");
    expect(chip).toBeDefined();
    expect(chip.className).toContain("text-crimson");
  });

  it("calls onClick when activated", () => {
    const onClick = vi.fn();
    render(<KpiCard label="DTI" value={28} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: /DTI/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("SignalsStrip", () => {
  const signals: FinanceSignal[] = [
    {
      id: "runway-low",
      severity: "amber",
      title: "Runway is tight",
      body: "You have under three months of expenses covered.",
    },
    {
      id: "all-clear",
      severity: "emerald",
      title: "All clear",
      body: "Your signals look healthy.",
    },
  ];

  it("renders signal titles and bodies", () => {
    render(
      <SignalsStrip
        signals={signals}
        onAction={() => {}}
        onDismiss={() => {}}
      />,
    );

    expect(screen.getByText("Runway is tight")).toBeDefined();
    expect(screen.getByText("You have under three months of expenses covered.")).toBeDefined();
    expect(screen.getByText("All clear")).toBeDefined();
  });

  it("fires onAction with the signal", () => {
    const onAction = vi.fn();
    render(
      <SignalsStrip
        signals={[signals[0]]}
        onAction={onAction}
        onDismiss={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Take action/i }));
    expect(onAction).toHaveBeenCalledWith(signals[0]);
  });

  it("fires onDismiss for non-all-clear signals", () => {
    const onDismiss = vi.fn();
    render(
      <SignalsStrip
        signals={[signals[0]]}
        onAction={() => {}}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Dismiss Runway is tight/i }));
    expect(onDismiss).toHaveBeenCalledWith("runway-low");
  });

  it("does not render a dismiss button for the all-clear signal", () => {
    render(
      <SignalsStrip
        signals={[signals[1]]}
        onAction={() => {}}
        onDismiss={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: /Dismiss/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Keep going/i })).toBeDefined();
  });
});

describe("NudgeRail", () => {
  const nudges: FinanceNudge[] = [
    {
      id: "nudge-debt",
      type: "debt",
      message: "Pay down high-rate debt first.",
      action: { label: "Open planner", href: "/tools/debt-payoff" },
    },
    {
      id: "nudge-savings",
      type: "savings",
      message: "Build the emergency runway.",
    },
  ];

  it("renders the primary nudge and secondaries", () => {
    render(<NudgeRail nudges={nudges} onAction={() => {}} />);

    expect(screen.getByText("Pay down high-rate debt first.")).toBeDefined();
    expect(screen.getByText("Build the emergency runway.")).toBeDefined();
    expect(screen.getByRole("button", { name: /Open planner/i })).toBeDefined();
  });

  it("fires onAction with the primary nudge", () => {
    const onAction = vi.fn();
    render(<NudgeRail nudges={nudges} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: /Open planner/i }));
    expect(onAction).toHaveBeenCalledWith(nudges[0]);
  });

  it("fires onAction with a secondary nudge", () => {
    const onAction = vi.fn();
    render(<NudgeRail nudges={nudges} onAction={onAction} />);

    fireEvent.click(screen.getByText("Build the emergency runway."));
    expect(onAction).toHaveBeenCalledWith(nudges[1]);
  });
});
