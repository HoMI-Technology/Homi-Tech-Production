// @vitest-environment jsdom
/**
 * SHELL_CRAFT v3 — quiet top bar: compass 28 + wordmark + Assess + ···.
 * No left rail, Jump slab, or score chip. AppSidebar re-exports AppHeader.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("@/components/layout/CommandPalette", () => ({
  CommandPalette: () => null,
}));

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LATEST_VERDICT_KEY } from "@/components/layout/SidebarDecisionState";
import { HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";
import { COLORS } from "@/lib/brand";
import { LEFT_RAIL_PRIMARY, LEFT_RAIL_SECONDARY } from "@/lib/layout/left-rail";

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }
});

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

describe("AppSidebar — PR12 left rail", () => {
  it("unlocks PRIMARY Product map including Learn / Bills / Insights invent chrome", () => {
    render(<AppSidebar email="jamie@example.com" fullName="Jamie Diaz" />);

    const rail = document.querySelector("[data-left-rail]");
    expect(rail).not.toBeNull();
    expect(rail).toHaveAttribute("data-invent-chrome", "pr12");
    expect(document.querySelector("[data-rail-scroll]")).not.toBeNull();
    expect(document.querySelector("[data-app-shell='pr10-rail']")).not.toBeNull();
    expect(document.querySelector("[data-shell-compass] svg[aria-label*='Threshold Compass']")).not.toBeNull();
    const railCompass = document.querySelector("[data-shell-compass] svg[aria-label*='Threshold Compass']");
    expect(railCompass?.getAttribute("width")).toBe("40");
    expect(railCompass?.getAttribute("class") ?? "").not.toMatch(/compass-glow/);
    const wordmarkLetters = document.querySelector("[data-shell-logo] [data-wordmark]");
    expect(wordmarkLetters?.querySelector('[data-letter="H"]')).toHaveStyle({ color: COLORS.cyan });
    expect(wordmarkLetters?.querySelector('[data-letter="o"]')).toHaveStyle({ color: COLORS.emerald });
    expect(wordmarkLetters?.querySelector('[data-letter="M"]')).toHaveStyle({ color: COLORS.yellow });
    expect(wordmarkLetters?.querySelector('[data-letter="I"]')).toHaveStyle({ color: COLORS.cyan });
    expect(document.querySelector("[data-homi-hexes]")).toBeNull();
    expect(document.querySelectorAll("[data-shell-compass]")).toHaveLength(1);
    expect(document.querySelectorAll('[aria-label*="Threshold Compass"]')).toHaveLength(1);
    expect(document.querySelector("[data-shell-logo]")?.querySelector("[data-shell-compass]")).not.toBeNull();
    expect(document.querySelector("[data-rail-tagline]")).toHaveClass("text-dim/70");

    for (const item of LEFT_RAIL_PRIMARY) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
    for (const item of LEFT_RAIL_SECONDARY) {
      expect(screen.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }

    expect(screen.getByRole("link", { name: /^learn$/i })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: /^bills$/i })).toHaveAttribute("href", "/money/bills");
    expect(screen.getByRole("link", { name: /^insights$/i })).toHaveAttribute("href", "/timeline");
    expect(screen.getByRole("link", { name: /^finances$/i })).toHaveAttribute("href", "/money");
    expect(screen.getByRole("link", { name: /^plans$/i })).toHaveAttribute("href", "/path");
    expect(screen.queryByRole("link", { name: /^money$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^assess$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /homie/i })).toBeNull();
    expect(document.body.textContent).not.toContain("CRAFT · PR10");
    expect(document.body.textContent).not.toContain("NOT SHIP");
    expect(document.querySelector("[data-rail-person-name]")).toHaveTextContent("Jamie D.");
  });

  it("paints Home as the active rail item on /dashboard", () => {
    mockPathname = "/dashboard";
    render(<AppSidebar email={null} />);
    const home = document.querySelector("[data-rail-item='home']");
    expect(home).toHaveAttribute("aria-current", "page");
    expect(home).toHaveClass("is-active");
  });
});

describe("AppHeader — SHELL_CRAFT v3 quiet top bar", () => {
  it("mounts compass 28 + wordmark + Assess, and keeps Path/Money behind ···", () => {
    render(<AppHeader email={null} />);

    const shell = document.querySelector("[data-app-shell='v3']");
    expect(shell).not.toBeNull();

    const compass = document.querySelector("[data-shell-compass] svg[aria-label*='Threshold Compass']");
    expect(compass).not.toBeNull();
    expect(compass?.getAttribute("width")).toBe("28");
    expect(compass?.getAttribute("height")).toBe("28");
    expect(compass?.getAttribute("class") ?? "").not.toMatch(/compass-glow/);
    expect(compass?.innerHTML ?? "").not.toContain("url(#hc-glow)");
    expect(compass?.querySelector("#hc-glow")).toBeNull();
    expect(compass?.getAttribute("viewBox")).toBe("0 0 200 200");
    expect(compass?.querySelector('circle[r="85"]')).not.toBeNull();
    expect(compass?.querySelector('circle[r="60"]')).not.toBeNull();
    expect(compass?.querySelector('circle[r="35"]')).not.toBeNull();

    expect(screen.getByLabelText("HōMI dashboard")).toHaveAttribute("href", "/dashboard");
    const assess = document.querySelector("[data-shell-assess]");
    expect(assess).toHaveAttribute("href", "/assessment");
    expect(assess).toHaveTextContent("Assess");

    expect(screen.queryByRole("link", { name: /path to ready/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^money$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^home$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /jump to/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /open navigation/i })).toBeNull();
    expect(document.querySelector("aside")).toBeNull();
    expect(document.querySelector("[data-sidebar-primary]")).toBeNull();

    expect(HEADER_PRIMARY_NAV[0]).toEqual({ href: "/dashboard", label: "HōMI" });
    expect(HEADER_PRIMARY_NAV.map((i) => i.label)).toContain("Assess");
  });

  it("kills pulse chrome, DNP chip, Held, Jump slab, and the duplicate 61 on the bar", () => {
    render(<AppHeader email={null} />);

    const shell = document.querySelector("[data-app-shell='v3']");
    expect(shell).not.toBeNull();
    const text = shell?.textContent ?? "";

    expect(text).not.toMatch(/Pulse·7d/);
    expect(text).not.toMatch(/Held\s+\d+d/);
    expect(text).not.toContain("DO NOT PROCEED");
    expect(text).not.toMatch(/(^|[^0-9])61([^0-9]|$)/);
    expect(text).not.toContain("Jump to");
    expect(screen.queryByText("Pulse·7d")).not.toBeInTheDocument();
    expect(screen.queryByText(/Held 8d/)).not.toBeInTheDocument();
    expect(screen.queryByText("DO NOT PROCEED")).not.toBeInTheDocument();
    expect(screen.queryByText("61")).not.toBeInTheDocument();

    expect(document.querySelector("[data-sidebar-shell-compass]")).toBeNull();
    expect(document.querySelector(".sidebar-pulse-strip")).toBeNull();
    expect(document.querySelector(".sidebar-footer-chip")).toBeNull();
    expect(document.querySelector(".sidebar-state-badge")).toBeNull();
    expect(document.querySelector(".sidebar-score-hero")).toBeNull();
    expect(document.querySelectorAll('[aria-label*="Threshold Compass"]')).toHaveLength(1);
  });

  it("HōMI logo uses brand ThresholdCompass — never Lucide, never a second mark", () => {
    render(<AppHeader email={null} />);

    const logo = document.querySelector("[data-shell-logo]");
    expect(logo).not.toBeNull();
    expect(logo?.querySelector(".lucide-compass")).toBeNull();
    expect(logo?.querySelector(".lucide-layout-grid")).toBeNull();
    expect(document.querySelectorAll(".lucide-compass")).toHaveLength(0);
    expect(document.querySelectorAll("[data-shell-compass]")).toHaveLength(1);
    expect(document.querySelectorAll('[aria-label*="Threshold Compass"]')).toHaveLength(1);
  });

  it("opens live depth behind ··· including Journal, and hides role when only Personal", () => {
    render(<AppHeader email="ada@example.com" />);

    expect(screen.queryByRole("navigation", { name: "Dashboard switcher" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    const menu = screen.getByRole("menu", { name: "More" });
    expect(within(menu).getByRole("menuitem", { name: "Journal" })).toHaveAttribute(
      "href",
      "/journal",
    );
    expect(within(menu).getByRole("menuitem", { name: "Path" })).toHaveAttribute("href", "/path");
    expect(document.querySelector('[data-more-tone="live"][href="/path"]')).not.toBeNull();
    expect(document.querySelector('[data-more-tone="quiet"][href="/journal"]')).not.toBeNull();
    expect(document.querySelector('[data-more-tone="quiet"][href="/timeline"]')).not.toBeNull();
    expect(within(menu).getByRole("menuitem", { name: "Money" })).toHaveAttribute("href", "/money");
    expect(within(menu).getByRole("menuitem", { name: "Trust & privacy" })).toHaveAttribute(
      "href",
      "/trust",
    );
    expect(within(menu).queryByRole("menuitem", { name: "Companion" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "Trinity" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "Stand" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "Decide" })).toBeNull();
    expect(document.querySelector("[data-more-group='build']")).not.toBeNull();
    expect(document.querySelector("[data-more-group='care']")).not.toBeNull();
    expect(document.querySelector("[data-more-group='account']")).not.toBeNull();
    expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("role-tree AppHeader stays the quiet bar — no left rail, no craft badge", () => {
    render(<AppHeader email={null} />);
    expect(document.querySelector("[data-app-shell='v3']")).not.toBeNull();
    expect(document.querySelector("[data-left-rail]")).toBeNull();
    expect(document.body.textContent).not.toContain("CRAFT · PR10");
  });

  it("does not ship the mock-only craft badge on /assessment", () => {
    mockPathname = "/assessment";
    render(<AppHeader email={null} />);

    const assess = document.querySelector("[data-shell-assess]");
    expect(assess).toHaveAttribute("aria-current", "page");
    expect(document.querySelector("[data-shell-floor]")).toBeNull();
    expect(document.body.textContent).not.toContain("Craft v3");
    expect(document.body.textContent).not.toContain("PR2 floor");
    expect(document.body.textContent).not.toContain("Craft v3 · PR2 floor · not ship");
  });

  it("hides Assess on employee/partner/admin/team trees, keeps it on personal Home", () => {
    mockPathname = "/dashboard";
    const { unmount: unmountHome } = render(<AppHeader email={null} />);
    expect(document.querySelector("[data-shell-assess]")).not.toBeNull();
    unmountHome();

    for (const path of [
      "/employee/dashboard",
      "/employee",
      "/partner/dashboard",
      "/admin",
      "/admin/marketing",
      "/team",
    ]) {
      mockPathname = path;
      const { unmount } = render(<AppHeader email={null} />);
      expect(document.querySelector("[data-shell-assess]")).toBeNull();
      expect(screen.queryByRole("link", { name: /^assess$/i })).toBeNull();
      unmount();
    }
  });
});
