// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { EmployeeWorkspaceV4 } from "@/components/v4/employee/EmployeeWorkspaceV4";
import { V4_MORE_NAV, V4_PRIMARY_NAV } from "@/lib/layout/v4-shell";
import { employeeV4VisualView } from "@/lib/v4/employee-workspace";

const nav = vi.hoisted(() => ({ pathname: "/employee/dashboard" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => nav.pathname,
}));

afterEach(() => {
  cleanup();
  nav.pathname = "/employee/dashboard";
});

function shell(child: ReactNode) {
  return (
    <ShellV4 greeting="Welcome back" firstName={null}>
      {child}
    </ShellV4>
  );
}

describe("Employee v4 in Shell v4", () => {
  it("empty selects employee Home, micro Clarity, no fake scores", () => {
    const { container } = render(
      shell(<EmployeeWorkspaceV4 view={employeeV4VisualView("empty")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-employee-v4-kind='empty']")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='home']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-v4-workspace-chip='employee']")?.textContent).toMatch(
      /Employee\s*operate/,
    );
    expect(container.querySelector("[data-v4-rail-primary]")).toBeNull();
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Employee")).toBe(false);
    expect(text).toContain("Connect or wait for live workspace data");
    expect(text).not.toContain("Money");
    expect(text).not.toContain("Compare");
    expect(container.querySelector("[data-employee-v4-job]")).toBeNull();
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe(
      "/employee/dashboard#attention",
    );
    expect(container.querySelector("[data-v4-homi-header='micro']")).not.toBeNull();
    expect(container.querySelector("[data-employee-v4-homi] [data-wordmark]")).toBeNull();
    expect(container.querySelector("[data-employee-v4-homi] .v4-homi-mode")?.textContent).toBe(
      "Clarity",
    );
    expect(
      container.querySelectorAll("[data-system-v4-grid] > .v4-system-main > *").length,
    ).toBeLessThanOrEqual(3);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    expect(text).not.toContain("HeroScore");
    expect(text).not.toContain("Switch workspace only if");
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this workspace...");
    expect(
      (container.querySelector("[data-employee-v4-homi-ask]") as HTMLInputElement | null)
        ?.placeholder,
    ).toBe("Ask HōMI about this workspace...");
  });

  it("hard-stop never paints On track or READY", () => {
    const { container } = render(
      shell(<EmployeeWorkspaceV4 view={employeeV4VisualView("hard-stop")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-system-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway hold — operate stays explain-only.");
    expect(text).toMatch(/never On track/i);
    expect(text).toContain("Employee operate does not clear a personal hard stop.");
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe("/path");
    expect(container.querySelector("[data-system-v4-verdict]")?.textContent).toBe("DO NOT PROCEED");
    expect(container.querySelector("[data-system-v4-verdict]")?.textContent).not.toBe("READY");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("HeroScore");
  });

  it("normal shows Attention + Privacy live chrome with quiet age", () => {
    const { container } = render(
      shell(<EmployeeWorkspaceV4 view={employeeV4VisualView("normal")} />),
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-system-v4-age]")?.textContent).toMatch(/Synced 12m ago/);
    expect(container.querySelector("[data-employee-v4-job='attention']")).not.toBeNull();
    expect(container.querySelector("[data-employee-v4-job='privacy']")).not.toBeNull();
    expect(text).toContain("Your operate home.");
    expect(text).toContain("Live items only · empty if none");
    expect(text).toContain("No peer-score listing");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this workspace...");
  });

  it("mobile Ask sheet is prompts only — no Open HōMI and no nav dump", () => {
    const { container } = render(
      shell(<EmployeeWorkspaceV4 view={employeeV4VisualView("empty")} />),
    );
    fireEvent.focus(container.querySelector("[data-v4-ask-homi]") as HTMLInputElement);
    const sheet = container.querySelector("[data-v4-ask-sheet]");
    expect(sheet?.getAttribute("data-v4-ask-sheet")).toBe("ask-only");
    expect(container.querySelector("[data-v4-ask-open]")).toBeNull();
    expect(sheet?.textContent).not.toContain("Open HōMI");
    expect(sheet?.textContent).not.toMatch(/\bCompare\b/);
    expect(sheet?.textContent).not.toMatch(/\bAccounts\b/);
    expect(sheet?.textContent).toContain("Why no peer scores?");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    const { container } = render(
      shell(<EmployeeWorkspaceV4 view={employeeV4VisualView("empty")} />),
    );
    const homi = container.querySelector("[data-employee-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-system-homi")).toBe(true);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector("[data-employee-v4]")?.contains(homi)).toBe(true);
    expect(V4_MORE_NAV.some((item) => item.label === "Employee")).toBe(false);
  });
});
