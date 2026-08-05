// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AssessmentResult } from "@/lib/scoring";
import type { ReadinessPath } from "@/lib/readiness";

let mockLocalResult: { result: AssessmentResult; completedAt: string } | null = null;
let mockReadinessPath: ReadinessPath | null = null;
let mockEnsurePath: ReadinessPath | null = null;

vi.doMock("@/components/finance/ThresholdCompass", () => ({
  ThresholdCompass: ({ result }: { result: AssessmentResult }) => (
    <div data-testid="threshold-compass">Compass: {result.verdict}</div>
  ),
}));

vi.doMock("@/components/finance/PillarBreakdown", () => ({
  PillarBreakdown: ({ result }: { result: AssessmentResult }) => (
    <div data-testid="pillar-breakdown">Pillars: {result.score}</div>
  ),
}));

vi.doMock("@/components/finance/HardStopBanner", () => ({
  HardStopBanner: ({ result }: { result: AssessmentResult }) => (
    <div data-testid="hard-stop-banner">Hard stops: {result.hardStops.length}</div>
  ),
}));

vi.doMock("@/components/finance/WarningsBanner", () => ({
  WarningsBanner: ({ result }: { result: AssessmentResult }) => (
    <div data-testid="warnings-banner">Warnings: {result.warnings.length}</div>
  ),
}));

vi.doMock("@/lib/assessment/storage", () => ({
  loadLocalResult: () => mockLocalResult,
}));

vi.doMock("@/lib/readiness", async () => {
  const actual = await vi.importActual<typeof import("@/lib/readiness")>("@/lib/readiness");
  return {
    ...actual,
    loadReadinessPath: () => mockReadinessPath,
    ensurePathForVerdict: () => mockEnsurePath,
    saveReadinessPath: vi.fn(),
    pathCompletionRatio: (path: ReadinessPath) => {
      const steps = path.steps.filter((s) => s.status !== "pending");
      return path.steps.length ? steps.length / path.steps.length : 0;
    },
    bindingConstraintLabel: (code: string | null) =>
      code ? String(code).replace(/_/g, " ") : "Readiness gap",
  };
});

const { PlanTab } = await import("@/components/finance/PlanTab");

const sampleResult: AssessmentResult = {
  score: 72,
  verdict: "ALMOST_THERE",
  financial: {
    debtToIncome: 8,
    downPayment: 7,
    emergencyFund: 5,
    creditHealth: 6,
    total: 26,
  },
  emotional: {
    lifeStability: 7,
    confidenceLevel: 7,
    partnerAlignment: 7,
    fomoCheck: 6,
    total: 27,
    singleRedistribution: false,
  },
  timing: {
    timeHorizon: 8,
    savingsRate: 7,
    downPaymentProgress: 6,
    total: 21,
  },
  warnings: [{ code: "SAVINGS_RATE", message: "Savings rate could improve." }],
  hardStops: [],
};

const samplePath: ReadinessPath = {
  id: "path-test",
  version: 1,
  createdAt: new Date().toISOString(),
  assessmentCompletedAt: null,
  verdict: "ALMOST_THERE",
  score: 72,
  bindingConstraint: "PILLAR_FINANCIAL",
  confidence: "assessment_only",
  disclaimer: "Educational readiness only.",
  mode: "build",
  calendarCommittedAt: null,
  steps: [
    {
      id: "s1",
      title: "Build emergency fund",
      kind: "milestone",
      daysFromNow: 3,
      reasonCode: "PILLAR_FINANCIAL",
      href: "/finance",
      notes: "Save three months of expenses before moving forward.",
      fundingTarget: 5000,
      fundingLabel: "Target",
      status: "pending",
      completedAt: null,
    },
  ],
};

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
  mockLocalResult = null;
  mockReadinessPath = null;
  mockEnsurePath = null;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("PlanTab", () => {
  it("renders the empty state CTA when no assessment is stored", () => {
    render(<PlanTab />);

    expect(screen.getByText(/No readiness verdict yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Start assessment/i })).toHaveAttribute(
      "href",
      "/assessment",
    );
    expect(screen.queryByTestId("threshold-compass")).not.toBeInTheDocument();
  });

  it("renders the compass, banners, and build path when an assessment exists", async () => {
    mockLocalResult = { result: sampleResult, completedAt: new Date().toISOString() };
    mockEnsurePath = samplePath;

    render(<PlanTab />);

    await waitFor(() => {
      expect(screen.getByTestId("threshold-compass")).toHaveTextContent("Compass: ALMOST_THERE");
    });

    expect(screen.getByTestId("pillar-breakdown")).toHaveTextContent("Pillars: 72");
    expect(screen.getByTestId("hard-stop-banner")).toHaveTextContent("Hard stops: 0");
    expect(screen.getByTestId("warnings-banner")).toHaveTextContent("Warnings: 1");
    expect(screen.getByText(/Build emergency fund/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refresh from live numbers/i })).toBeInTheDocument();
  });
});
