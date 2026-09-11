// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompareWorkspaceV4 } from "@/components/v4/compare/CompareWorkspaceV4";
import { AssessmentWalkChromeProvider } from "@/components/v4/assessment/AssessmentWalkChrome";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { V4_PRIMARY_NAV, V4_SHELL_COMPARE_HREF } from "@/lib/layout/v4-shell";
import { compareV4VisualView } from "@/lib/v4/compare-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/scenarios",
}));

afterEach(() => {
  cleanup();
});

describe("Compare v4 workspace in Shell v4", () => {
  it("empty state is Start-only with no fake $ or fold compass", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <CompareWorkspaceV4 view={compareV4VisualView("empty")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-compare-v4]")).not.toBeNull();
    expect(container.querySelector("[data-compare-v4-empty]")).not.toBeNull();
    expect(container.querySelector("[data-compare-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='compare']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(text).toContain("No scenarios yet.");
    expect(text).toContain("never invent results or a second score");
    expect(container.querySelector("[data-compare-v4-start]")?.textContent).toMatch(/Start a comparison/);
    expect(container.querySelectorAll("[data-compare-v4-card]")).toHaveLength(0);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toContain("Example craft");
    expect(V4_PRIMARY_NAV.some((item) => item.href === V4_SHELL_COMPARE_HREF)).toBe(true);
  });

  it("hard-stop ACTIVE stays educational-only and never paints On track or READY", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <CompareWorkspaceV4 view={compareV4VisualView("hard-stop")} />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-compare-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("educational-only");
    expect(text).toContain("No On track theater.");
    expect(text).toContain("they do not clear the hard stop");
    expect(container.querySelector("[data-compare-v4-start]")).not.toBeNull();
    expect(text).not.toMatch(/\bREADY\b/);
    expect(text).not.toMatch(/\$\d/);
    expect(container.querySelectorAll("[data-compare-v4-live-amount]")).toHaveLength(0);
  });

  it("normal approved cards stay educational, quiet-age, and Path-bound", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <CompareWorkspaceV4 view={compareV4VisualView("normal")} />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-compare-v4-list]")).not.toBeNull();
    expect(container.querySelector("[data-compare-v4-age]")?.textContent).toMatch(/Last run Aug 29/i);
    expect(text).toContain("Compare approaches without a second score.");
    expect(text).toContain("Educational · not a score");
    expect(text).not.toContain("Example craft");
    expect(container.querySelectorAll("[data-compare-v4-card]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-compare-v4-card]").length).toBeLessThanOrEqual(4);
    const ctas = [...container.querySelectorAll("[data-compare-v4-cta]")];
    expect(ctas.every((node) => node.getAttribute("href") === "/path")).toBe(true);
    expect(container.querySelector("[data-compare-v4-homi]")).not.toBeNull();
    expect(text).toContain("What is educational compare?");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
  });

  it("sets Ask HōMI about this comparison on the command field", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <CompareWorkspaceV4 view={compareV4VisualView("empty")} />
      </ShellV4>,
    );
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this comparison...");
    const homiAsk = container.querySelector("[data-compare-v4-homi-ask]") as HTMLInputElement | null;
    expect(homiAsk?.placeholder).toBe("Ask HōMI about this comparison...");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <CompareWorkspaceV4 view={compareV4VisualView("empty")} />
      </ShellV4>,
    );
    const homi = container.querySelector("[data-compare-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-compare-homi")).toBe(true);
    expect(homi?.classList.contains("v4-assess-homi")).toBe(false);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector(".v4-compare")?.contains(homi)).toBe(true);
  });

  it("Start a comparison reveals approved templates without inventing $", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <CompareWorkspaceV4 view={compareV4VisualView("empty")} />
      </AssessmentWalkChromeProvider>,
    );
    fireEvent.click(container.querySelector("[data-compare-v4-start]") as HTMLButtonElement);
    expect(container.querySelector("[data-compare-v4-list]")).not.toBeNull();
    expect(container.querySelectorAll("[data-compare-v4-card]").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-compare-v4-card]").length).toBeLessThanOrEqual(4);
    expect(container.textContent).toContain("Educational · not a score");
    expect(container.textContent).not.toMatch(/\$\d/);
  });
});
