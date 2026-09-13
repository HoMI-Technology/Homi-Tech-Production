// @vitest-environment jsdom
import type { ReactNode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import { AccountsWorkspaceV4 } from "@/components/v4/accounts/AccountsWorkspaceV4";
import { BillsWorkspaceV4 } from "@/components/v4/bills/BillsWorkspaceV4";
import { LearnWorkspaceV4 } from "@/components/v4/learn/LearnWorkspaceV4";
import { SettingsWorkspaceV4 } from "@/components/v4/settings/SettingsWorkspaceV4";
import { ToolsWorkspaceV4 } from "@/components/v4/tools/ToolsWorkspaceV4";
import { V4_MORE_NAV, V4_PRIMARY_NAV, V4_SECONDARY_NAV } from "@/lib/layout/v4-shell";
import { accountsV4VisualView } from "@/lib/v4/accounts-workspace";
import { billsV4VisualView } from "@/lib/v4/bills-workspace";
import { learnV4VisualView } from "@/lib/v4/learn-workspace";
import { settingsV4VisualView } from "@/lib/v4/settings-workspace";
import { toolsV4VisualView } from "@/lib/v4/tools-workspace";

const nav = vi.hoisted(() => ({ pathname: "/money/bills" }));

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
  nav.pathname = "/money/bills";
});

function shell(child: ReactNode) {
  return (
    <ShellV4 greeting="Welcome back" firstName={null}>
      {child}
    </ShellV4>
  );
}

describe("System surfaces v4 in Shell v4", () => {
  it("Bills empty selects Bills not Money, micro Clarity, no fake $", () => {
    nav.pathname = "/money/bills";
    const { container } = render(shell(<BillsWorkspaceV4 view={billsV4VisualView("empty")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-product-shell='v4']")).not.toBeNull();
    expect(container.querySelector("[data-system-v4-surface='bills']")).not.toBeNull();
    expect(container.querySelector("[data-v4-rail-item='bills']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-v4-rail-item='money']")?.getAttribute("aria-current")).toBeNull();
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Bills")).toBe(false);
    expect(V4_SECONDARY_NAV.some((item) => item.href === "/money/bills")).toBe(true);
    expect(text).toContain("No bills yet.");
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe("/money");
    expect(container.querySelector("[data-system-v4-homi]")).not.toBeNull();
    expect(container.querySelector("[data-v4-homi-header='micro']")).not.toBeNull();
    expect(container.querySelector("[data-system-v4-homi] [data-wordmark]")).toBeNull();
    expect(container.querySelector("[data-system-v4-homi] .v4-homi-mode")?.textContent).toBe("Clarity");
    expect(container.querySelectorAll("[data-system-v4-grid] > .v4-system-main > *").length).toBeLessThanOrEqual(
      3,
    );
    expect(container.querySelector("main#main [aria-label*='Threshold Compass']")).toBeNull();
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    expect(text).not.toMatch(/\bOn track\b/);
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about these bills...");
    expect((container.querySelector("[data-bills-v4-homi-ask]") as HTMLInputElement | null)?.placeholder).toBe(
      "Ask HōMI about these bills...",
    );
  });

  it("Bills hard-stop never paints On track or READY", () => {
    nav.pathname = "/money/bills";
    const { container } = render(shell(<BillsWorkspaceV4 view={billsV4VisualView("hard-stop")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-system-v4-hard-stop]")).not.toBeNull();
    expect(text).toContain("DO NOT PROCEED");
    expect(text).toContain("Runway hold — bills stay ledger-only.");
    expect(text).toMatch(/never On track/i);
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe("/path");
    expect(container.querySelector("[data-system-v4-verdict]")?.textContent).toBe("DO NOT PROCEED");
    expect(text).not.toMatch(/\$\d/);
  });

  it("Tools empty Browse reveals hub REUSE and never a score tile", () => {
    nav.pathname = "/tools";
    const { container } = render(shell(<ToolsWorkspaceV4 view={toolsV4VisualView("empty")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-v4-rail-item='tools']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(text).toContain("No tools open.");
    expect(container.querySelector("[data-tools-v4-catalog]")).toBeNull();
    fireEvent.click(container.querySelector("[data-system-v4-cta]") as HTMLButtonElement);
    expect(container.querySelectorAll("[data-tools-v4-lens]").length).toBe(10);
    expect(container.textContent).toContain("Open lens");
    expect(container.textContent).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(container.textContent).not.toMatch(/\$\d/);
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about these tools...");
  });

  it("Learn empty deep-links public guides without invented courses", () => {
    nav.pathname = "/learn";
    const { container } = render(shell(<LearnWorkspaceV4 view={learnV4VisualView("empty")} />));
    expect(container.querySelector("[data-v4-rail-item='learn']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.textContent).toContain("No lessons in-app.");
    expect(container.querySelector("[data-system-v4-cta]")?.getAttribute("href")).toBe("/guides");
    expect(container.querySelector("[data-learn-v4-catalog]")).toBeNull();
    expect(container.textContent).not.toMatch(/\$\d/);
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about this learning...");
  });

  it("Accounts normal shows mask + Live SSOT, quiet age, no $", () => {
    nav.pathname = "/connections";
    const { container } = render(shell(<AccountsWorkspaceV4 view={accountsV4VisualView("normal")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-v4-rail-item='accounts']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelector("[data-system-v4-age]")?.textContent).toMatch(/Synced 12m ago/);
    expect(text).toContain("Checking · *4821");
    expect(text).toContain("Savings · *0199");
    expect(text).toContain("Live SSOT");
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toContain("Homie");
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about these accounts...");
  });

  it("Settings lists exactly three entries and quarantines extras", () => {
    nav.pathname = "/settings";
    const { container } = render(shell(<SettingsWorkspaceV4 view={settingsV4VisualView("empty")} />));
    const text = container.textContent ?? "";
    expect(container.querySelector("[data-v4-rail-item='settings']")?.getAttribute("aria-current")).toBe(
      "page",
    );
    expect(container.querySelectorAll("[data-settings-v4-entry]")).toHaveLength(3);
    expect(container.querySelector("[data-settings-v4-entry='account']")).not.toBeNull();
    expect(container.querySelector("[data-settings-v4-entry='privacy'] a")?.getAttribute("href")).toBe(
      "/legal/privacy",
    );
    expect(container.querySelector("[data-settings-v4-entry='billing'] a")?.getAttribute("href")).toBe(
      "/settings/subscription",
    );
    expect(text).not.toMatch(/notif/i);
    expect(text).not.toMatch(/\$\d/);
    const ask = container.querySelector("[data-v4-ask-homi]") as HTMLInputElement | null;
    expect(ask?.placeholder).toBe("Ask HōMI about these settings...");
  });

  it("More sheet still lists Budget, Bills, Tools, Learn, Accounts, Settings", () => {
    nav.pathname = "/money/bills";
    const { container } = render(shell(<BillsWorkspaceV4 view={billsV4VisualView("empty")} />));
    expect(V4_MORE_NAV.map((item) => item.label)).toEqual([
      "Compare",
      "Ask HōMI",
      "Budget",
      "Bills",
      "Tools",
      "Learn",
      "Accounts",
      "Settings",
    ]);
    fireEvent.click(container.querySelector("[data-v4-mobile-tab='more']") as HTMLButtonElement);
    const more = container.querySelector("[data-v4-more-list]")?.textContent ?? "";
    expect(more).toContain("Budget");
    expect(more).toContain("Bills");
    expect(more).toContain("Tools");
    expect(more).toContain("Learn");
    expect(more).toContain("Accounts");
    expect(more).toContain("Settings");
  });

  it("mobile Ask sheet is prompts only — no Open HōMI and no nav dump", () => {
    nav.pathname = "/money/bills";
    const { container } = render(shell(<BillsWorkspaceV4 view={billsV4VisualView("empty")} />));
    fireEvent.focus(container.querySelector("[data-v4-ask-homi]") as HTMLInputElement);
    const sheet = container.querySelector("[data-v4-ask-sheet]");
    expect(sheet?.getAttribute("data-v4-ask-sheet")).toBe("ask-only");
    expect(container.querySelector("[data-v4-ask-open]")).toBeNull();
    expect(sheet?.textContent).not.toContain("Open HōMI");
    expect(sheet?.textContent).not.toMatch(/\bCompare\b/);
    expect(sheet?.textContent).not.toMatch(/\bAccounts\b/);
    expect(sheet?.textContent).toContain("How do bills stay honest?");
  });

  it("mounts right HōMI as a workspace column, not a floating overlay", () => {
    nav.pathname = "/settings";
    const { container } = render(shell(<SettingsWorkspaceV4 view={settingsV4VisualView("empty")} />));
    const homi = container.querySelector("[data-system-v4-homi]");
    expect(homi).not.toBeNull();
    expect(homi?.classList.contains("v4-system-homi")).toBe(true);
    expect(container.querySelector("[data-v4-homi-rail]")).toBeNull();
    expect(container.querySelector(".v4-system")?.contains(homi)).toBe(true);
  });
});
