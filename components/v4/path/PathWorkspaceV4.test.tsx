// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PathWorkspaceV4 } from "@/components/v4/path/PathWorkspaceV4";
import { AssessmentWalkChromeProvider } from "@/components/v4/assessment/AssessmentWalkChrome";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { V4_PRIMARY_NAV, V4_SHELL_ASSESS_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { pathV4VisualView } from "@/lib/v4/path-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/path",
}));

afterEach(() => {
  cleanup();
});

describe("Path v4 workspace in Shell v4", () => {
  it("empty state is Assess-only with no fake steps or fold compass", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <PathWorkspaceV4 view={pathV4VisualView("empty")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-path-v4]")).not.toBeNull();
    expect(container.querySelector("[data-path-v4-empty]")).not.toBeNull();
    expect(container.querySelector("[data-path-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='path']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(text).toContain("Path appears after a read.");
    expect(text).toContain("never invent filler");
    expect(container.querySelector("[data-path-v4-assess]")?.getAttribute("href")).toBe(
      V4_SHELL_ASSESS_HREF,
    );
    expect(container.querySelectorAll("[data-path-v4-step]")).toHaveLength(0);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(V4_PRIMARY_NAV.some((item) => item.href === V4_SHELL_PATH_HREF)).toBe(true);
  });

  it("hard-stop ACTIVE addresses the hold and never paints On track or READY", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <PathWorkspaceV4 view={pathV4VisualView("hard-stop")} />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-path-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("Build runway to 1 month");
    expect(text).toContain("Addresses the current hold.");
    expect(container.querySelectorAll("[data-path-v4-step]").length).toBeLessThanOrEqual(7);
    expect(container.querySelectorAll("[data-path-v4-step]").length).toBeLessThan(7);
    const ctas = [...container.querySelectorAll("[data-path-v4-cta]")];
    expect(ctas.some((node) => node.getAttribute("href") === "/money")).toBe(true);
    expect(ctas.some((node) => node.getAttribute("href") === "/assessment")).toBe(true);
    expect(ctas.every((node) => {
      const href = node.getAttribute("href");
      return href === "/money" || href === "/assessment";
    })).toBe(true);
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toMatch(/\bREADY\b/);
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Connect accounts");
    expect(text).not.toContain("Plaid");
  });
});
