// @vitest-environment jsdom
/**
 * AppSidebar primary rail shows HōMI then Assess and hides pulse/score chrome.
 * Source-lock of catalog imports lives in T3 policy.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/layout/CommandPalette", () => ({
  CommandPalette: () => null,
}));

import { AppSidebar } from "@/components/layout/AppSidebar";
import { LATEST_VERDICT_KEY } from "@/components/layout/SidebarDecisionState";
import { HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

afterEach(() => {
  cleanup();
  mockPathname = "/dashboard";
  window.localStorage.clear();
});

beforeEach(() => {
  window.localStorage.setItem(
    LATEST_VERDICT_KEY,
    JSON.stringify({
      verdict: "NOT_YET",
      score: 61,
      heldDays: 8,
      decisionType: "Personal",
    }),
  );
});

describe("AppSidebar — HōMI primary rail", () => {
  it("primary peers are HōMI then Assess — not Home / Path to Ready / Money", () => {
    render(<AppSidebar email={null} />);

    const primary = document.querySelector("[data-sidebar-primary]");
    expect(primary).not.toBeNull();
    const peers = within(primary as HTMLElement).getAllByRole("link");
    const pairs = peers.map((link) => [link.getAttribute("href"), link.textContent?.trim()]);
    expect(pairs[0]).toEqual(["/dashboard", "HōMI"]);
    expect(pairs).toContainEqual(["/assessment", "Assess"]);
    expect(pairs.map(([, label]) => label)).not.toEqual(expect.arrayContaining(["Home"]));
    expect(pairs.map(([href]) => href)).not.toContain("/path");
    expect(pairs.map(([href]) => href)).not.toContain("/money");

    expect(within(primary as HTMLElement).queryByRole("link", { name: /^home$/i })).toBeNull();
    expect(within(primary as HTMLElement).queryByRole("link", { name: /path to ready/i })).toBeNull();
    expect(within(primary as HTMLElement).queryByRole("link", { name: /^money$/i })).toBeNull();

    expect(HEADER_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "HōMI" });
    expect(HEADER_PRIMARY_NAV.map((i) => i.label)).toContain("Assess");
  });

  it("kills pulse chrome, DNP chip, Held, and the duplicate 61 on the rail", () => {
    render(<AppSidebar email={null} />);

    const rail = document.querySelector("aside");
    expect(rail).not.toBeNull();
    const text = rail?.textContent ?? "";

    expect(text).not.toMatch(/Pulse·7d/);
    expect(text).not.toMatch(/Held\s+\d+d/);
    expect(text).not.toContain("DO NOT PROCEED");
    expect(text).not.toMatch(/(^|[^0-9])61([^0-9]|$)/);
    expect(screen.queryByText("Pulse·7d")).not.toBeInTheDocument();
    expect(screen.queryByText(/Held 8d/)).not.toBeInTheDocument();
    expect(screen.queryByText("DO NOT PROCEED")).not.toBeInTheDocument();
    expect(screen.queryByText("61")).not.toBeInTheDocument();

    expect(document.querySelector("[data-sidebar-shell-compass]")).toBeNull();
    expect(document.querySelector(".sidebar-pulse-strip")).toBeNull();
    expect(document.querySelector(".sidebar-footer-chip")).toBeNull();
    expect(document.querySelector(".sidebar-state-badge")).toBeNull();
    expect(document.querySelector(".sidebar-score-hero")).toBeNull();
  });

  it("HōMI row has no Lucide Compass; the rail does not mount a second Threshold Compass", () => {
    render(<AppSidebar email={null} />);

    const rail = document.querySelector("aside");
    expect(rail).not.toBeNull();
    const homi = (rail as HTMLElement).querySelector(
      '[data-sidebar-primary] a[href="/dashboard"]',
    );
    expect(homi).not.toBeNull();
    expect(homi?.querySelector(".lucide-compass")).toBeNull();
    expect(homi?.querySelector(".lucide-layout-grid")).toBeNull();
    expect(homi?.querySelector("svg")).toBeNull();
    expect(rail?.querySelectorAll(".lucide-compass")).toHaveLength(0);
    expect(rail?.querySelectorAll("[data-sidebar-shell-compass]")).toHaveLength(0);
    expect(rail?.querySelectorAll('[aria-label*="Threshold Compass"]')).toHaveLength(0);
    expect(document.querySelectorAll('[aria-label*="Threshold Compass"]')).toHaveLength(0);
  });

});
