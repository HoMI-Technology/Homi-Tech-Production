// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { VerdictBadge } from "./VerdictBadge";
import { ReadinessBar } from "./ReadinessBar";
import { SubMetricPill } from "./SubMetricPill";
import { resolveVerdictKey, ratioToScore } from "./verdict-ssot";
import { scoreToVerdict } from "@/lib/scoring/public";
import { VERDICT_META } from "@/lib/brand";

afterEach(() => {
  cleanup();
});

describe("VerdictBadge — ADR-001 label", () => {
  it("renders DO NOT PROCEED for NOT_YET (never NOT YET)", () => {
    render(<VerdictBadge verdict="NOT_YET" />);
    expect(screen.getByText("DO NOT PROCEED")).toBeTruthy();
    expect(screen.queryByText("NOT YET")).toBeNull();
    expect(screen.getByText("DO NOT PROCEED").closest("[data-verdict]")?.getAttribute("data-verdict")).toBe(
      "NOT_YET",
    );
  });

  it("keeps READY / ALMOST THERE / BUILD FIRST labels from VERDICT_META", () => {
    const { rerender } = render(<VerdictBadge verdict="READY" />);
    expect(screen.getByText("READY")).toBeTruthy();
    rerender(<VerdictBadge verdict="ALMOST_THERE" />);
    expect(screen.getByText("ALMOST THERE")).toBeTruthy();
    rerender(<VerdictBadge verdict="BUILD_FIRST" />);
    expect(screen.getByText("BUILD FIRST")).toBeTruthy();
  });
});

describe("VerdictBadge — score prop via public SSOT", () => {
  it.each([
    [100, "READY", VERDICT_META.READY.label],
    [80, "READY", VERDICT_META.READY.label],
    [79, "ALMOST_THERE", VERDICT_META.ALMOST_THERE.label],
    [65, "ALMOST_THERE", VERDICT_META.ALMOST_THERE.label],
    [64, "BUILD_FIRST", VERDICT_META.BUILD_FIRST.label],
    [50, "BUILD_FIRST", VERDICT_META.BUILD_FIRST.label],
    [49, "NOT_YET", VERDICT_META.NOT_YET.label],
    [0, "NOT_YET", VERDICT_META.NOT_YET.label],
  ] as const)("score %i → %s (%s)", (score, key, label) => {
    expect(scoreToVerdict(score)).toBe(key);
    render(<VerdictBadge score={score} />);
    expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText(label).closest("[data-verdict]")?.getAttribute("data-verdict")).toBe(key);
  });

  it("hardStops force NOT_YET / DO NOT PROCEED even when score is READY-band", () => {
    render(<VerdictBadge score={92} hardStops={[{ code: "DTI" }]} />);
    expect(screen.getByText("DO NOT PROCEED")).toBeTruthy();
    expect(
      screen.getByText("DO NOT PROCEED").closest("[data-verdict]")?.getAttribute("data-verdict"),
    ).toBe("NOT_YET");
  });

  it("hardStops={true} also forces the protective band", () => {
    render(<VerdictBadge score={88} hardStops />);
    expect(screen.getByText("DO NOT PROCEED")).toBeTruthy();
  });
});

describe("verdict-ssot helpers", () => {
  it("resolveVerdictKey prefers explicit verdict over score when no hard stops", () => {
    expect(resolveVerdictKey({ verdict: "BUILD_FIRST", score: 90 })).toBe("BUILD_FIRST");
  });

  it("resolveVerdictKey lets hard stops outrank an explicit ALMOST_THERE at 65", () => {
    expect(
      resolveVerdictKey({ verdict: "ALMOST_THERE", score: 65, hardStops: [{ code: "RUNWAY_UNDER_1_MONTH" }] }),
    ).toBe("NOT_YET");
  });

  it("resolveVerdictKey maps via scoreToVerdict when no hard stops", () => {
    expect(resolveVerdictKey({ score: 80 })).toBe(scoreToVerdict(80));
    expect(resolveVerdictKey({ score: 49 })).toBe("NOT_YET");
  });

  it("ratioToScore normalizes value/max onto 0–100", () => {
    expect(ratioToScore(35, 35)).toBe(100);
    expect(ratioToScore(0, 35)).toBe(0);
    expect(ratioToScore(17.5, 35)).toBe(50);
  });
});

describe("ReadinessBar + SubMetricPill SSOT", () => {
  it("ReadinessBar legend shows DO NOT PROCEED for low scores", () => {
    render(<ReadinessBar score={40} />);
    expect(screen.getByText("DO NOT PROCEED")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuenow")).toBe("40");
  });

  it("SubMetricPill colors from value/max through the same bands", () => {
    render(<SubMetricPill label="Financial" value={28} max={35} />);
    // 28/35 ≈ 80 → READY band
    expect(screen.getByText("Financial").closest("[data-verdict]")?.getAttribute("data-verdict")).toBe(
      "READY",
    );
    expect(screen.getByText("28/35")).toBeTruthy();
  });

  it("SubMetricPill score={49} → NOT_YET", () => {
    render(<SubMetricPill label="Timing" score={49} />);
    expect(screen.getByText("Timing").closest("[data-verdict]")?.getAttribute("data-verdict")).toBe(
      "NOT_YET",
    );
  });
});
