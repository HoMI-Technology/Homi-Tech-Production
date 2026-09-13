// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssessmentWalkFixtureV4 } from "@/components/v4/assessment/AssessmentWalkFixtureV4";
import { AssessmentWalkChromeProvider } from "@/components/v4/assessment/AssessmentWalkChrome";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { V4_PRIMARY_NAV } from "@/lib/layout/v4-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/assessment",
}));

afterEach(() => {
  cleanup();
});

describe("Assessment v4 walk in Shell v4", () => {
  it("pillar intro is quiet, path-true, and has one Continue", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <AssessmentWalkFixtureV4 state="pillar-intro" />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-assessment-v4]")).not.toBeNull();
    expect(container.querySelector("[data-assessment-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-command-assess]")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(text).toContain("Can you afford it?");
    expect(text).toMatch(/~\d+ questions on this path/);
    expect(text).not.toMatch(/Question \d+ of 45/);
    expect(text).not.toMatch(/of 45/);
    expect(text).not.toContain("Fifteen");
    expect(container.querySelectorAll("[data-assessment-continue]")).toHaveLength(1);
    expect(container.querySelector("[data-assessment-continue]")?.textContent).toBe("Continue");
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\bREADY\b/);
    expect(text).not.toContain("Decision Readiness Score");
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Assess")).toBe(false);
    expect(text).toContain("Buying a home");
  });

  it("mid-walk uses the live bank question and no fake 45 chrome", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <AssessmentWalkFixtureV4 state="mid-walk" />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("What percentage of the home price can you put as a down payment?");
    expect(text).toMatch(/Financial Reality · \d+ of ~\d+ this path/);
    expect(text).toContain("5-9%");
    expect(text).not.toContain("Less than 5%");
    expect(text).not.toMatch(/of 45/);
    expect(container.querySelector("[data-assessment-back]")).not.toBeNull();
    expect(container.querySelectorAll("[data-assessment-continue]")).toHaveLength(1);
    expect(container.querySelector("[role='progressbar']")).toBeNull();
  });
});
