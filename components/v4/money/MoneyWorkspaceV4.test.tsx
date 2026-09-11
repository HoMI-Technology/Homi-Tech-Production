// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoneyWorkspaceV4 } from "@/components/v4/money/MoneyWorkspaceV4";
import { AssessmentWalkChromeProvider } from "@/components/v4/assessment/AssessmentWalkChrome";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { V4_PRIMARY_NAV, V4_SHELL_MONEY_HREF } from "@/lib/layout/v4-shell";
import { moneyV4VisualView } from "@/lib/v4/money-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/money",
}));

afterEach(() => {
  cleanup();
});

describe("Money v4 workspace in Shell v4", () => {
  it("empty state is Connect-only with no fake $ or fold compass", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <MoneyWorkspaceV4 view={moneyV4VisualView("empty")} />
      </ShellV4>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-money-v4]")).not.toBeNull();
    expect(container.querySelector("[data-money-v4-empty]")).not.toBeNull();
    expect(container.querySelector("[data-money-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='money']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(text).toContain("Accounts aren't connected yet.");
    expect(text).toContain("never invent balances");
    expect(container.querySelector("[data-money-v4-connect]")?.getAttribute("href")).toBe(
      "/connections",
    );
    expect(container.querySelectorAll("[data-money-v4-live-amount]")).toHaveLength(0);
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    expect(V4_PRIMARY_NAV.some((item) => item.href === V4_SHELL_MONEY_HREF)).toBe(true);
  });

  it("hard-stop ACTIVE addresses the hold and never paints On track or READY", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <MoneyWorkspaceV4 view={moneyV4VisualView("hard-stop")} />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-money-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway is the hold.");
    expect(text).toContain("Connecting does not clear the hard stop");
    expect(text).toContain("No On track theater.");
    expect(container.querySelector("[data-money-v4-connect]")?.getAttribute("href")).toBe(
      "/connections",
    );
    expect(text).not.toMatch(/\bREADY\b/);
    expect(text).not.toMatch(/\$\d/);
    expect(container.querySelectorAll("[data-money-v4-live-amount]")).toHaveLength(0);
    expect(text).not.toMatch(/verified/i);
  });

  it("connected live uses JetBrains amounts, always shows age, and labels craft $", () => {
    const { container } = render(
      <AssessmentWalkChromeProvider>
        <MoneyWorkspaceV4 view={moneyV4VisualView("connected")} />
      </AssessmentWalkChromeProvider>,
    );
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-money-v4-connected]")).not.toBeNull();
    expect(container.querySelector("[data-money-v4-age]")?.textContent).toMatch(/Synced 12 mo ago/i);
    expect(text).toContain("$4,280");
    expect(text).toContain("$3,120.00");
    expect(text).toContain("$1,160.00");
    expect(text).toContain("Craft mock only");
    expect(container.querySelector(".v4-money-hero-amount")).not.toBeNull();
    expect(container.querySelectorAll("[data-money-v4-live-amount]").length).toBeGreaterThan(0);
    expect(container.querySelector("[data-money-v4-homi]")).not.toBeNull();
    expect(text).toContain("What does liquid cash mean here?");
    expect(text).not.toContain("Homie");
  });

  it("sets Ask HōMI about this financial picture on the command field", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <MoneyWorkspaceV4 view={moneyV4VisualView("empty")} />
      </ShellV4>,
    );
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this financial picture...");
    const homiAsk = container.querySelector("[data-money-v4-homi-ask]") as HTMLInputElement | null;
    expect(homiAsk?.placeholder).toBe("Ask HōMI about this financial picture...");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    const { container } = render(
      <ShellV4 greeting="Welcome back" firstName={null}>
        <MoneyWorkspaceV4 view={moneyV4VisualView("empty")} />
      </ShellV4>,
    );
    const homi = container.querySelector("[data-money-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-money-homi")).toBe(true);
    expect(homi?.classList.contains("v4-assess-homi")).toBe(false);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector(".v4-money")?.contains(homi)).toBe(true);
  });
});
