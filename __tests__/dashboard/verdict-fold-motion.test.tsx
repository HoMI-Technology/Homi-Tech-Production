// @vitest-environment jsdom

/**
 * Rescue-of-#326 locks: the verdict fold renders the server integer with no
 * digit ticker, the Companion/sheet motion system exists in CSS and dies under
 * prefers-reduced-motion, and the naming law holds on every surface this wave
 * touches ("Decision Readiness Score", never "HōMI-Score").
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import { HeroScore } from "@/components/dashboard/HeroScore";
import { VerdictBadge } from "@/components/ui/VerdictBadge";

const ROOT = process.cwd();
const src = (...segments: string[]) =>
  readFileSync(join(ROOT, ...segments), "utf8");

afterEach(cleanup);

describe("HeroScore — static server value, no ticker", () => {
  it("renders the returned integer with the Decision Readiness Score name", () => {
    const { container } = render(<HeroScore value={71} color={COLORS.yellow} />);
    expect(screen.getByText("71")).toBeInTheDocument();
    expect(
      screen.getByText("Overall Decision Readiness Score 71 out of 100"),
    ).toBeInTheDocument();
    // The only motion is the one-shot crossfade of the final figure.
    expect(container.querySelector(".score-reveal")).not.toBeNull();
  });

  it("never mounts the count-up ticker or the entrance-state gate", () => {
    const hero = src("components", "dashboard", "HeroScore.tsx");
    expect(hero).not.toContain("useCountUp");
    expect(hero).not.toContain("count-up");
    expect(hero).not.toContain("entrance-state");
    expect(hero).not.toContain("Math.round(display");
  });

  it("PillarRing draws the arc but the numeral is always the final value", () => {
    const ring = src("components", "dashboard", "PillarRing.tsx");
    expect(ring).not.toContain("useCountUp");
    expect(ring).not.toContain("Math.round(displayed)");
  });
});

describe("VerdictBadge — accessible name without a live region", () => {
  it("announces label + temperature, never role=status on a static reading", () => {
    const { container } = render(<VerdictBadge verdict="ALMOST_THERE" />);
    const badge = container.querySelector("[data-verdict]");
    expect(badge).toHaveAttribute("aria-label", "ALMOST THERE, Warm");
    expect(badge?.getAttribute("role")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("compact hideTemperature form names the label alone", () => {
    const { container } = render(<VerdictBadge verdict="READY" hideTemperature />);
    expect(container.querySelector("[data-verdict]")).toHaveAttribute("aria-label", "READY");
  });
});

describe("companion / fold motion system", () => {
  const css = src("app", "globals.css");

  it("globals.css carries the calm motion kit", () => {
    for (const token of [
      "--ease-out: cubic-bezier(0.23, 1, 0.32, 1)",
      "--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)",
      ".companion-launcher",
      ".companion-sheet",
      ".companion-typing-dot",
      ".score-reveal",
    ]) {
      expect(css).toContain(token);
    }
  });

  it("reduced motion kills the sheet animation, typing dots, and score reveal", () => {
    const rm = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(rm).toContain(".companion-typing-dot,");
    expect(rm).toContain(".score-reveal");
    expect(rm).toContain("animation: none;");
    expect(rm).toContain("companion-sheet-in-rm");
  });

  it("hover lift on glass cards is a precise-pointer affordance", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
  });

  it("CompanionWidget wires the calm sheet + honest typing indicator", () => {
    const widget = src("components", "companion", "CompanionWidget.tsx");
    expect(widget).toContain("companion-sheet");
    expect(widget).toContain("companion-launcher");
    expect(widget).not.toContain("hover:scale-105");
    expect(widget).toContain('aria-label="HōMI is thinking"');
    expect(widget).toContain("companion-typing-dot");
    // Close affordance is a real 44px target.
    expect(widget).toContain("min-h-11 min-w-11");
  });

  it("AppSidebar drawer falls back to a fade under reduced motion", () => {
    const sidebar = src("components", "layout", "AppSidebar.tsx");
    expect(sidebar).toContain("useReducedMotion");
    expect(sidebar).toContain("reduceMotion ? 0.12 : 0.2");
  });
});

describe("naming law — rescued surfaces never say HōMI-Score", () => {
  const BANNED = ["HōMI-Score", "HōMI Score", "Homie Score", "Homie-Score"] as const;
  const TOUCHED = [
    ["components", "score", "ScoreRail.tsx"],
    ["components", "dashboard", "HeroScore.tsx"],
    ["components", "dashboard", "ThresholdFold.tsx"],
    ["components", "ui", "VerdictBadge.tsx"],
    ["app", "(product)", "employee", "dashboard", "page.tsx"],
    ["app", "(product)", "report", "[id]", "page.tsx"],
    ["app", "share", "[token]", "page.tsx"],
  ] as const;

  it.each(TOUCHED.map((segments) => [segments.join("/"), segments] as const))(
    "%s carries only Decision Readiness Score",
    (_label, segments) => {
      const text = src(...segments);
      for (const banned of BANNED) {
        expect(text).not.toContain(banned);
      }
    },
  );

  it("score-bearing surfaces name the instrument Decision Readiness Score", () => {
    for (const segments of [
      ["components", "score", "ScoreRail.tsx"],
      ["components", "dashboard", "HeroScore.tsx"],
      ["components", "dashboard", "ThresholdFold.tsx"],
      ["app", "(product)", "employee", "dashboard", "page.tsx"],
      ["app", "(product)", "report", "[id]", "page.tsx"],
      ["app", "share", "[token]", "page.tsx"],
    ] as const) {
      expect(src(...segments)).toContain("Decision Readiness Score");
    }
  });
});
