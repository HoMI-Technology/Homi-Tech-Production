// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
}));

import { AppSidebar } from "@/components/layout/AppSidebar";
import { LATEST_VERDICT_KEY } from "@/components/layout/SidebarDecisionState";
import { HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

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

    expect(document.querySelector("[data-sidebar-shell-compass]")).not.toBeNull();
    expect(document.querySelector(".sidebar-pulse-strip")).toBeNull();
    expect(document.querySelector(".sidebar-footer-chip")).toBeNull();
    expect(document.querySelector(".sidebar-state-badge")).toBeNull();
    expect(document.querySelector(".sidebar-score-hero")).toBeNull();
  });

  it("source locks: Compass + catalog primary, no Home journey copy, repo compass only", () => {
    const sidebar = read("components/layout/AppSidebar.tsx");
    const pulse = read("components/layout/SidebarDecisionState.tsx");
    const bottom = read("components/layout/ProductBottomNav.tsx");

    expect(sidebar).toContain('"/dashboard": Compass');
    expect(sidebar).not.toMatch(/Home,/);
    expect(sidebar).not.toContain('"/dashboard": Home');
    expect(sidebar).not.toContain("Build entry (Home)");
    expect(sidebar).not.toContain("JOURNEY_ORDER");
    expect(sidebar).not.toContain("SidebarPulseStrip");
    expect(sidebar).not.toContain("SidebarScoreChip");
    expect(sidebar).not.toContain("footerChipModel");
    expect(sidebar).toContain('from "@/components/brand/ThresholdCompass"');
    expect(sidebar).not.toContain("@/components/finance/ThresholdCompass");
    expect(sidebar).toContain("data-sidebar-primary");
    expect(sidebar).toContain("data-sidebar-more");

    expect(pulse).not.toContain("Pulse·7d");
    expect(pulse).not.toContain("Held ${");
    expect(pulse).not.toContain("sidebar-pulse-strip");
    expect(pulse).not.toContain("function SidebarPulseStrip");
    expect(pulse).not.toContain("function SidebarDecisionState");
    expect(pulse).not.toContain("footerChipModel");

    expect(bottom).toContain('label: "HōMI"');
    expect(bottom).toContain('label: "Assess"');
    expect(bottom).not.toMatch(/label: "Home"/);
    expect(bottom).not.toMatch(/label: "Money"/);
  });
});
